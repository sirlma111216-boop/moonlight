/**
 * 달의 위상 계산 — 3D 모형(02 미니 장면, 05~08 전체 모형), 2D 대체 화면, 목표 원반(SVG),
 * 보고서 재렌더링이 모두 이 한 파일의 함수를 사용한다.
 *
 * 좌표계 (문서화 필수 — 원문 9절):
 *  - 지구가 원점, Y축이 위(황도면의 북쪽), 황도면 = XZ 평면.
 *  - 태양은 +X 방향에 있다. 햇빛은 평행광으로 -X 방향으로 진행한다.
 *  - 달의 공전 각도 theta(도)는 태양 방향(+X)에서 시작해 위(+Y)에서 내려다볼 때
 *    반시계 방향으로 증가한다. theta=0 삭, 90 상현, 180 보름, 270 하현.
 *  - 달 위치 = (r·cosθ, 0, −r·sinθ). (위에서 보면 반시계 방향으로 돈다.)
 *  - 차오름(waxing): 0 < θ < 180. 기움(waning): 180 < θ < 360.
 *  - 위상각 α = 달→태양 벡터와 달→관측자 벡터 사이의 각 = 180° − θ.
 *  - 지구에서 보이는 원반의 밝은 비율 k = (1 + cos α)/2 = (1 − cos θ)/2.
 *    (달 전체 표면의 밝은 비율은 식 현상을 제외하면 항상 1/2이다.)
 *  - 지구 시점(정면 보기)은 관측자가 지구 중심에서 달을 바라보고 +Y가 화면 위인
 *    '단순화한 지구 관측 방향'이다. 실제 지역 하늘의 회전·고도는 계산하지 않는다.
 *    이 기준에서 상현달은 오른쪽이 밝고 하현달은 왼쪽이 밝다(북반구 기준).
 */

export const DEG = Math.PI / 180;

export function normalizeDeg(theta: number): number {
  const t = theta % 360;
  return t < 0 ? t + 360 : t;
}

/** 달의 위치(단위 궤도 반지름 1). Y=0 은 위상 기본 모형(궤도면 기울기 0)의 위치이다. */
export function moonPosition(thetaDeg: number, radius = 1): [number, number, number] {
  const t = normalizeDeg(thetaDeg) * DEG;
  return [radius * Math.cos(t), 0, -radius * Math.sin(t)];
}

/** 태양 방향 (지구→태양, 단위벡터). 평행광 가정. */
export const SUN_DIRECTION: readonly [number, number, number] = [1, 0, 0];

/** 위상각 α(도). 달→태양과 달→관측자 사이의 각. */
export function phaseAngleDeg(thetaDeg: number): number {
  return Math.abs(180 - normalizeDeg(thetaDeg));
}

/** 지구에서 보이는 원반의 밝은 비율 k = (1 − cos θ)/2. 0(삭) ~ 1(보름). */
export function illuminatedFraction(thetaDeg: number): number {
  return (1 - Math.cos(normalizeDeg(thetaDeg) * DEG)) / 2;
}

/** 달 전체 표면 중 햇빛을 받는 비율 — 식 현상을 제외하면 항상 0.5. */
export const WHOLE_SURFACE_LIT_FRACTION = 0.5;

export function isWaxing(thetaDeg: number): boolean {
  const t = normalizeDeg(thetaDeg);
  return t > 0 && t < 180;
}

/**
 * 지구 시점 카메라 프레임에서의 태양 방향 (x: 오른쪽, y: 위, z: 관측자 쪽).
 * 관측자는 원점에서 달을 향해 보고 +Y가 위이다.
 */
export function sunDirectionInEarthView(thetaDeg: number): [number, number, number] {
  const t = normalizeDeg(thetaDeg) * DEG;
  return [Math.sin(t), 0, -Math.cos(t)];
}

/**
 * 정면 원반 위의 점(법선 nx, ny, nz — nz는 관측자 쪽)이 햇빛을 받는지.
 * 3D 셰이딩(dot(normal, sunDir) > 0)과 같은 규칙이다.
 */
export function isLitPoint(nx: number, ny: number, nz: number, thetaDeg: number): boolean {
  const [sx, sy, sz] = sunDirectionInEarthView(thetaDeg);
  return nx * sx + ny * sy + nz * sz > 0;
}

/**
 * 원반을 픽셀 단위로 샘플링해 밝은 비율을 구한다. 해석값 illuminatedFraction 과
 * 같아야 한다(단위 테스트로 검증). 2D 대체 화면·목표 원반 렌더러가 같은 규칙을 쓴다.
 */
export function sampledLitFraction(thetaDeg: number, samples = 200): number {
  let lit = 0;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const x = ((i + 0.5) / samples) * 2 - 1;
    for (let j = 0; j < samples; j++) {
      const y = ((j + 0.5) / samples) * 2 - 1;
      const rr = x * x + y * y;
      if (rr > 1) continue;
      total++;
      const z = Math.sqrt(1 - rr);
      if (isLitPoint(x, y, z, thetaDeg)) lit++;
    }
  }
  return total ? lit / total : 0;
}

export type PhaseName =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export const PHASE_LABEL_KO: Record<PhaseName, string> = {
  new: '삭',
  'waxing-crescent': '초승달',
  'first-quarter': '상현달',
  'waxing-gibbous': '차오르는 달',
  full: '보름달',
  'waning-gibbous': '기우는 달',
  'last-quarter': '하현달',
  'waning-crescent': '그믐달',
};

/** 학습용 위상 이름 구간(도). 정확한 순간이 아니라 표시용 구간이다. */
export function phaseName(thetaDeg: number): PhaseName {
  const t = normalizeDeg(thetaDeg);
  if (t < 12 || t >= 348) return 'new';
  if (t < 78) return 'waxing-crescent';
  if (t < 102) return 'first-quarter';
  if (t < 168) return 'waxing-gibbous';
  if (t < 192) return 'full';
  if (t < 258) return 'waning-gibbous';
  if (t < 282) return 'last-quarter';
  return 'waning-crescent';
}

export const REPRESENTATIVE_THETA: Record<PhaseName, number> = {
  new: 0,
  'waxing-crescent': 45,
  'first-quarter': 90,
  'waxing-gibbous': 135,
  full: 180,
  'waning-gibbous': 225,
  'last-quarter': 270,
  'waning-crescent': 315,
};

export const PHASE_ORDER: PhaseName[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

/**
 * 월령(삭 이후 지난 날수)을 학습용 근사 각도로 바꾼다.
 * 이 값은 '월령을 이용한 근사 모형'이며 정확한 천체 위치가 아니다(원문 8절).
 */
export const SYNODIC_MONTH_DAYS = 29.530588;
export function thetaFromLunarAgeApprox(lunarAgeDays: number): number {
  return normalizeDeg((lunarAgeDays / SYNODIC_MONTH_DAYS) * 360);
}

/** 목표 유형 — 판정 방식이 다르다(원문 6절 06, 16절). */
export type PhaseTarget =
  | {
      kind: 'theta';
      theta: number;
      toleranceDeg: number;
      label?: string;
    }
  | {
      kind: 'illumination';
      /** 밝은 비율 허용 구간 */
      minFraction: number;
      maxFraction: number;
      /** true=차오름, false=기움, null=회전·시각 불확실로 판정하지 않음 */
      waxing: boolean | null;
      label?: string;
    };

export interface PhaseJudgement {
  ok: boolean;
  /** 밝은 비율이 허용 범위 안인가 */
  fractionMatch: boolean;
  /** 차오름/기움이 일치하는가(판정하지 않으면 null) */
  waxingMatch: boolean | null;
  fraction: number;
  targetFraction: number | null;
  deltaDeg: number | null;
  /** 다음에 시험해 볼 것을 제안하는 피드백 */
  feedback: string;
}

function angularDistance(a: number, b: number): number {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return d > 180 ? 360 - d : d;
}

export function judgePhaseAttempt(attemptTheta: number, target: PhaseTarget): PhaseJudgement {
  const fraction = illuminatedFraction(attemptTheta);
  const waxing = isWaxing(attemptTheta);
  if (target.kind === 'theta') {
    const targetFraction = illuminatedFraction(target.theta);
    const delta = angularDistance(attemptTheta, target.theta);
    const fractionMatch = Math.abs(fraction - targetFraction) <= 0.12;
    const targetWaxing = isWaxing(target.theta);
    const isQuarterOrHalf = target.theta % 180 !== 0;
    const waxingMatch = isQuarterOrHalf ? waxing === targetWaxing : null;
    const ok = delta <= target.toleranceDeg;
    let feedback: string;
    if (ok) {
      feedback = '목표와 같은 자리예요. 왜 이 자리에서 이런 모양으로 보이는지, 햇빛을 받는 쪽과 지구에서 보이는 쪽을 함께 써서 설명해 볼까요?';
    } else if (fractionMatch && waxingMatch === false) {
      feedback = targetWaxing
        ? '밝은 부분의 크기는 비슷해요. 그런데 밝은 쪽이 목표와 반대예요. 지금 자리의 달은 보름달을 지나 점점 줄어드는 달(기우는 달)이에요. 달을 반대편 자리로 옮겨 보세요.'
        : '밝은 부분의 크기는 비슷해요. 그런데 밝은 쪽이 목표와 반대예요. 지금 자리의 달은 보름달이 되기 전, 점점 커지는 달(차오르는 달)이에요. 달을 반대편 자리로 옮겨 보세요.';
    } else if (fraction < targetFraction - 0.12) {
      feedback = '지금은 밝은 부분이 목표보다 작게 보여요. 달을 태양 반대쪽으로 조금 더 옮겨 보세요.';
    } else if (fraction > targetFraction + 0.12) {
      feedback = '지금은 밝은 부분이 목표보다 크게 보여요. 달을 태양 쪽으로 조금 더 옮겨 보세요.';
    } else {
      feedback = '거의 비슷해요. 밝은 곳과 어두운 곳의 경계선을 목표와 비교하면서 조금만 더 옮겨 보세요.';
    }
    return { ok, fractionMatch, waxingMatch, fraction, targetFraction, deltaDeg: delta, feedback };
  }
  // illumination-range target (실사진·불확실 자료 등 정성 비교)
  const fractionMatch = fraction >= target.minFraction && fraction <= target.maxFraction;
  const waxingMatch = target.waxing === null ? null : waxing === target.waxing;
  const ok = fractionMatch && waxingMatch !== false;
  let feedback: string;
  if (ok) {
    feedback =
      target.waxing === null
        ? '밝은 부분의 크기가 자료와 비슷해요. 사진이 기울어져 있거나 본 시각을 몰라서, 밝은 쪽이 왼쪽인지 오른쪽인지는 따지지 않았어요. 자료의 날짜를 보고 어느 쪽일지 생각해 볼까요?'
        : '자료와 비슷한 자리예요. 자료와 모형이 똑같지 않다면 왜 그럴지 생각해 보세요.';
  } else if (!fractionMatch) {
    feedback =
      fraction < target.minFraction
        ? '모형의 밝은 부분이 자료보다 작아요. 달을 태양 반대쪽으로 조금 더 옮겨 보세요.'
        : '모형의 밝은 부분이 자료보다 커요. 달을 태양 쪽으로 조금 더 옮겨 보세요.';
  } else {
    feedback = '밝은 부분의 크기는 비슷하지만 밝은 쪽이 반대예요. 자료의 날짜가 보름달 전인지 뒤인지 확인해 보세요.';
  }
  return {
    ok,
    fractionMatch,
    waxingMatch,
    fraction,
    targetFraction: (target.minFraction + target.maxFraction) / 2,
    deltaDeg: null,
    feedback,
  };
}
