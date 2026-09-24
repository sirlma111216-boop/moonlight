import type { ModelMode, ModelState } from '@shared/types';
import { OrbitSchematic } from '@/components/OrbitSchematic';
import { positionNo } from '@/lib/words';

/**
 * 3D(WebGL)를 쓸 수 없을 때의 간단한 그림. 같은 계산(shared/*)을 쓰지만
 * 기록에는 renderer='2d' 로 남아 '3D 조작'과 구분된다.
 */
export function Fallback2D({ mode, state, onTheta, size = 420 }: { mode: ModelMode; state: ModelState; onTheta: (t: number) => void; size?: number }) {
  return (
    <div className="lab__view" style={{ display: 'grid', placeItems: 'center', padding: 12 }}>
      <OrbitSchematic
        theta={state.theta}
        inclination={state.inclination}
        nodeLongitude={state.nodeLongitude}
        size={size}
        showSightline={state.showSightline}
        showShadow={state.showShadow && mode !== 'phase'}
        interactive={{ onTheta }}
        label={`위에서 내려다본 간단한 그림. 지금 달은 ${positionNo(state.theta)}번 자리에 있어요. 달을 끌거나 화살표 키로 옮기세요.`}
      />
      <div className="lab__badge">
        <span className="chip chip--on-dark">간단한 그림</span>
      </div>
    </div>
  );
}
