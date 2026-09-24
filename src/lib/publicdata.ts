import type { MonthDataResponse, RiseSetRow } from '@shared/publicdata';
import { judgeAboveHorizon, kstToEpoch, moonVisibleWindow, moonsetContinuesFromPreviousNight, moonriseSetsNextDay, type HorizonState } from '@shared/horizon';
import { thetaFromLunarAgeApprox } from '@shared/phaseMath';

export interface DayRow {
  date: string;
  day: number;
  weekday: string;
  lunarAge: number | null;
  /** 월령 근사 각도(학습 모형) */
  approxTheta: number | null;
  sunset: string | null | undefined;
  moonrise: string | null | undefined;
  moonset: string | null | undefined;
  /** 이 날의 월몰이 전날 밤부터 이어진 달인가 */
  setFromPrevNight: boolean | null;
  riseSetsNextDay: boolean | null;
  /** 관측 창 판정 */
  window: { anyAbove: boolean; detail: string };
  at21: HorizonState;
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];

export function fmtTime(v: string | null | undefined): string {
  if (v === undefined) return '결측';
  if (v === null) return '없음';
  return v;
}

/** 월 자료를 학생용 표 행으로 만든다. 출몰 판정은 전날·다음 날 자료를 함께 쓴다. */
export function buildRows(data: MonthDataResponse, window: { start: string; end: string }): DayRow[] {
  const byDate = new Map<string, RiseSetRow>();
  for (const r of data.riseSets) byDate.set(r.date, r);
  return data.lunarAges.map((la) => {
    const rs = byDate.get(la.date);
    const [y, m, d] = la.date.split('-').map(Number);
    const weekday = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    const neighbors = data.riseSets.filter((r) => Math.abs(kstToEpoch(r.date, '12:00') - kstToEpoch(la.date, '12:00')) <= 36 * 3_600_000);
    const days = neighbors.map((r) => ({ date: r.date, moonrise: r.moonrise, moonset: r.moonset }));
    const w = moonVisibleWindow(days, la.date, window.start, window.end);
    const at21 = judgeAboveHorizon(days, kstToEpoch(la.date, '21:00')).state;
    return {
      date: la.date,
      day: d,
      weekday,
      lunarAge: la.lunarAge,
      approxTheta: la.lunarAge === null ? null : thetaFromLunarAgeApprox(la.lunarAge),
      sunset: rs?.sunset,
      moonrise: rs?.moonrise,
      moonset: rs?.moonset,
      setFromPrevNight: rs ? moonsetContinuesFromPreviousNight({ date: rs.date, moonrise: rs.moonrise, moonset: rs.moonset }) : null,
      riseSetsNextDay: rs ? moonriseSetsNextDay({ date: rs.date, moonrise: rs.moonrise, moonset: rs.moonset }) : null,
      window: { anyAbove: w.anyAbove, detail: w.detail },
      at21,
    };
  });
}

export function todayKST(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 월출 시각 변화 경향(선택 날짜, 시간순). null 은 사건 없음/결측이라 건너뛴다 */
export function moonriseTrend(rows: DayRow[]): 'later' | 'earlier' | 'mixed' | 'unknown' {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1].moonrise;
    const b = sorted[i].moonrise;
    if (typeof a !== 'string' || typeof b !== 'string') continue;
    const da = kstToEpoch(sorted[i - 1].date, a);
    const db = kstToEpoch(sorted[i].date, b);
    const daysBetween = Math.round((kstToEpoch(sorted[i].date, '00:00') - kstToEpoch(sorted[i - 1].date, '00:00')) / 86_400_000);
    // 하루 단위로 정규화한 뒤 시각 차이(분)
    const perDay = (db - da) / 60_000 / Math.max(1, daysBetween) - 24 * 60;
    diffs.push(perDay);
  }
  if (diffs.length === 0) return 'unknown';
  if (diffs.every((d) => d > 5)) return 'later';
  if (diffs.every((d) => d < -5)) return 'earlier';
  return 'mixed';
}
