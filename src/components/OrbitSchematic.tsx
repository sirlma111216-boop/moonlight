import { DEG, normalizeDeg } from '@shared/phaseMath';
import { moonDirection } from '@shared/eclipseMath';

/**
 * 위에서 내려다본 배치 도식(SVG). 태양은 오른쪽(+X), 달은 위에서 볼 때 반시계 방향.
 * 보고서 재렌더링·2D 대체 화면·요약 카드에 쓴다. 축척은 실제와 다르다.
 */
export function OrbitSchematic({
  theta,
  inclination = 0,
  nodeLongitude = 0,
  size = 240,
  showSightline = false,
  showShadow = false,
  interactive,
  label,
}: {
  theta: number;
  inclination?: number;
  nodeLongitude?: number;
  size?: number;
  showSightline?: boolean;
  showShadow?: boolean;
  interactive?: { onTheta: (t: number) => void };
  label?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.34;
  const dir = moonDirection({ theta, inclination, nodeLongitude });
  // 위에서 본 투영: x → 오른쪽, z → 아래
  const mx = cx + dir[0] * R;
  const my = cy + dir[2] * R;
  const moonR = size * 0.045;
  const earthR = size * 0.08;
  const t = normalizeDeg(theta);

  function pointerToTheta(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size - cx;
    const y = ((e.clientY - rect.top) / rect.height) * size - cy;
    // 위에서 볼 때 반시계: θ = atan2(-z, x)
    return normalizeDeg((Math.atan2(-y, x) / DEG) as number);
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role={interactive ? 'slider' : 'img'}
      aria-label={label ?? `위에서 본 배치, 달의 공전 각도 ${Math.round(t)}°`}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 360 : undefined}
      aria-valuenow={interactive ? Math.round(t) : undefined}
      tabIndex={interactive ? 0 : undefined}
      style={{ touchAction: 'none', cursor: interactive ? 'grab' : undefined, background: '#02120f', borderRadius: 16 }}
      onPointerDown={interactive ? (e) => { e.currentTarget.setPointerCapture(e.pointerId); interactive.onTheta(pointerToTheta(e)); } : undefined}
      onPointerMove={interactive ? (e) => { if (e.buttons & 1) interactive.onTheta(pointerToTheta(e)); } : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              const step = e.shiftKey ? 15 : 3;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); interactive.onTheta(normalizeDeg(theta + step)); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); interactive.onTheta(normalizeDeg(theta - step)); }
            }
          : undefined
      }
    >
      {/* 햇빛 (오른쪽에서) */}
      {[0.25, 0.4, 0.5, 0.6, 0.75].map((f) => (
        <line key={f} x1={size} y1={size * f} x2={cx + R + moonR * 2} y2={size * f} stroke="#f2d16b" strokeWidth={1} strokeDasharray="4 4" opacity={0.8} />
      ))}
      <text x={size - 6} y={14} fontSize={10} fill="#f2d16b" textAnchor="end" fontFamily="monospace">
        태양 →
      </text>
      {/* 지구 그림자(표시용) */}
      {showShadow ? <polygon points={`${cx},${cy - earthR} ${cx},${cy + earthR} ${0},${cy + earthR * 0.9} ${0},${cy - earthR * 0.9}`} fill="rgba(0,0,0,0.55)" /> : null}
      {/* 궤도 */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeDasharray="3 5" />
      {/* 지구: 오른쪽 절반 밝음 */}
      <circle cx={cx} cy={cy} r={earthR} fill="#1b3d5c" />
      <path d={`M ${cx} ${cy - earthR} A ${earthR} ${earthR} 0 0 1 ${cx} ${cy + earthR} Z`} fill="#6fb1e6" />
      {/* 관측선 */}
      {showSightline ? <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#8ff0c8" strokeWidth={1.2} strokeDasharray="2 3" /> : null}
      {/* 달: 오른쪽 절반 밝음 */}
      <circle cx={mx} cy={my} r={moonR} fill="#3a3a3f" />
      <path d={`M ${mx} ${my - moonR} A ${moonR} ${moonR} 0 0 1 ${mx} ${my + moonR} Z`} fill="#e8e6dc" />
      {inclination !== 0 ? (
        <text x={mx} y={my - moonR - 5} fontSize={9} fill="#bfe3d8" textAnchor="middle" fontFamily="monospace">
          {dir[1] > 0.003 ? '▲ 궤도면 위' : dir[1] < -0.003 ? '▼ 궤도면 아래' : '교선 근처'}
        </text>
      ) : null}
      <text x={8} y={size - 8} fontSize={9} fill="rgba(255,255,255,0.6)" fontFamily="monospace">
        위에서 본 모습 · 축척 과장
      </text>
    </svg>
  );
}
