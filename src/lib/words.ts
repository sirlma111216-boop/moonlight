import { illuminatedFraction, normalizeDeg } from '@shared/phaseMath';

/**
 * 학생 화면용 쉬운 말. 퍼센트·각도 대신 모양과 '자리 번호'로 말한다.
 * 자리 번호: 태양 쪽(달이 태양과 지구 사이)이 1번, 위에서 볼 때 시계 반대 방향으로 2번…8번.
 */

/** 지구에서 보이는 밝은 부분을 말로 */
export function litWords(k: number): string {
  if (k < 0.04) return '거의 안 보여요';
  if (k < 0.3) return '눈썹처럼 가늘게 보여요';
  if (k < 0.44) return '반보다 조금 작게 보여요';
  if (k <= 0.56) return '반쪽이 보여요';
  if (k < 0.85) return '반보다 크게 보여요';
  if (k < 0.97) return '거의 다 보여요';
  return '동그랗게 다 보여요';
}

export function litWordsAt(theta: number): string {
  return litWords(illuminatedFraction(theta));
}

/** 1~8 자리 번호 */
export function positionNo(theta: number): number {
  return (Math.round(normalizeDeg(theta) / 45) % 8) + 1;
}

export function positionWords(theta: number): string {
  return `${positionNo(theta)}번 자리`;
}

/** 자리 번호 → 대표 각도 */
export function thetaOfPosition(n: number): number {
  return ((n - 1) % 8) * 45;
}

/** 밝은 쪽이 어느 쪽인지 (지구에서 볼 때, 북반구 기준으로 단순화) */
export function brightSideWords(theta: number): string {
  const t = normalizeDeg(theta);
  const k = illuminatedFraction(t);
  if (k < 0.04) return '밝은 쪽이 거의 안 보여요';
  if (k > 0.97) return '전체가 밝아요';
  return t < 180 ? '오른쪽이 밝아요' : '왼쪽이 밝아요';
}
