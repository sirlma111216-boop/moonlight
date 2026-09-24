/**
 * 공공데이터 정규화 자료형 — 기관 원자료와 앱 계산값을 같은 모양으로 담되
 * `source` 로 반드시 구분한다(원문 8절, 13절).
 */

export type DataSource = 'kasi' | 'app-astronomy';

export interface LunarAgeRow {
  date: string; // YYYY-MM-DD (KST)
  /** 월령(일). 결측이면 null */
  lunarAge: number | null;
  /** 자료 기준 시각 설명 */
  basis: string;
  source: DataSource;
  raw?: unknown;
}

export interface RiseSetRow {
  date: string;
  location: string;
  sunrise: string | null | undefined;
  sunset: string | null | undefined;
  /** 'HH:MM' / null(사건 없음) / undefined(결측) */
  moonrise: string | null | undefined;
  moonset: string | null | undefined;
  moontransit?: string | null | undefined;
  source: DataSource;
  raw?: unknown;
}

export interface MonthDataResponse {
  region: string;
  year: number;
  month: number;
  lunarAges: LunarAgeRow[];
  riseSets: RiseSetRow[];
  /** 실제 사용한 자료 출처. 두 어댑터 모두 기관 자료일 때만 'kasi' */
  source: DataSource;
  sourceLabel: string;
  sourceUrl: string;
  /** 기관 키가 없어 앱 계산으로 대체했는가 */
  fallback: boolean;
  fallbackReason: string | null;
  fetchedAt: string;
  /** 캐시에서 온 날짜 수 / 새로 호출한 날짜 수 */
  cacheHits: number;
  cacheMisses: number;
  timezoneNote: string;
  /** 어댑터에서 확인한 사실/미확인 사항 */
  adapterNotes: string[];
}

export interface ApiStatus {
  kasiKeyConfigured: boolean;
  lastLunarCheck: { ok: boolean; at: string; message: string; sample?: unknown } | null;
  lastRiseSetCheck: { ok: boolean; at: string; message: string; sample?: unknown } | null;
  cacheRows: number;
}
