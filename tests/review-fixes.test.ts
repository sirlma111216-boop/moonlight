import { describe, expect, it } from 'vitest';
import { judgePhaseAttempt } from '../shared/phaseMath';
import { judgeAboveHorizon, kstToEpoch } from '../shared/horizon';
import { moonriseTrend, type DayRow } from '../src/lib/publicdata';

const row = (date: string, moonrise: string | null): DayRow => ({
  date,
  day: Number(date.slice(8)),
  weekday: '',
  lunarAge: null,
  approxTheta: null,
  sunset: null,
  moonrise,
  moonset: null,
  setFromPrevNight: null,
  riseSetsNextDay: null,
  window: { anyAbove: false, detail: '' },
  at21: 'unknown',
});

describe('밝은 쪽이 반대일 때 알려 주는 자리 번호', () => {
  it('하현(7번) 자리에서 상현 목표면 거울 건너편 3번 자리를 알려 준다', () => {
    const r = judgePhaseAttempt(270, { kind: 'theta', theta: 90, toleranceDeg: 20 });
    expect(r.waxingMatch).toBe(false);
    expect(r.feedback).toContain('3번 자리');
    expect(r.feedback).toContain('기우는');
  });
  it('보름 근처에서는 밝은 쪽을 따지지 않는다', () => {
    const r = judgePhaseAttempt(182, { kind: 'theta', theta: 135, toleranceDeg: 20 });
    expect(r.waxingMatch).toBeNull();
  });
});

describe('월출 경향', () => {
  it('자정을 넘겨 월출이 없는 날이 끼어도 늦어지는 경향으로 읽는다', () => {
    expect(moonriseTrend([row('2026-09-01', '23:30'), row('2026-09-03', '00:40')])).toBe('later');
  });
  it('날마다 약 50분씩 늦어지면 later', () => {
    expect(moonriseTrend([row('2026-09-10', '15:00'), row('2026-09-11', '15:50'), row('2026-09-12', '16:42')])).toBe('later');
  });
});

describe('지평선 위아래 판단', () => {
  it('앞 사건과 17시간 넘게 벌어지면 자료 공백으로 본다', () => {
    const days = [{ date: '2026-09-01', moonrise: '06:00', moonset: null }];
    expect(judgeAboveHorizon(days, kstToEpoch('2026-09-01', '20:00')).state).toBe('above');
    expect(judgeAboveHorizon(days, kstToEpoch('2026-09-02', '00:00')).state).toBe('unknown');
  });
});
