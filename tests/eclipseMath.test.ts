import { describe, expect, it } from 'vitest';
import {
  judgeLunarEclipse,
  judgeSolarEclipse,
  localSolarEclipseView,
  moonDirection,
  scanMonthForEclipses,
  PHYS,
} from '../shared/eclipseMath';
import { illuminatedFraction } from '../shared/phaseMath';

describe('식 판정 — 정렬 조건', () => {
  it('기울기 0°, 보름(180°)이면 개기월식', () => {
    const r = judgeLunarEclipse({ theta: 180, inclination: 0, nodeLongitude: 0 });
    expect(r.kind).toBe('total');
    expect(r.behindEarth).toBe(true);
  });
  it('기울기 0°, 삭(0°)이면 일식(지구 어딘가에서 개기 또는 금환)', () => {
    const r = judgeSolarEclipse({ theta: 0, inclination: 0, nodeLongitude: 0 });
    expect(['total', 'annular']).toContain(r.kind);
    expect(r.betweenSunAndEarth).toBe(true);
  });
  it('보름이 아니면 월식이 아니고, 삭이 아니면 일식이 아니다', () => {
    expect(judgeLunarEclipse({ theta: 90, inclination: 0, nodeLongitude: 0 }).kind).toBe('none');
    expect(judgeSolarEclipse({ theta: 180, inclination: 0, nodeLongitude: 0 }).kind).toBe('none');
  });
  it('실제 기울기(5.145°)에서 교선이 태양 방향과 직각이면 보름에도 월식이 없다', () => {
    const r = judgeLunarEclipse({ theta: 180, inclination: PHYS.realInclinationDeg, nodeLongitude: 90 });
    expect(r.kind).toBe('none');
    // 달이 그림자 위/아래를 지난다: 높이가 0 이 아니다
    expect(Math.abs(moonDirection({ theta: 180, inclination: PHYS.realInclinationDeg, nodeLongitude: 90 })[1])).toBeGreaterThan(0.05);
  });
  it('실제 기울기라도 교선이 태양 방향과 나란하면 보름에 월식이 생긴다', () => {
    const r = judgeLunarEclipse({ theta: 180, inclination: PHYS.realInclinationDeg, nodeLongitude: 0 });
    expect(r.kind).not.toBe('none');
  });
  it('기울기를 5°로 두는 것만으로 매달 식이 생기지 않는다(교선 방향에 따라 다르다)', () => {
    const aligned = scanMonthForEclipses({ inclination: PHYS.realInclinationDeg, nodeLongitude: 0 });
    const crossed = scanMonthForEclipses({ inclination: PHYS.realInclinationDeg, nodeLongitude: 90 });
    expect(aligned.lunar).not.toBe('none');
    expect(crossed.lunar).toBe('none');
    expect(crossed.solar).toBe('none');
  });
  it('기울기 0° 가상 조건에서는 매달 두 식이 모두 생긴다', () => {
    const flat = scanMonthForEclipses({ inclination: 0, nodeLongitude: 123 });
    expect(flat.lunar).toBe('total');
    expect(flat.solar).not.toBe('none');
  });
});

describe('식 판정 — 표시용 크기와 무관', () => {
  it('궤도 방향 벡터는 단위벡터이며 표시 반지름은 판정에 들어가지 않는다', () => {
    const d = moonDirection({ theta: 37, inclination: 5, nodeLongitude: 20 });
    expect(Math.hypot(...d)).toBeCloseTo(1);
    // 같은 각도 입력이면 언제나 같은 결과(표시 축척은 인자가 아니다)
    const a = judgeLunarEclipse({ theta: 180, inclination: 5.145, nodeLongitude: 3 });
    const b = judgeLunarEclipse({ theta: 180, inclination: 5.145, nodeLongitude: 3 });
    expect(a).toEqual(b);
  });
  it('기울기 0° 에서 위상 각도와 방향 벡터가 위상 모형과 같다', () => {
    const d = moonDirection({ theta: 90, inclination: 0, nodeLongitude: 45 });
    expect(d[0]).toBeCloseTo(0);
    expect(d[2]).toBeCloseTo(-1);
    expect(illuminatedFraction(90)).toBeCloseTo(0.5);
  });
});

describe('일식 — 관측 지점에 따라 다르게 보인다', () => {
  it('중심 정렬일 때 정오 지점은 개기/금환, 밤 지점은 보이지 않음', () => {
    const p = { theta: 0, inclination: 0, nodeLongitude: 0 };
    expect(['total', 'annular']).toContain(localSolarEclipseView(p, 0, 0));
    expect(localSolarEclipseView(p, 0, 180)).toBe('night');
  });
  it('축에서 벗어난 지점은 부분식이거나 보이지 않음', () => {
    const p = { theta: 0, inclination: 0, nodeLongitude: 0 };
    expect(['partial', 'none']).toContain(localSolarEclipseView(p, 60, 0));
    expect(localSolarEclipseView(p, 85, 0)).toBe('none');
  });
});
