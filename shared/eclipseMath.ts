/**
 * 일식·월식 판정 — 표시용 크기와 물리 계산용 크기를 분리한다(원문 9절 식 모드).
 *
 * 물리 계산은 실제 km 값을 쓰고, 달의 '방향'만 학생이 조작한 각도(theta, 교선 방향 Omega,
 * 기울기 i)에서 가져온다. 3D 화면의 과장된 표시 반지름·거리는 이 판정에 들어가지 않는다.
 *
 * 그림자 모델: 태양을 유한한 크기의 원반으로 두고 본그림자(umbra)·반그림자(penumbra)를
 * 원뿔로 근사한다. 개기·부분·금환의 개념 구별에 충분한 '검증된 원뿔/각크기 모델'이며,
 * 실제 식 예보 계산(지구 자전·시차·대기 굴절 등)이 아니다.
 */

import { DEG, normalizeDeg } from './phaseMath';

export const PHYS = {
  sunRadiusKm: 696_000,
  earthRadiusKm: 6_371,
  moonRadiusKm: 1_737.4,
  sunDistanceKm: 149_597_870,
  moonDistanceKm: 384_400,
  /** 실제 달 궤도면 기울기(황도 기준) */
  realInclinationDeg: 5.145,
} as const;

export interface OrbitParams {
  /** 태양 방향에서 잰 달의 공전 각도(도). 0 삭, 180 보름. */
  theta: number;
  /** 궤도면 기울기(도). 0=가상 실험, 5.145=실제에 가까움 */
  inclination: number;
  /** 두 궤도면이 만나는 선(교선)의 방향(도). 태양 방향과의 관계를 바꾼다. */
  nodeLongitude: number;
}

/**
 * 궤도 위 달의 단위 방향 벡터. 위상 모형과 같은 좌표계(Y 위, 태양 +X).
 * 교선 방향 N = (cosΩ, 0, −sinΩ), 궤도면 안의 수직 방향 P 를 N 둘레로 i 만큼 기울인다.
 * 달은 교선에서 잰 각 φ = θ − Ω 에 위치한다(θ 는 근사적으로 황경 방향).
 */
export function moonDirection(p: OrbitParams): [number, number, number] {
  const O = normalizeDeg(p.nodeLongitude) * DEG;
  const i = p.inclination * DEG;
  const phi = (normalizeDeg(p.theta) - normalizeDeg(p.nodeLongitude)) * DEG;
  const N: [number, number, number] = [Math.cos(O), 0, -Math.sin(O)];
  const Pflat: [number, number, number] = [-Math.sin(O), 0, -Math.cos(O)];
  const P: [number, number, number] = [Pflat[0] * Math.cos(i), Math.sin(i), Pflat[2] * Math.cos(i)];
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [c * N[0] + s * P[0], c * N[1] + s * P[1], c * N[2] + s * P[2]];
}

/** 궤도면 기울기 때문에 생기는 달의 황도면 위 높이(단위 궤도 기준) */
export function moonHeightAboveEcliptic(p: OrbitParams): number {
  return moonDirection(p)[1];
}

export type LunarEclipseKind = 'none' | 'penumbral' | 'partial' | 'total';
export type SolarEclipseKind = 'none' | 'partial' | 'annular' | 'total';

export interface LunarEclipseResult {
  kind: LunarEclipseKind;
  /** 달 중심과 지구 그림자 축 사이의 거리(km) */
  offsetKm: number;
  umbraRadiusKm: number;
  penumbraRadiusKm: number;
  /** 배치가 '태양–지구–달' 순서인가(달이 태양 반대편 반구에 있는가) */
  behindEarth: boolean;
}

/**
 * 월식: 지구 그림자 축은 −X 방향(태양 반대). 달까지의 거리 d 에서
 * 본그림자 반지름 = Re − d·(Rs − Re)/Ds, 반그림자 반지름 = Re + d·(Rs + Re)/Ds.
 */
export function judgeLunarEclipse(p: OrbitParams): LunarEclipseResult {
  const dir = moonDirection(p);
  const d = PHYS.moonDistanceKm;
  const along = -dir[0] * d; // 그림자 축(−X) 방향 성분
  const perp = Math.sqrt(dir[1] * dir[1] + dir[2] * dir[2]) * d;
  const behindEarth = along > 0;
  const umbra = PHYS.earthRadiusKm - along * ((PHYS.sunRadiusKm - PHYS.earthRadiusKm) / PHYS.sunDistanceKm);
  const penumbra = PHYS.earthRadiusKm + along * ((PHYS.sunRadiusKm + PHYS.earthRadiusKm) / PHYS.sunDistanceKm);
  let kind: LunarEclipseKind = 'none';
  if (behindEarth) {
    if (perp + PHYS.moonRadiusKm <= umbra) kind = 'total';
    else if (perp - PHYS.moonRadiusKm < umbra) kind = 'partial';
    else if (perp - PHYS.moonRadiusKm < penumbra) kind = 'penumbral';
  }
  return { kind, offsetKm: perp, umbraRadiusKm: Math.max(0, umbra), penumbraRadiusKm: penumbra, behindEarth };
}

export interface SolarEclipseResult {
  /** 지구 어딘가에서 볼 수 있는 가장 깊은 식의 종류 */
  kind: SolarEclipseKind;
  /** 달 그림자 축과 지구 중심 사이 거리(km) */
  offsetKm: number;
  /** 지구 중심 거리에서의 본그림자 반지름(음수면 금환 조건) */
  umbraRadiusAtEarthKm: number;
  penumbraRadiusAtEarthKm: number;
  /** 배치가 '태양–달–지구' 순서인가 */
  betweenSunAndEarth: boolean;
}

/**
 * 일식: 달 그림자 축은 달에서 −X 방향으로 뻗는다. 지구 중심까지의 축 방향 거리 x 에서
 * 본그림자 반지름 = Rm − x·(Rs − Rm)/Ds (음수면 본그림자가 지구에 못 미침 → 금환),
 * 반그림자 반지름 = Rm + x·(Rs + Rm)/Ds.
 */
export function judgeSolarEclipse(p: OrbitParams): SolarEclipseResult {
  const dir = moonDirection(p);
  const d = PHYS.moonDistanceKm;
  const betweenSunAndEarth = dir[0] > 0;
  // 지구 중심은 달에서 (−dir)·d 만큼. 축은 −X 이므로 축 방향 거리 x = dir[0]·d
  const x = dir[0] * d;
  const perp = Math.sqrt(dir[1] * dir[1] + dir[2] * dir[2]) * d;
  const umbra = PHYS.moonRadiusKm - x * ((PHYS.sunRadiusKm - PHYS.moonRadiusKm) / PHYS.sunDistanceKm);
  const penumbra = PHYS.moonRadiusKm + x * ((PHYS.sunRadiusKm + PHYS.moonRadiusKm) / PHYS.sunDistanceKm);
  let kind: SolarEclipseKind = 'none';
  if (betweenSunAndEarth) {
    const touchesEarth = perp - PHYS.earthRadiusKm < penumbra;
    if (touchesEarth) {
      // 본그림자(또는 금환 축)가 지구 표면 어딘가에 닿는가 — 축이 지구 원반 안을 지나면
      const axisHitsEarth = perp < PHYS.earthRadiusKm + Math.max(0, umbra);
      if (axisHitsEarth) kind = umbra > 0 ? 'total' : 'annular';
      else kind = 'partial';
    }
  }
  return { kind, offsetKm: perp, umbraRadiusAtEarthKm: umbra, penumbraRadiusAtEarthKm: penumbra, betweenSunAndEarth };
}

export type LocalSolarView = 'night' | 'none' | 'partial' | 'annular' | 'total';

/**
 * 지구 표면의 한 지점(위도·경도, 도)에서 같은 순간에 보이는 일식.
 * 경도 0° 가 태양 방향(+X, 정오)이 되도록 단순화한 좌표다. 지점이 밤이면 'night'.
 * '지구 어디서나 같은 일식'이 아님을 보여주기 위한 계산이다.
 */
export function localSolarEclipseView(p: OrbitParams, latDeg: number, lonDeg: number): LocalSolarView {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  // 지점 위치(km) — X: 태양 방향, Y: 북, Z
  const px = PHYS.earthRadiusKm * Math.cos(lat) * Math.cos(lon);
  const py = PHYS.earthRadiusKm * Math.sin(lat);
  const pz = -PHYS.earthRadiusKm * Math.cos(lat) * Math.sin(lon);
  // 태양이 지평선 위인가: 지점 법선·태양방향 > 0
  if (px <= 0) return 'night';
  const dir = moonDirection(p);
  if (dir[0] <= 0) return 'none';
  const mx = dir[0] * PHYS.moonDistanceKm;
  const my = dir[1] * PHYS.moonDistanceKm;
  const mz = dir[2] * PHYS.moonDistanceKm;
  // 그림자 축: 달에서 −X 방향. 지점의 축 방향 거리와 수직 거리
  const x = mx - px; // 달에서 지점까지 축 방향(−X) 거리
  if (x <= 0) return 'none';
  const perp = Math.sqrt((py - my) ** 2 + (pz - mz) ** 2);
  const umbra = PHYS.moonRadiusKm - x * ((PHYS.sunRadiusKm - PHYS.moonRadiusKm) / PHYS.sunDistanceKm);
  const penumbra = PHYS.moonRadiusKm + x * ((PHYS.sunRadiusKm + PHYS.moonRadiusKm) / PHYS.sunDistanceKm);
  if (perp < Math.abs(umbra)) return umbra > 0 ? 'total' : 'annular';
  if (perp < penumbra) return 'partial';
  return 'none';
}

/**
 * 궤도 한 바퀴를 돌며 삭·보름 부근에서 식이 생기는지 훑는다(11단계 스냅샷 비교용).
 */
export function scanMonthForEclipses(base: Omit<OrbitParams, 'theta'>, stepDeg = 1) {
  let lunar: LunarEclipseKind = 'none';
  let solar: SolarEclipseKind = 'none';
  const rank = { none: 0, penumbral: 1, partial: 2, annular: 3, total: 4 } as const;
  for (let t = 0; t < 360; t += stepDeg) {
    const l = judgeLunarEclipse({ ...base, theta: t });
    if (rank[l.kind] > rank[lunar]) lunar = l.kind;
    const s = judgeSolarEclipse({ ...base, theta: t });
    if (rank[s.kind] > rank[solar]) solar = s.kind;
  }
  return { lunar, solar };
}
