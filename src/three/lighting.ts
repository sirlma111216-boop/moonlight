import { DEG, SUN_DIRECTION } from '@shared/phaseMath';

/**
 * 모든 3D 장면(02 전등 장면, 05~11 전체 모형, 지구 시점)이 같은 광원 방향 규칙을 쓴다.
 * 기본 방향은 shared/phaseMath 의 SUN_DIRECTION 하나에서만 온다.
 */
export function sunLightPosition(distance: number): [number, number, number] {
  return [SUN_DIRECTION[0] * distance, SUN_DIRECTION[1] * distance, SUN_DIRECTION[2] * distance];
}

/**
 * 02 장면 1의 '태양 역할 전등' 위치. SUN_DIRECTION 을 Y축 둘레로 angleDeg 만큼 돌린다.
 * angleDeg = 0 이면 sunLightPosition 과 같다(단위 테스트로 확인).
 */
export function lampLightPosition(angleDeg: number, distance: number): [number, number, number] {
  const a = angleDeg * DEG;
  const [x, y, z] = SUN_DIRECTION;
  // Y축 둘레 회전(위에서 볼 때 반시계): x' = x cos + z sin, z' = -x sin + z cos
  return [(x * Math.cos(a) + z * Math.sin(a)) * distance, y * distance, (-x * Math.sin(a) + z * Math.cos(a)) * distance];
}

/** 표시 축척 — 물리 판정에는 쓰이지 않는다(shared/eclipseMath 는 km 값을 쓴다). 수치 설명은 docs/SCIENCE_MODEL.md */
export const DISPLAY = {
  phase: { orbitRadius: 7, moonRadius: 0.42, earthRadius: 1 },
  eclipse: { orbitRadius: 24, moonRadius: 0.5, earthRadius: 1 },
} as const;

/** 지구 시점(망원경 시야)에서 쓰는 각크기. 실제 평균 각반지름(태양 0.267°, 달 0.259°)을 쓴다. */
export const TELESCOPE = {
  moonDistance: 100,
  moonRadius: 100 * Math.tan((0.259 * Math.PI) / 180),
  sunDistance: 1000,
  sunRadius: 1000 * Math.tan((0.267 * Math.PI) / 180),
  fov: 1.7,
} as const;
