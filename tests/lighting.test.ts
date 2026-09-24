import { describe, expect, it } from 'vitest';
import { SUN_DIRECTION, illuminatedFraction, sampledLitFraction } from '../shared/phaseMath';
import { sunLightPosition, TELESCOPE } from '../src/three/lighting';

/**
 * R11: 02 의 미니 3D 와 05 의 전체 3D 가 같은 조명·위상 계산 코드를 쓴다.
 * 두 장면 모두 sunLightPosition() 하나에서 광원 위치를 가져오고, 그 방향은 phaseMath.SUN_DIRECTION 이다.
 * 2D 원반(목표·대체 화면)은 같은 규칙으로 샘플링해 해석값과 같은 밝은 비율을 낸다.
 */
describe('공유 조명', () => {
  it('광원 위치는 SUN_DIRECTION 의 배수', () => {
    const p = sunLightPosition(20);
    expect(p).toEqual([SUN_DIRECTION[0] * 20, SUN_DIRECTION[1] * 20, SUN_DIRECTION[2] * 20]);
  });
  it('같은 입력(theta)에 대해 2D 샘플링과 해석값의 밝은 비율이 같다', () => {
    for (const t of [30, 90, 150, 270]) expect(sampledLitFraction(t, 120)).toBeCloseTo(illuminatedFraction(t), 1);
  });
  it('지구 시점 각크기: 달이 태양보다 살짝 작다(평균 거리)', () => {
    const moonAng = Math.atan(TELESCOPE.moonRadius / TELESCOPE.moonDistance);
    const sunAng = Math.atan(TELESCOPE.sunRadius / TELESCOPE.sunDistance);
    expect(moonAng).toBeLessThan(sunAng);
    expect(sunAng / moonAng).toBeCloseTo(0.267 / 0.259, 2);
  });
});

describe('02 전등 장면과 05 모형의 광원', () => {
  it('전등 각도 0 이면 전체 모형의 태양 방향과 같다', async () => {
    const { lampLightPosition } = await import('../src/three/lighting');
    const a = lampLightPosition(0, 20);
    const b = sunLightPosition(20);
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i]));
  });
  it('전등을 90 돌리면 위에서 볼 때 시계 반대 방향(-Z)으로 간다', async () => {
    const { lampLightPosition } = await import('../src/three/lighting');
    const [x, , z] = lampLightPosition(90, 1);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
  });
});
