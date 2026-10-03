/**
 * 지역·월 단위 자료 조립.
 *
 * 캐시는 세 겹이다.
 *  1) isolate 메모리(10분) — 같은 반 학생들이 연달아 요청할 때 DB 조회 없이 응답
 *  2) D1 의 '월 단위' 한 줄 — 조립이 끝난 한 달 자료 (조회 1회)
 *  3) D1 의 '날짜 단위' 줄 — 기관 API 를 날짜별로 부른 결과. 같은 날짜의 API 호출은 1회만 발생한다(R11)
 * 기관 자료를 못 쓰면 앱 계산(Astronomy Engine)으로 대체하고, 그 결과도 월 단위로 캐시해
 * 요청마다 다시 계산하지 않는다(Worker CPU 시간 절약).
 */
import type { LunarAgeRow, MonthDataResponse, RiseSetRow } from '@shared/publicdata';
import { addDaysISO } from '@shared/horizon';
import { findRegion } from '@shared/regions';
import type { AppEnv } from '../env';
import { appLunarAge, appRiseSet } from './astro';
import { KASI_LUNAR_DOC, KASI_RISESET_DOC, KasiError, fetchLunarAge, fetchRiseSet, withRetry } from './kasi';

const CACHE_DAYS = 120;
const MEMORY_TTL_MS = 10 * 60_000;
/** 앱 계산 방식이 바뀌면 이 숫자를 올려 예전 캐시를 쓰지 않게 한다 */
const APP_CALC_VERSION = 1;

interface MonthPayload {
  lunarAges: LunarAgeRow[];
  riseSets: RiseSetRow[];
  fetchedAt: string;
}

const memory = new Map<string, { at: number; value: MonthPayload }>();
const inflight = new Map<string, Promise<unknown>>();

function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** 여러 키를 한 번에 읽는다(D1 바인딩 한도 100개를 넘지 않게 나눠서) */
async function cacheGetMany(db: D1Database, keys: string[]): Promise<Map<string, unknown>> {
  const out = new Map<string, unknown>();
  const now = new Date().toISOString();
  for (let i = 0; i < keys.length; i += 90) {
    const chunk = keys.slice(i, i + 90);
    const rs = await db
      .prepare(`SELECT cache_key, value_json FROM api_cache WHERE cache_key IN (${chunk.map(() => '?').join(',')}) AND expires_at > ?`)
      .bind(...chunk, now)
      .all<{ cache_key: string; value_json: string }>();
    for (const r of rs.results) {
      try {
        out.set(r.cache_key, JSON.parse(r.value_json));
      } catch {
        /* 깨진 캐시는 무시하고 다시 가져온다 */
      }
    }
  }
  return out;
}

async function cachePutMany(db: D1Database, rows: { key: string; provider: string; value: unknown }[]) {
  if (rows.length === 0) return;
  const now = new Date();
  const exp = new Date(now.getTime() + CACHE_DAYS * 86_400_000).toISOString();
  const sql = 'INSERT INTO api_cache (cache_key, provider, value_json, fetched_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET value_json = excluded.value_json, fetched_at = excluded.fetched_at, expires_at = excluded.expires_at';
  for (let i = 0; i < rows.length; i += 50) {
    await db.batch(rows.slice(i, i + 50).map((r) => db.prepare(sql).bind(r.key, r.provider, JSON.stringify(r.value), now.toISOString(), exp)));
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  let failed = false;
  // 하나라도 실패하면 남은 요청을 더 보내지 않는다(기관 API 호출 낭비 방지)
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length && !failed) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx]);
      } catch (e) {
        failed = true;
        throw e;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

async function monthFromCache(db: D1Database, key: string): Promise<MonthPayload | null> {
  const m = memory.get(key);
  if (m && Date.now() - m.at < MEMORY_TTL_MS) return m.value;
  const hit = (await cacheGetMany(db, [key])).get(key) as MonthPayload | undefined;
  if (!hit) return null;
  memory.set(key, { at: Date.now(), value: hit });
  return hit;
}

async function monthToCache(db: D1Database, key: string, provider: string, value: MonthPayload) {
  memory.set(key, { at: Date.now(), value });
  await cachePutMany(db, [{ key, provider, value }]);
}

export async function buildMonthData(env: AppEnv, regionName: string, year: number, month: number): Promise<MonthDataResponse> {
  const region = findRegion(regionName) ?? findRegion(env.DEFAULT_REGION) ?? findRegion('서울')!;
  const key = env.KASI_SERVICE_KEY?.trim();
  const isEncoded = env.KASI_KEY_IS_ENCODED === 'true';
  const n = daysInMonth(year, month);
  const ym = `${year}-${String(month).padStart(2, '0')}`;
  const dates: string[] = [];
  for (let d = 1; d <= n; d++) dates.push(`${ym}-${String(d).padStart(2, '0')}`);
  // 달이 자정을 넘겨 뜨고 지는 경우를 가리려면 전날·다음 날 자료가 함께 필요하다
  const riseSetDates = [addDaysISO(dates[0], -1), ...dates, addDaysISO(dates[n - 1], 1)];
  const total = dates.length + riseSetDates.length;
  const kasiMonthKey = `month:kasi:${region.kasiName}:${ym}`;
  const appMonthKey = `month:app${APP_CALC_VERSION}:${region.id}:${ym}`;

  function respond(p: MonthPayload, fallback: boolean, fallbackReason: string | null, hits: number, misses: number): MonthDataResponse {
    return {
      region: region.label,
      year,
      month,
      lunarAges: p.lunarAges,
      riseSets: p.riseSets,
      source: fallback ? 'app-astronomy' : 'kasi',
      sourceLabel: fallback ? '컴퓨터 계산 (천문연구원 자료 아님)' : '천문연구원 자료',
      sourceUrl: fallback ? 'https://github.com/cosinekitty/astronomy' : `${KASI_LUNAR_DOC} , ${KASI_RISESET_DOC}`,
      fallback,
      fallbackReason,
      fetchedAt: p.fetchedAt,
      cacheHits: hits,
      cacheMisses: misses,
      timezoneNote: '시각은 모두 우리나라 시각이에요.',
      adapterNotes: [
        fallback ? '기관 자료를 쓰지 못해 앱 계산(Astronomy Engine)으로 대체함. 실제 관측 검증에는 쓰지 않는다.' : '기관 자료(한국천문연구원) 사용. 월령은 하루 단위로 순회 호출하고 날짜별로 캐시함.',
        '출몰 자정 넘김 판정을 위해 전달 마지막 날과 다음 달 첫날 자료를 함께 포함함.',
      ],
    };
  }

  let fallbackReason: string;
  if (key) {
    const cached = await monthFromCache(env.DB, kasiMonthKey);
    if (cached) return respond(cached, false, null, total, 0);
    try {
      const built = await dedupe(kasiMonthKey, async () => {
        const lunarKeys = dates.map((d) => `kasi-lunar:${d}`);
        const riseKeys = riseSetDates.map((d) => `kasi-riseset:${region.kasiName}:${d}`);
        const have = await cacheGetMany(env.DB, [...lunarKeys, ...riseKeys]);
        const fresh: { key: string; provider: string; value: unknown }[] = [];
        try {
          const lunarAges = await mapLimit(dates, 4, async (d) => {
            const ck = `kasi-lunar:${d}`;
            const hit = have.get(ck) as LunarAgeRow | undefined;
            if (hit) return hit;
            const row = await withRetry(() => fetchLunarAge(key, isEncoded, d));
            fresh.push({ key: ck, provider: 'kasi-lunar', value: row });
            return row;
          });
          const riseSets = await mapLimit(riseSetDates, 4, async (d) => {
            const ck = `kasi-riseset:${region.kasiName}:${d}`;
            const hit = have.get(ck) as RiseSetRow | undefined;
            if (hit) return hit;
            const row = await withRetry(() => fetchRiseSet(key, isEncoded, region.kasiName, d));
            fresh.push({ key: ck, provider: 'kasi-riseset', value: row });
            return row;
          });
          const payload: MonthPayload = { lunarAges, riseSets, fetchedAt: new Date().toISOString() };
          await monthToCache(env.DB, kasiMonthKey, 'kasi-month', payload);
          return { payload, misses: fresh.length };
        } finally {
          // 도중에 실패해도 이미 받은 날짜는 저장해 다음 요청에서 다시 부르지 않는다
          await cachePutMany(env.DB, fresh);
        }
      });
      return respond(built.payload, false, null, total - built.misses, built.misses);
    } catch (e) {
      fallbackReason = e instanceof KasiError ? `${e.code}: ${e.message}` : String(e);
    }
  } else {
    fallbackReason = 'no-key: KASI_SERVICE_KEY 가 설정되지 않았습니다.';
  }

  const cachedApp = await monthFromCache(env.DB, appMonthKey);
  if (cachedApp) return respond(cachedApp, true, fallbackReason, total, 0);
  const computed = await dedupe(appMonthKey, async () => {
    const payload: MonthPayload = { lunarAges: dates.map(appLunarAge), riseSets: riseSetDates.map((d) => appRiseSet(region, d)), fetchedAt: new Date().toISOString() };
    await monthToCache(env.DB, appMonthKey, 'app-month', payload);
    return payload;
  });
  return respond(computed, true, fallbackReason, 0, total);
}

/** 교사 화면 '연결 상태 점검' — 실제 키로 오늘 자료 1건씩 호출해 결과를 기록 */
export async function checkKasi(env: AppEnv) {
  const key = env.KASI_SERVICE_KEY?.trim();
  const isEncoded = env.KASI_KEY_IS_ENCODED === 'true';
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  const region = findRegion(env.DEFAULT_REGION) ?? findRegion('서울')!;
  const results: { provider: string; ok: boolean; message: string; sample?: unknown }[] = [];
  if (!key) {
    results.push({ provider: 'kasi-lunar', ok: false, message: 'KASI_SERVICE_KEY 미설정' });
    results.push({ provider: 'kasi-riseset', ok: false, message: 'KASI_SERVICE_KEY 미설정' });
  } else {
    try {
      const r = await fetchLunarAge(key, isEncoded, today);
      results.push({ provider: 'kasi-lunar', ok: true, message: `월령 ${r.lunarAge ?? '결측'} (${today})`, sample: r.raw });
    } catch (e) {
      results.push({ provider: 'kasi-lunar', ok: false, message: e instanceof Error ? e.message : String(e) });
    }
    try {
      const r = await fetchRiseSet(key, isEncoded, region.kasiName, today);
      results.push({ provider: 'kasi-riseset', ok: true, message: `월출 ${r.moonrise ?? '없음'} 월몰 ${r.moonset ?? '없음'} (${region.label} ${today})`, sample: r.raw });
    } catch (e) {
      results.push({ provider: 'kasi-riseset', ok: false, message: e instanceof Error ? e.message : String(e) });
    }
  }
  const now = new Date().toISOString();
  const sql = 'INSERT INTO api_checks (provider, ok, checked_at, message, sample_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(provider) DO UPDATE SET ok = excluded.ok, checked_at = excluded.checked_at, message = excluded.message, sample_json = excluded.sample_json';
  await env.DB.batch(results.map((r) => env.DB.prepare(sql).bind(r.provider, r.ok ? 1 : 0, now, r.message, JSON.stringify(r.sample ?? null))));
  return results;
}
