import { describe, expect, it } from 'vitest';
import {
  judgeAboveHorizon,
  kstToEpoch,
  moonVisibleWindow,
  moonsetContinuesFromPreviousNight,
  moonriseSetsNextDay,
  epochToKstDate,
  epochToKstTime,
  flattenEvents,
} from '../shared/horizon';

const days = [
  { date: '2026-09-23', moonrise: '15:10', moonset: '00:40' }, // 00:40 은 전날 뜬 달이 지는 시각
  { date: '2026-09-24', moonrise: '15:50', moonset: '01:30' },
  { date: '2026-09-25', moonrise: '16:25', moonset: '02:25' },
];

describe('KST 변환', () => {
  it('날짜만 있는 값을 UTC 자정으로 처리하지 않는다', () => {
    const e = kstToEpoch('2026-09-24', '00:10');
    expect(epochToKstDate(e)).toBe('2026-09-24');
    expect(epochToKstTime(e)).toBe('00:10');
    // UTC 로는 전날 15:10
    expect(new Date(e).toISOString()).toBe('2026-09-23T15:10:00.000Z');
  });
});

describe('지평선 위 판정', () => {
  it('21시에 그날 15:50 에 뜬 달은 위에 있다', () => {
    const r = judgeAboveHorizon(days, kstToEpoch('2026-09-24', '21:00'));
    expect(r.state).toBe('above');
    expect(r.basis?.kind).toBe('rise');
  });
  it('자정 넘김: 24일 01:00 에는 23일 오후에 뜬 달이 아직 위에 있다', () => {
    const r = judgeAboveHorizon(days, kstToEpoch('2026-09-24', '01:00'));
    expect(r.state).toBe('above');
    expect(r.basis?.date).toBe('2026-09-23');
  });
  it('24일 03:00 에는 01:30 에 진 뒤라 아래에 있다', () => {
    const r = judgeAboveHorizon(days, kstToEpoch('2026-09-24', '03:00'));
    expect(r.state).toBe('below');
  });
  it('사건 없음(null)은 건너뛰고 결측(undefined)도 무시하되 자료가 없으면 unknown', () => {
    const r = judgeAboveHorizon([{ date: '2026-09-24', moonrise: undefined, moonset: undefined }], kstToEpoch('2026-09-24', '21:00'));
    expect(r.state).toBe('unknown');
    const only = [{ date: '2026-09-24', moonrise: '15:50', moonset: null }];
    expect(judgeAboveHorizon(only, kstToEpoch('2026-09-24', '21:00')).state).toBe('above');
  });
  it('이전 사건이 없으면 다음 사건으로 추정한다', () => {
    const only = [{ date: '2026-09-24', moonrise: null, moonset: '01:30' }];
    expect(judgeAboveHorizon(only, kstToEpoch('2026-09-24', '00:30')).state).toBe('above');
  });
});

describe('전날 밤 이어짐 표시', () => {
  it('월몰이 월출보다 이르면 전날 뜬 달', () => {
    expect(moonsetContinuesFromPreviousNight(days[1])).toBe(true);
    expect(moonsetContinuesFromPreviousNight({ date: '2026-09-10', moonrise: '03:00', moonset: '17:00' })).toBe(false);
    expect(moonriseSetsNextDay(days[1])).toBe(true);
  });
});

describe('관측 창', () => {
  it('19~21시 창 판정', () => {
    const w = moonVisibleWindow(days, '2026-09-24', '19:00', '21:00');
    expect(w.anyAbove).toBe(true);
    const early = [{ date: '2026-09-24', moonrise: '03:00', moonset: '16:00' }];
    expect(moonVisibleWindow(early, '2026-09-24', '19:00', '21:00').anyAbove).toBe(false);
  });
  it('창 도중에 뜨는 경우도 잡는다', () => {
    const mid = [{ date: '2026-09-24', moonrise: '20:10', moonset: '08:00' }];
    expect(moonVisibleWindow(mid, '2026-09-24', '19:00', '21:00').anyAbove).toBe(true);
  });
  it('사건이 시간순으로 정렬된다', () => {
    const ev = flattenEvents(days);
    for (let i = 1; i < ev.length; i++) expect(ev[i].epoch).toBeGreaterThanOrEqual(ev[i - 1].epoch);
  });
});
