import { SUN_DIRECTION } from '@shared/phaseMath';

/**
 * 모든 3D 장면(02 미니 장면, 05~11 전체 모형, 지구 시점)이 같은 광원 방향을 쓴다.
 * 방향은 shared/phaseMath 의 SUN_DIRECTION 하나에서만 온다.
 */
export function sunLightPosition(distance: number): [number, number, number] {
  return [SUN_DIRECTION[0] * distance, SUN_DIRECTION[1] * distance, SUN_DIRECTION[2] * distance];
}

/** 표시 축척 — 물리 판정에는 쓰이지 않는다(shared/eclipseMath 는 km 값을 쓴다). */
export const DISPLAY = {
  phase: { orbitRadius: 7, moonRadius: 0.42, earthRadius: 1, note: '거리·달 크기 축척 과장 (실제 거리는 지구 반지름의 약 60배)' },
  eclipse: { orbitRadius: 24, moonRadius: 0.5, earthRadius: 1, note: '거리 축척 약 1/2.5, 달 크기 약 2배 과장, 그림자는 지구 크기 기준으로 표시' },
} as const;

/** 지구 시점(망원경 시야)에서 쓰는 각크기. 실제 평균 각반지름(태양 0.267°, 달 0.259°)을 쓴다. */
export const TELESCOPE = {
  moonDistance: 100,
  moonRadius: 100 * Math.tan((0.259 * Math.PI) / 180),
  sunDistance: 1000,
  sunRadius: 1000 * Math.tan((0.267 * Math.PI) / 180),
  fov: 1.7,
} as const;
