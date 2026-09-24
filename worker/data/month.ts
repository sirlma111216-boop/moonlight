/**
 * 지역·월 단위 자료 조립 — 날짜 단위 캐시(D1)와 요청 합치기(isolate 내 in-flight 맵),
 * 기관 실패 시 앱 계산으로 대체. 같은 날짜의 API 호출은 캐시로 1회만 발생한다(R11).
 */
import type { LunarAgeRow, MonthDataResponse, RiseSetRow } from '@shared/publicdata';
import { addDaysISO } from '@shared/horizon';
import { findRegion } from '@shared/regions';
import type { AppEnv } from '../env';
import { appLunarAge, appRiseSet } from './astro';
import { KASI_LUNAR_DOC, KASI_RISESET_DOC, KasiError, fetchLunarAge, fetchRiseSet, withRetry } from './kasi';

const CACHE_DAYS = 120;
const inflight = new Map<string, Promise<unknown>>();

async function cacheGet<T>(db: D1Database, key: string): Promise<T | null> {
  const row = await db.prepare('SELECT value_json, expires_at FROM api_cache WHERE cache_key = ?').bind(key).first<{ value_json: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return null;
  }
}

async function cachePut(db: D1Database, key: string, provider: string, value: unknown) {
  const now = new Date();
  const exp = new Date(now.getTime() + CACHE_DAYS * 86_400_000);
  await db
    .prepare('INSERT INTO api_cache (cache_key, provider, value_json, fetched_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET value_json = excluded.value_json, fetched_at = excluded.fetched_at, expires_at = excluded.expires_at')
    .bind(key, provider, JSON.stringify(value), now.toISOString(), exp.toISOString())
    .run();
}

function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export async function buildMonthData(env: AppEnv, regionName: string, year: number, month: number): Promise<MonthDataResponse> {
  const region = findRegion(regionName) ?? findRegion(env.DEFAULT_REGION) ?? findRegion('서울')!;
  const key = env.KASI_SERVICE_KEY?.trim();
  const isEncoded = env.KASI_KEY_IS_ENCODED === 'true';
  const n = daysInMonth(year, month);
  const dates: string[] = [];
  for (let d = 1; d <= n; d++) dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  // 출몰 자정 넘김 판정을 위해 전날·다음 날을 함께 가져온다
  const riseSetDates = [addDaysISO(dates[0], -1), ...dates, addDaysISO(dates[n - 1], 1)];

  let hits = 0;
  let misses = 0;
  const notes: string[] = [];
  let fallback = false;
  let fallbackReason: string | null = null;

  async function lunar(date: string): Promise<LunarAgeRow> {
    const ck = `kasi-lunar:${date}`;
    const cached = await cacheGet<LunarAgeRow>(env.DB, ck);
    if (cached) {
      hits++;
      return cached;
    }
    misses++;
    if (!key) throw new KasiError('서비스키 없음', 'no-key', false);
    const row = await dedupe(ck, () => withRetry(() => fetchLunarAge(key, isEncoded, date)));
    await cachePut(env.DB, ck, 'kasi-lunar', row);
    return row;
  }
  async function riseset(date: string): Promise<RiseSetRow> {
    const ck = `kasi-riseset:${region.kasiName}:${date}`;
    const cached = await cacheGet<RiseSetRow>(env.DB, ck);
    if (cached) {
      hits++;
      return cached;
    }
    misses++;
    if (!key) throw new KasiError('서비스키 없음', 'no-key', false);
    const row = await dedupe(ck, () => withRetry(() => fetchRiseSet(key, isEncoded, region.kasiName, date)));
    await cachePut(env.DB, ck, 'kasi-riseset', row);
    return row;
  }

  let lunarAges: LunarAgeRow[];
  let riseSets: RiseSetRow[];
  try {
    if (!key) throw new KasiError('KASI_SERVICE_KEY 가 설정되지 않았습니다.', 'no-key', false);
    lunarAges = await mapLimit(dates, 4, lunar);
    riseSets = await mapLimit(riseSetDates, 4, riseset);
    notes.push('기관 자료(한국천문연구원) 사용. 월령은 하루 단위로 순회 호출하고 날짜별로 캐시함.');
  } catch (e) {
    fallback = true;
    fallbackReason = e instanceof KasiError ? `${e.code}: ${e.message}` : String(e);
    lunarAges = dates.map(appLunarAge);
    riseSets = riseSetDates.map((d) => appRiseSet(region, d));
    notes.push('기관 자료를 쓰지 못해 앱 계산(Astronomy Engine)으로 대체함. 실제 관측 검증에는 쓰지 않는다.');
  }
  notes.push('출몰 자정 넘김 판정을 위해 전달 마지막 날과 다음 달 첫날 자료를 함께 포함함.');

  return {
    region: region.label,
    year,
    month,
    lunarAges,
    riseSets,
    source: fallback ? 'app-astronomy' : 'kasi',
    sourceLabel: fallback ? '앱 계산(Astronomy Engine) — 기관 자료 아님' : '한국천문연구원 (공공데이터포털)',
    sourceUrl: fallback ? 'https://github.com/cosinekitty/astronomy' : `${KASI_LUNAR_DOC} , ${KASI_RISESET_DOC}`,
    fallback,
    fallbackReason,
    fetchedAt: new Date().toISOString(),
    cacheHits: hits,
    cacheMisses: misses,
    timezoneNote: '시각은 한국 표준시(KST, UTC+9)이며 날짜만 있는 값은 KST 날짜로 다룬다. 기관 자료의 시간대 표기는 문서 확인 대상.',
    adapterNotes: notes,
  };
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
  for (const r of results) {
    await env.DB.prepare('INSERT INTO api_checks (provider, ok, checked_at, message, sample_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(provider) DO UPDATE SET ok = excluded.ok, checked_at = excluded.checked_at, message = excluded.message, sample_json = excluded.sample_json')
      .bind(r.provider, r.ok ? 1 : 0, now, r.message, JSON.stringify(r.sample ?? null))
      .run();
  }
  return results;
}
