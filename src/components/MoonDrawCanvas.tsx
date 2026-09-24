import { useEffect, useRef, useState } from 'react';

/**
 * 달 그리기 — 원 안에 밝은 부분을 칠하는 간단한 캔버스(R2). 자동 채점하지 않는다.
 * 결과는 작은 PNG data URL 로 저장된다.
 */
export function MoonDrawCanvas({ value, onChange, size = 220, disabled }: { value: string | null; onChange: (dataUrl: string | null) => void; size?: number; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'paint' | 'erase'>('paint');
  const drawing = useRef(false);
  const N = 240;

  function base(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, N, N);
    ctx.fillStyle = '#1b1c22';
    ctx.beginPath();
    ctx.arc(N / 2, N / 2, N / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
  }

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    base(ctx);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, N, N);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * N, y: ((e.clientY - rect.top) / rect.height) * N };
  }
  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const { x, y } = pos(e);
    ctx.save();
    ctx.beginPath();
    ctx.arc(N / 2, N / 2, N / 2 - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = mode === 'paint' ? '#ece9dc' : '#1b1c22';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function commit() {
    const c = ref.current;
    if (!c) return;
    onChange(c.toDataURL('image/png'));
  }
  function clear() {
    const c = ref.current;
    if (!c) return;
    base(c.getContext('2d')!);
    onChange(null);
  }

  return (
    <div className="stack-sm">
      <canvas
        ref={ref}
        width={N}
        height={N}
        style={{ width: size, height: size, borderRadius: '50%', touchAction: 'none', cursor: disabled ? 'default' : 'crosshair', background: '#02120f' }}
        aria-label="달 그리기 캔버스. 원 안에서 밝게 보인 부분을 칠하세요."
        role="img"
        onPointerDown={(e) => {
          if (disabled) return;
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          paint(e);
        }}
        onPointerMove={(e) => {
          if (drawing.current && !disabled) paint(e);
        }}
        onPointerUp={() => {
          if (drawing.current) {
            drawing.current = false;
            commit();
          }
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      {!disabled ? (
        <div className="row" role="group" aria-label="그리기 도구">
          <button type="button" className={`btn btn--sm ${mode === 'paint' ? '' : 'btn--secondary'}`} onClick={() => setMode('paint')} aria-pressed={mode === 'paint'}>
            밝은 부분 칠하기
          </button>
          <button type="button" className={`btn btn--sm ${mode === 'erase' ? '' : 'btn--secondary'}`} onClick={() => setMode('erase')} aria-pressed={mode === 'erase'}>
            지우기
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>
            모두 지우기
          </button>
        </div>
      ) : null}
    </div>
  );
}
