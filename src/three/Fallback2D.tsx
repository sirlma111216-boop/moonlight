import type { ModelMode, ModelState } from '@shared/types';
import { OrbitSchematic } from '@/components/OrbitSchematic';

/**
 * WebGL 을 쓸 수 없을 때의 2D 대체 활동. 같은 각도·같은 계산(shared/*)을 쓰지만
 * 기록에는 renderer='2d' 로 남아 '3D 조작 완료'와 구분된다.
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
        label="위에서 본 배치(2D 대체 화면). 달을 끌거나 화살표 키로 옮기세요."
      />
      <div className="lab__badge">
        <span className="chip chip--on-dark">2D 대체 화면</span>
      </div>
    </div>
  );
}
