import { describe, expect, it } from 'vitest';
import {
  illuminatedFraction,
  isWaxing,
  judgePhaseAttempt,
  moonPosition,
  phaseName,
  sampledLitFraction,
  sunDirectionInEarthView,
  isLitPoint,
  thetaFromLunarAgeApprox,
  PHASE_ORDER,
  REPRESENTATIVE_THETA,
} from '../shared/phaseMath';

describe('위상 수학 — 밝은 비율과 순서', () => {
  it('삭·상현·보름·하현의 밝은 비율', () => {
    expect(illuminatedFraction(0)).toBeCloseTo(0, 6);
    expect(illuminatedFraction(90)).toBeCloseTo(0.5, 6);
    expect(illuminatedFraction(180)).toBeCloseTo(1, 6);
    expect(illuminatedFraction(270)).toBeCloseTo(0.5, 6);
  });

  it('삭→상현→보름→하현→삭 순서로 밝은 비율이 늘었다 줄어든다', () => {
    let prev = illuminatedFraction(0);
    for (let t = 10; t <= 180; t += 10) {
      const k = illuminatedFraction(t);
      expect(k).toBeGreaterThan(prev);
      prev = k;
    }
    for (let t = 190; t < 360; t += 10) {
      const k = illuminatedFraction(t);
      expect(k).toBeLessThan(prev);
      prev = k;
    }
  });

  it('차오름과 기움을 구분한다', () => {
    expect(isWaxing(45)).toBe(true);
    expect(isWaxing(135)).toBe(true);
    expect(isWaxing(225)).toBe(false);
    expect(isWaxing(315)).toBe(false);
  });

  it('위상 이름 구간이 순서대로 이어진다', () => {
    const names = [0, 45, 90, 135, 180, 225, 270, 315].map(phaseName);
    expect(names).toEqual(PHASE_ORDER);
    for (const n of PHASE_ORDER) expect(phaseName(REPRESENTATIVE_THETA[n])).toBe(n);
  });

  it('달 위치는 위에서 볼 때 반시계 방향으로 돈다', () => {
    const [x0, , z0] = moonPosition(0);
    const [x90, , z90] = moonPosition(90);
    expect(x0).toBeCloseTo(1);
    expect(z0).toBeCloseTo(0);
    expect(x90).toBeCloseTo(0);
    expect(z90).toBeCloseTo(-1);
  });
});

describe('위상 수학 — 정면 원반 샘플링(2D·목표 원반)과 해석값이 일치', () => {
  it.each([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330])('theta=%i 에서 밝은 비율 일치', (t) => {
    expect(sampledLitFraction(t, 160)).toBeCloseTo(illuminatedFraction(t), 1);
  });

  it('상현달은 오른쪽이, 하현달은 왼쪽이 밝다(북반구 정면 보기)', () => {
    expect(isLitPoint(0.5, 0, Math.sqrt(0.75), 90)).toBe(true);
    expect(isLitPoint(-0.5, 0, Math.sqrt(0.75), 90)).toBe(false);
    expect(isLitPoint(-0.5, 0, Math.sqrt(0.75), 270)).toBe(true);
    expect(isLitPoint(0.5, 0, Math.sqrt(0.75), 270)).toBe(false);
  });

  it('지구 시점의 태양 방향 벡터는 단위벡터', () => {
    for (const t of [0, 45, 90, 200, 359]) {
      const [x, y, z] = sunDirectionInEarthView(t);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1);
    }
  });
});

describe('판정 — 목표 유형에 따라 다르게 판정', () => {
  it('각도 목표: 허용 범위 안이면 성공', () => {
    const r = judgePhaseAttempt(95, { kind: 'theta', theta: 90, toleranceDeg: 15 });
    expect(r.ok).toBe(true);
  });
  it('밝은 비율만 같고 차오름/기움이 다르면 실패하고 그 사실을 피드백', () => {
    const r = judgePhaseAttempt(270, { kind: 'theta', theta: 90, toleranceDeg: 15 });
    expect(r.ok).toBe(false);
    expect(r.fractionMatch).toBe(true);
    expect(r.waxingMatch).toBe(false);
    expect(r.feedback).toContain('기우는');
  });
  it('비율 구간 목표(회전 불확실)는 좌우로 오답 처리하지 않는다', () => {
    const r = judgePhaseAttempt(270, { kind: 'illumination', minFraction: 0.4, maxFraction: 0.6, waxing: null });
    expect(r.ok).toBe(true);
    expect(r.waxingMatch).toBeNull();
  });
  it('비율 구간 목표에 차오름 조건이 있으면 구분한다', () => {
    const r = judgePhaseAttempt(270, { kind: 'illumination', minFraction: 0.4, maxFraction: 0.6, waxing: true });
    expect(r.ok).toBe(false);
  });
});

describe('월령 근사 각도', () => {
  it('월령 0 → 0°, 14.77 → 약 180°', () => {
    expect(thetaFromLunarAgeApprox(0)).toBeCloseTo(0);
    expect(thetaFromLunarAgeApprox(14.765)).toBeCloseTo(180, 0);
  });
});
