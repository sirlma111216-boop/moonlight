/**
 * 월출·월몰 사건으로 특정 시각에 달이 지평선 위에 있는지 판정한다.
 * 자정 넘김, 전날·다음 날 사건, '사건 없음'을 처리한다(원문 6절 04, 8절).
 *
 * 시간은 KST(Asia/Seoul, UTC+9, 서머타임 없음) 고정 오프셋으로 다룬다.
 * 날짜만 있는 값을 UTC 자정으로 처리하지 않는다.
 */

export const KST_OFFSET_MIN = 9 * 60;

/** 'YYYY-MM-DD' + 'HH:MM' (KST) → epoch ms */
export function kstToEpoch(dateISO: string, hhmm: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh - 9, mm);
}

/** epoch ms → KST 'YYYY-MM-DD' */
export function epochToKstDate(ms: number): string {
  const d = new Date(ms + KST_OFFSET_MIN * 60_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** epoch ms → KST 'HH:MM' */
export function epochToKstTime(ms: number): string {
  const d = new Date(ms + KST_OFFSET_MIN * 60_000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return epochToKstDate(Date.UTC(y, m - 1, d, 0, 0) + days * 86_400_000 - KST_OFFSET_MIN * 60_000 + KST_OFFSET_MIN * 60_000);
}

export interface RiseSetDay {
  /** KST 날짜 */
  date: string;
  /** 'HH:MM' 또는 null(그 날 사건 없음). undefined 는 자료 누락(결측). */
  moonrise: string | null | undefined;
  moonset: string | null | undefined;
}

export interface HorizonEvent {
  kind: 'rise' | 'set';
  epoch: number;
  date: string;
  time: string;
}

/** 여러 날짜의 자료를 시간순 사건 목록으로 편다. 결측(undefined)은 건너뛴다. */
export function flattenEvents(days: RiseSetDay[]): HorizonEvent[] {
  const events: HorizonEvent[] = [];
  for (const d of days) {
    if (typeof d.moonrise === 'string') {
      events.push({ kind: 'rise', epoch: kstToEpoch(d.date, d.moonrise), date: d.date, time: d.moonrise });
    }
    if (typeof d.moonset === 'string') {
      events.push({ kind: 'set', epoch: kstToEpoch(d.date, d.moonset), date: d.date, time: d.moonset });
    }
  }
  return events.sort((a, b) => a.epoch - b.epoch);
}

export type HorizonState = 'above' | 'below' | 'unknown';

export interface HorizonJudgement {
  state: HorizonState;
  /** 판정 근거가 된 사건 */
  basis: HorizonEvent | null;
  reason: string;
}

/**
 * 특정 시각에 달이 지평선 위에 있는가.
 * 규칙: 시각 이전의 가장 늦은 사건이 '월출'이면 위, '월몰'이면 아래.
 * 이전 사건이 없으면 이후의 첫 사건으로 추정(다음이 월몰이면 지금은 위).
 * 인접 날짜 자료가 함께 있어야 자정 넘김이 올바르게 처리된다.
 */
export function judgeAboveHorizon(days: RiseSetDay[], atEpoch: number): HorizonJudgement {
  const events = flattenEvents(days);
  if (events.length === 0) return { state: 'unknown', basis: null, reason: '출몰 사건 자료가 없어 판정할 수 없어요.' };
  let prev: HorizonEvent | null = null;
  let next: HorizonEvent | null = null;
  for (const e of events) {
    if (e.epoch <= atEpoch) prev = e;
    else {
      next = e;
      break;
    }
  }
  if (prev) {
    // 이전 사건과 판정 시각 사이가 하루 이상 벌어지면 자료 공백으로 본다
    if (atEpoch - prev.epoch > 30 * 3_600_000) {
      return { state: 'unknown', basis: prev, reason: '판정 시각 앞의 자료 공백이 커서 판정하지 않아요.' };
    }
    return prev.kind === 'rise'
      ? { state: 'above', basis: prev, reason: `${prev.date} ${prev.time}에 뜬 뒤 아직 지지 않았어요.` }
      : { state: 'below', basis: prev, reason: `${prev.date} ${prev.time}에 진 뒤 아직 뜨지 않았어요.` };
  }
  if (next) {
    if (next.epoch - atEpoch > 30 * 3_600_000) {
      return { state: 'unknown', basis: next, reason: '판정 시각 뒤의 자료 공백이 커서 판정하지 않아요.' };
    }
    return next.kind === 'set'
      ? { state: 'above', basis: next, reason: `${next.date} ${next.time}에 질 예정이라 지금은 떠 있어요.` }
      : { state: 'below', basis: next, reason: `${next.date} ${next.time}에 뜰 예정이라 지금은 지평선 아래예요.` };
  }
  return { state: 'unknown', basis: null, reason: '판정할 사건이 없어요.' };
}

/**
 * 한 날짜의 월몰이 '전날 뜬 달'이 지는 것인지 표시(R6).
 * 월몰 시각이 월출 시각보다 이르면(또는 월출이 없으면) 전날 밤부터 이어진 달이다.
 */
export function moonsetContinuesFromPreviousNight(day: RiseSetDay): boolean | null {
  if (typeof day.moonset !== 'string') return null;
  if (typeof day.moonrise !== 'string') return true;
  return kstToEpoch(day.date, day.moonset) < kstToEpoch(day.date, day.moonrise);
}

/**
 * 한 날짜의 월출 뒤 월몰이 다음 날로 넘어가는지(월출이 월몰보다 늦으면 다음 날 짐).
 */
export function moonriseSetsNextDay(day: RiseSetDay): boolean | null {
  if (typeof day.moonrise !== 'string') return null;
  if (typeof day.moonset !== 'string') return true;
  return kstToEpoch(day.date, day.moonrise) > kstToEpoch(day.date, day.moonset);
}

/**
 * 관측 창(예: 19:00~21:00) 동안 달이 한 번이라도 지평선 위에 있는가.
 * 창의 시작·끝과 창 안의 사건을 모두 확인한다.
 */
export function moonVisibleWindow(
  days: RiseSetDay[],
  dateISO: string,
  startHHMM: string,
  endHHMM: string,
): { anyAbove: boolean; startState: HorizonState; endState: HorizonState; detail: string } {
  const start = kstToEpoch(dateISO, startHHMM);
  const end = kstToEpoch(dateISO, endHHMM);
  const s = judgeAboveHorizon(days, start);
  const e = judgeAboveHorizon(days, end);
  const events = flattenEvents(days).filter((ev) => ev.epoch > start && ev.epoch < end);
  const riseInside = events.some((ev) => ev.kind === 'rise');
  const anyAbove = s.state === 'above' || e.state === 'above' || riseInside;
  let detail: string;
  if (s.state === 'unknown' && e.state === 'unknown') detail = '자료가 부족해 판정하지 않아요.';
  else if (s.state === 'above' && e.state === 'above') detail = '창 전체 동안 지평선 위에 있어요.';
  else if (s.state === 'above') detail = '창이 시작될 때는 떠 있지만 도중에 져요.';
  else if (e.state === 'above' || riseInside) detail = '창 도중에 떠요.';
  else detail = '이 시간에는 지평선 아래에 있어요.';
  return { anyAbove, startState: s.state, endState: e.state, detail };
}
