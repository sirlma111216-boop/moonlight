import { useEffect, useRef } from 'react';
import { illuminatedFraction, isLitPoint, PHASE_LABEL_KO, phaseName } from '@shared/phaseMath';

/**
 * 지구에서 보이는 달 원반 — 3D 와 같은 규칙(isLitPoint)으로 픽셀마다 밝기를 정한다.
 * 목표 원반·2D 대체 화면·보고서 재렌더링에 쓴다. 생성 이미지가 아니라 계산 결과다.
 */
export function PhaseDisk({
  theta,
  size = 120,
  label,
  hideName = false,
  className,
  style,
}: {
  theta: number;
  size?: number;
  label?: string;
  hideName?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const n = Math.round(size * dpr);
    c.width = n;
    c.height = n;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(n, n);
    const d = img.data;
    const r = n / 2;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const nx = (x + 0.5 - r) / r;
        const ny = -(y + 0.5 - r) / r;
        const rr = nx * nx + ny * ny;
        const i = (y * n + x) * 4;
        if (rr > 1) {
          d[i + 3] = 0;
          continue;
        }
        const nz = Math.sqrt(1 - rr);
        const lit = isLitPoint(nx, ny, nz, theta);
        // 밝은 면은 옅은 회백색, 어두운 면은 짙은 회색(지구조 느낌으로 아주 약하게)
        const edge = rr > 0.985 ? 0.7 : 1; // 가장자리 부드럽게
        const v = lit ? 214 + 30 * nz : 34;
        d[i] = v;
        d[i + 1] = lit ? v : 36;
        d[i + 2] = lit ? v - 8 : 44;
        d[i + 3] = Math.round(255 * edge);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [theta, size]);
  const k = Math.round(illuminatedFraction(theta) * 100);
  const name = PHASE_LABEL_KO[phaseName(theta)];
  const aria = label ?? (hideName ? `달 원반, 밝은 비율 ${k}%` : `${name}, 밝은 비율 ${k}%`);
  return <canvas ref={ref} className={className} style={{ width: size, height: size, ...style }} role="img" aria-label={aria} />;
}
