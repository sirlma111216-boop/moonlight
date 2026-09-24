import { DEG, normalizeDeg } from '@shared/phaseMath';
import { moonDirection } from '@shared/eclipseMath';
import { positionNo } from '@/lib/words';

/**
 * 위에서 내려다본 모습(SVG). 태양은 오른쪽, 달은 위에서 볼 때 시계 반대 방향으로 돈다.
 * 태양·지구·달·'나'에 이름표를 붙이고, 달이 도는 길에 1~8번 자리를 표시한다.
 * 크기와 거리는 실제와 다르다.
 */
export function OrbitSchematic({
  theta,
  inclination = 0,
  nodeLongitude = 0,
  size = 240,
  showSightline = false,
  showShadow = false,
  showMarks = true,
  showMe = true,
  interactive,
  label,
}: {
  theta: number;
  inclination?: number;
  nodeLongitude?: number;
  size?: number;
  showSightline?: boolean;
  showShadow?: boolean;
  showMarks?: boolean;
  showMe?: boolean;
  interactive?: { onTheta: (t: number) => void };
  label?: string;
}) {
  const cx = size * 0.45;
  const cy = size / 2;
  const R = size * 0.3;
  const dir = moonDirection({ theta, inclination, nodeLongitude });
  // 위에서 본 투영: x → 오른쪽, z → 아래
  const mx = cx + dir[0] * R;
  const my = cy + dir[2] * R;
  const moonR = size * 0.045;
  const earthR = size * 0.075;
  const fs = Math.max(10, size * 0.045);
  const t = normalizeDeg(theta);
  // 지구 위의 '나': 달을 바라보는 쪽 지표면
  const len = Math.hypot(dir[0], dir[2]) || 1;
  const meX = cx + (dir[0] / len) * earthR * 1.05;
  const meY = cy + (dir[2] / len) * earthR * 1.05;

  function pointerToTheta(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size - cx;
    const y = ((e.clientY - rect.top) / rect.height) * size - cy;
    return normalizeDeg(Math.atan2(-y, x) / DEG);
  }

  const sunX = size * 1.02;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role={interactive ? 'slider' : 'img'}
      aria-label={label ?? `위에서 내려다본 모습. 달은 지금 ${positionNo(t)}번 자리에 있어요.`}
      aria-valuemin={interactive ? 1 : undefined}
      aria-valuemax={interactive ? 8 : undefined}
      aria-valuenow={interactive ? positionNo(t) : undefined}
      aria-valuetext={interactive ? `${positionNo(t)}번 자리` : undefined}
      tabIndex={interactive ? 0 : undefined}
      style={{ touchAction: 'none', cursor: interactive ? 'grab' : undefined, background: '#02120f', borderRadius: 16, maxWidth: '100%', height: 'auto' }}
      onPointerDown={
        interactive
          ? (e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              interactive.onTheta(pointerToTheta(e));
            }
          : undefined
      }
      onPointerMove={
        interactive
          ? (e) => {
              if (e.buttons & 1) interactive.onTheta(pointerToTheta(e));
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              const step = e.shiftKey ? 45 : 5;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                interactive.onTheta(normalizeDeg(theta + step));
              }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                interactive.onTheta(normalizeDeg(theta - step));
              }
            }
          : undefined
      }
    >
      {/* 태양(오른쪽 끝, 일부만 보임)과 햇빛 */}
      <circle cx={sunX} cy={cy} r={size * 0.14} fill="#ffd866" />
      <text x={size - 6} y={cy + size * 0.2} fontSize={fs} fill="#ffd866" textAnchor="end">
        태양
      </text>
      {[0.28, 0.4, 0.6, 0.72].map((f) => (
        <line key={f} x1={sunX - size * 0.14} y1={size * f} x2={cx + R + moonR * 2.5} y2={size * f} stroke="#f2d16b" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      ))}
      <text x={size - 6} y={fs + 2} fontSize={fs * 0.9} fill="#f2d16b" textAnchor="end">
        ← 햇빛
      </text>
      {/* 지구 그림자(태양 반대쪽) */}
      {showShadow ? <rect x={0} y={cy - earthR} width={cx} height={earthR * 2} fill="rgba(0,0,0,0.6)" /> : null}
      {/* 달이 도는 길 */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.35)" strokeDasharray="3 5" />
      {showMarks
        ? Array.from({ length: 8 }).map((_, i) => {
            const a = i * 45 * DEG;
            const px = cx + Math.cos(a) * (R + fs * 1.1);
            const py = cy - Math.sin(a) * (R + fs * 1.1);
            return (
              <text key={i} x={px} y={py + fs * 0.35} fontSize={fs * 0.85} fill="rgba(255,255,255,0.75)" textAnchor="middle">
                {i + 1}
              </text>
            );
          })
        : null}
      {/* 지구: 태양 쪽(오른쪽) 절반 밝음 */}
      <circle cx={cx} cy={cy} r={earthR} fill="#1b3d5c" />
      <path d={`M ${cx} ${cy - earthR} A ${earthR} ${earthR} 0 0 1 ${cx} ${cy + earthR} Z`} fill="#6fb1e6" />
      <text x={cx} y={cy + earthR + fs * 1.1} fontSize={fs} fill="#cfe7ff" textAnchor="middle">
        지구
      </text>
      {/* 나 */}
      {showMe ? (
        <>
          <circle cx={meX} cy={meY} r={Math.max(2.5, size * 0.012)} fill="#ff7759" />
          <text x={meX + (-dir[2] / len) * fs * 1.1} y={meY + (dir[0] / len) * fs * 1.1 + fs * 0.35} fontSize={fs * 0.85} fill="#ffad9b" textAnchor="middle">
            나
          </text>
        </>
      ) : null}
      {/* 지구에서 달을 보는 눈길 */}
      {showSightline ? <line x1={meX} y1={meY} x2={mx} y2={my} stroke="#8ff0c8" strokeWidth={1.4} strokeDasharray="2 3" /> : null}
      {/* 달: 태양 쪽(오른쪽) 절반 밝음 */}
      <circle cx={mx} cy={my} r={moonR} fill="#3a3a3f" />
      <path d={`M ${mx} ${my - moonR} A ${moonR} ${moonR} 0 0 1 ${mx} ${my + moonR} Z`} fill="#e8e6dc" />
      <text x={mx} y={my - moonR - 4} fontSize={fs} fill="#ffffff" textAnchor="middle">
        달
      </text>
      {inclination !== 0 ? (
        <text x={mx} y={my + moonR + fs * 1.1} fontSize={fs * 0.8} fill="#bfe3d8" textAnchor="middle">
          {dir[1] > 0.003 ? '▲ 조금 위쪽' : dir[1] < -0.003 ? '▼ 조금 아래쪽' : '두 길이 만나는 곳'}
        </text>
      ) : null}
      <text x={8} y={size - 8} fontSize={fs * 0.8} fill="rgba(255,255,255,0.6)">
        위에서 내려다본 모습 · 크기와 거리는 실제와 달라요
      </text>
    </svg>
  );
}
