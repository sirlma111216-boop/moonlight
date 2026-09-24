/**
 * 한국천문연구원(공공데이터포털) 어댑터.
 *
 * ┌ 확인 기록 (README '어댑터 확인 기록'에도 남긴다) ─────────────────────────────
 * │ 월령 정보  LunPhInfoService/getLunPhInfo
 * │   - 문서상 입력: solYear, solMonth, solDay (하루 단위). 월 단위 일괄 조회 항목은 문서에서 확인되지 않아
 * │     Worker 가 해당 월의 날짜를 순회 호출하고 날짜 단위로 캐시한다(R6).
 * │   - 문서상 응답 항목: lunAge(월령), solYear, solMonth, solDay.
 * │   - 월령의 기준 시각(정오/자정 등)은 문서·실제 응답으로 확인하지 못했다 → 화면에 '기관 자료의 기준 시각은 문서 확인 필요'로 표시.
 * │ 출몰시각 정보  RiseSetInfoService/getAreaRiseSetInfo
 * │   - 문서상 입력: locdate(YYYYMMDD), location(지역명). 좌표 입력은 getLCRiseSetInfo(longitude, latitude, dnYn).
 * │   - 문서상 응답 항목: sunrise, sunset, moonrise, moonset, moontransit, civilm, civile, ... (HHMM 문자열)
 * │   - 사건이 없는 날의 빈 값 표현(빈 문자열/공백/'--')은 실제 응답으로 확인하지 못했다.
 * │     어댑터는 4자리 숫자가 아니면 '사건 없음(null)'으로, 태그 자체가 없으면 '결측(undefined)'으로 다루고 원문을 raw 에 남긴다.
 * │ 서비스키: 디코딩된 키를 URL 인코딩해 붙인다. 안 되면 KASI_KEY_IS_ENCODED=true 로 인코딩된 키를 그대로 붙인다.
 * └───────────────────────────────────────────────────────────────────────────────
 *
 * 실제 인증키가 없는 상태에서는 어느 것도 '연동 성공'으로 보고하지 않는다.
 */
import type { LunarAgeRow, RiseSetRow } from '@shared/publicdata';
import { parseOpenApiXml } from './xml';

export const KASI_LUNAR_URL = 'https://apis.data.go.kr/B090041/openapi/service/LunPhInfoService/getLunPhInfo';
export const KASI_RISESET_URL = 'https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo';
export const KASI_LUNAR_DOC = 'https://www.data.go.kr/data/15012689/openapi.do';
export const KASI_RISESET_DOC = 'https://www.data.go.kr/data/15012688/openapi.do';

export class KasiError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

function keyParam(key: string, isEncoded: boolean): string {
  return isEncoded ? key : encodeURIComponent(key);
}

async function fetchXml(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/xml, text/xml, */*' } });
    const text = await res.text();
    if (!res.ok) throw new KasiError(`HTTP ${res.status}`, 'http', res.status >= 500 || res.status === 429);
    return text;
  } catch (e) {
    if (e instanceof KasiError) throw e;
    throw new KasiError(e instanceof Error ? e.message : '네트워크 오류', 'network', true);
  } finally {
    clearTimeout(t);
  }
}

function checkResult(parsed: ReturnType<typeof parseOpenApiXml>) {
  if (parsed.errorCode) {
    const code = parsed.errorCode;
    // 공공데이터포털 공통 오류 코드: 22 요청 제한 초과, 30 등록되지 않은 키, 31 기한 만료, 20 서비스 접근 거부
    const retryable = code === '22' || code === '04' || code === '05';
    throw new KasiError(`공공데이터포털 오류 ${code}: ${parsed.errorMsg ?? ''}`, `portal-${code}`, retryable);
  }
  if (parsed.resultCode && parsed.resultCode !== '00') {
    throw new KasiError(`기관 응답 오류 ${parsed.resultCode}: ${parsed.resultMsg ?? ''}`, `result-${parsed.resultCode}`, false);
  }
}

function hhmm(raw: string | undefined): string | null | undefined {
  if (raw === undefined) return undefined; // 결측
  const s = raw.trim();
  if (!/^\d{4}$/.test(s)) return null; // 사건 없음(빈 값 등) — 실제 표현은 응답으로 확인 필요
  return `${s.slice(0, 2)}:${s.slice(2)}`;
}

export async function fetchLunarAge(key: string, isEncoded: boolean, dateISO: string): Promise<LunarAgeRow> {
  const [y, m, d] = dateISO.split('-');
  const url = `${KASI_LUNAR_URL}?serviceKey=${keyParam(key, isEncoded)}&solYear=${y}&solMonth=${m}&solDay=${d}`;
  const xml = await fetchXml(url);
  const parsed = parseOpenApiXml(xml);
  checkResult(parsed);
  const item = parsed.items[0];
  if (!item) throw new KasiError('응답에 item 이 없습니다.', 'empty', false);
  const ageStr = item.lunAge?.trim();
  const age = ageStr && !Number.isNaN(Number(ageStr)) ? Number(ageStr) : null;
  return {
    date: dateISO,
    lunarAge: age,
    basis: '한국천문연구원 월령 정보(기준 시각은 문서 확인 필요)',
    source: 'kasi',
    raw: item,
  };
}

export async function fetchRiseSet(key: string, isEncoded: boolean, locationName: string, dateISO: string): Promise<RiseSetRow> {
  const locdate = dateISO.replace(/-/g, '');
  const url = `${KASI_RISESET_URL}?serviceKey=${keyParam(key, isEncoded)}&locdate=${locdate}&location=${encodeURIComponent(locationName)}`;
  const xml = await fetchXml(url);
  const parsed = parseOpenApiXml(xml);
  checkResult(parsed);
  const item = parsed.items[0];
  if (!item) throw new KasiError('응답에 item 이 없습니다.', 'empty', false);
  return {
    date: dateISO,
    location: locationName,
    sunrise: hhmm(item.sunrise),
    sunset: hhmm(item.sunset),
    moonrise: hhmm(item.moonrise),
    moonset: hhmm(item.moonset),
    moontransit: hhmm(item.moontransit),
    source: 'kasi',
    raw: item,
  };
}

/** 재시도 상한 1회(재시도 가능한 오류만) */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof KasiError && e.retryable) {
      await new Promise((r) => setTimeout(r, 400));
      return fn();
    }
    throw e;
  }
}
