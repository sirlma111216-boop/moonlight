import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { illuminatedFraction, normalizeDeg, PHASE_LABEL_KO, phaseName, WHOLE_SURFACE_LIT_FRACTION } from '@shared/phaseMath';
import { judgeLunarEclipse, judgeSolarEclipse, localSolarEclipseView, PHYS } from '@shared/eclipseMath';
import type { ModelMode, ModelState } from '@shared/types';
import { usePrefs } from '@/store/prefs';
import { PhaseDisk } from '@/components/PhaseDisk';
import { Fallback2D } from './Fallback2D';
import { DISPLAY } from './lighting';
import { webglAvailable } from './webgl';

const SpaceScene = lazy(() => import('./SpaceScene').then((m) => ({ default: m.SpaceScene })));
const EarthViewScene = lazy(() => import('./EarthViewScene').then((m) => ({ default: m.EarthViewScene })));

export const DEFAULT_STATE: ModelState = {
  theta: 60,
  inclination: 0,
  nodeLongitude: 0,
  view: 'default',
  showSightline: false,
  showLitSide: false,
  showShadow: false,
  observer: null,
};

export const LUNAR_KIND_KO = { none: '없음', penumbral: '반그림자 월식', partial: '부분 월식', total: '개기 월식' } as const;
export const SOLAR_KIND_KO = { none: '없음', partial: '부분 일식(지구 일부)', annular: '중심식 — 금환(평균 거리 기준)', total: '중심식 — 개기' } as const;
export const LOCAL_KO = { night: '밤이라 태양이 안 보임', none: '식 없음', partial: '부분 일식', annular: '금환 일식', total: '개기 일식' } as const;

export interface ModelLabProps {
  mode: ModelMode;
  state: ModelState;
  onChange: (s: ModelState) => void;
  /** 학생이 바꿀 수 있는 조작 */
  controls?: { theta?: boolean; inclination?: boolean; node?: boolean; observer?: boolean; play?: boolean };
  /** 오른쪽 위에 보여줄 목표 */
  target?: { theta?: number; drawingUrl?: string | null; label: string; hideName?: boolean };
  badges?: string[];
  children?: ReactNode;
  /** 자유 실험 버튼 표시(모든 3D 화면 고정, R3-4) */
  sandboxLink?: boolean;
  onRendererChange?: (r: '3d' | '2d') => void;
  height?: number;
  /** 모드 배지 문구를 바꾼다(예: 미션 검증에서 '자유 실험 중' 대신) */
  modeLabel?: string;
}

export function useRenderer(): ['3d' | '2d', (r: '3d' | '2d') => void, boolean] {
  const [pref, setPref] = useState<'3d' | '2d'>(() => {
    try {
      return (localStorage.getItem('ml:renderer') as '3d' | '2d') || '3d';
    } catch {
      return '3d';
    }
  });
  const ok = webglAvailable();
  const r: '3d' | '2d' = ok && pref === '3d' ? '3d' : '2d';
  return [r, (v) => { try { localStorage.setItem('ml:renderer', v); } catch { /* noop */ } setPref(v); }, ok];
}

export function ModelLab(props: ModelLabProps) {
  const { mode, state, onChange, controls = { theta: true }, target, badges = [], children, sandboxLink = true, height = 420 } = props;
  const lowGraphics = usePrefs((s) => s.lowGraphics);
  const reduceMotion = usePrefs((s) => s.reduceMotion);
  const [renderer, setRenderer, webglOk] = useRenderer();
  useEffect(() => props.onRendererChange?.(renderer), [renderer]); // eslint-disable-line react-hooks/exhaustive-deps
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const S = mode === 'phase' || mode === 'sandbox' ? DISPLAY.phase : DISPLAY.eclipse;

  function set(patch: Partial<ModelState>) {
    onChange({ ...state, ...patch });
  }
  const setTheta = (t: number) => set({ theta: normalizeDeg(t) });

  // '한 달 돌려보기' — 움직임 줄이기면 12단계로 뛰어넘는다
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (reduceMotion) {
        acc += dt;
        if (acc > 350) {
          acc = 0;
          onChange({ ...stateRef.current, theta: normalizeDeg(stateRef.current.theta + 30) });
        }
      } else {
        onChange({ ...stateRef.current, theta: normalizeDeg(stateRef.current.theta + dt * 0.045) });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
  const stateRef = useRef(state);
  stateRef.current = state;

  const k = illuminatedFraction(state.theta);
  const name = PHASE_LABEL_KO[phaseName(state.theta)];
  const params = { theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude };
  const lunar = mode !== 'phase' ? judgeLunarEclipse(params) : null;
  const solar = mode !== 'phase' ? judgeSolarEclipse(params) : null;
  const local = state.observer && solar ? localSolarEclipseView(params, state.observer.lat, state.observer.lon) : null;

  const modeBadge =
    props.modeLabel ?? (mode === 'phase' ? '위상 모형 (식 현상 제외)' : mode === 'eclipse-solar' ? '식 모형 — 일식' : mode === 'eclipse-lunar' ? '식 모형 — 월식' : mode === 'tilt' ? '식 모형 — 기울기 실험' : '자유 실험 중');

  return (
    <div className="lab" data-mode={mode}>
      <div className="stack-sm">
        <div
          className="lab__view"
          style={{ height, minHeight: height }}
          tabIndex={0}
          role="application"
          aria-label="우주 시점. 달을 끌어 궤도를 따라 옮기거나 화살표 키로 조정하세요. 마우스 오른쪽/두 손가락으로 보는 방향을 돌립니다."
          onKeyDown={(e) => {
            if (!controls.theta) return;
            const step = e.shiftKey ? 15 : 3;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setTheta(state.theta + step); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setTheta(state.theta - step); }
          }}
        >
          {renderer === '3d' ? (
            <Suspense fallback={<div style={{ color: '#fff', padding: 16 }} className="caption">3D 모형을 불러오는 중…</div>}>
              <SpaceScene mode={mode} state={state} onTheta={setTheta} dragEnabled={controls.theta !== false} lowGraphics={lowGraphics} showEcliptic={mode === 'tilt' || mode === 'sandbox'} showNodeLine={mode === 'tilt' || (mode === 'sandbox' && state.inclination > 0)} />
            </Suspense>
          ) : (
            <Fallback2D mode={mode} state={state} onTheta={setTheta} size={Math.min(height - 24, 520)} />
          )}
          <div className="lab__badge">
            <span className={`chip ${mode === 'sandbox' ? 'chip--coral' : 'chip--on-dark'}`}>{modeBadge}</span>
            <span className="chip chip--on-dark">축척: {S.note}</span>
            {badges.map((b) => (
              <span key={b} className="chip chip--on-dark">
                {b}
              </span>
            ))}
          </div>
        </div>
        <div className="lab__controls">
          {controls.theta !== false ? (
            <label>
              달 위치(궤도 각도) <span className="mono mono--dark">{Math.round(state.theta)}°</span>
              <input type="range" min={0} max={359} step={1} value={Math.round(state.theta)} onChange={(e) => setTheta(Number(e.target.value))} aria-valuetext={`${Math.round(state.theta)}도, ${name}`} />
            </label>
          ) : null}
          {controls.inclination ? (
            <label>
              궤도면 기울기 <span className="mono mono--dark">{state.inclination.toFixed(1)}°</span>
              <input type="range" min={0} max={10} step={0.1} value={state.inclination} onChange={(e) => set({ inclination: Number(e.target.value) })} />
              <div className="row">
                <button type="button" className="toggle" aria-pressed={state.inclination === 0} onClick={() => set({ inclination: 0 })}>0° (가상)</button>
                <button type="button" className="toggle" aria-pressed={Math.abs(state.inclination - PHYS.realInclinationDeg) < 0.01} onClick={() => set({ inclination: PHYS.realInclinationDeg })}>5.1° (실제에 가까움)</button>
              </div>
            </label>
          ) : null}
          {controls.node ? (
            <label>
              두 궤도면이 만나는 방향(교선) <span className="mono mono--dark">{Math.round(state.nodeLongitude)}°</span>
              <input type="range" min={0} max={359} step={1} value={Math.round(state.nodeLongitude)} onChange={(e) => set({ nodeLongitude: Number(e.target.value) })} />
              <div className="row">
                <button type="button" className="toggle" aria-pressed={state.nodeLongitude === 0} onClick={() => set({ nodeLongitude: 0 })}>태양 방향과 나란히</button>
                <button type="button" className="toggle" aria-pressed={state.nodeLongitude === 90} onClick={() => set({ nodeLongitude: 90 })}>태양 방향과 직각</button>
              </div>
            </label>
          ) : null}
          {controls.observer ? (
            <div className="row" style={{ alignItems: 'end' }}>
              <label style={{ flex: 1 }}>
                관측 지점 위도 <span className="mono mono--dark">{state.observer?.lat ?? 0}°</span>
                <input type="range" min={-80} max={80} step={5} value={state.observer?.lat ?? 0} onChange={(e) => set({ observer: { lat: Number(e.target.value), lon: state.observer?.lon ?? 0 } })} />
              </label>
              <label style={{ flex: 1 }}>
                경도(0° = 정오) <span className="mono mono--dark">{state.observer?.lon ?? 0}°</span>
                <input type="range" min={-180} max={180} step={5} value={state.observer?.lon ?? 0} onChange={(e) => set({ observer: { lat: state.observer?.lat ?? 0, lon: Number(e.target.value) } })} />
              </label>
            </div>
          ) : null}
          <div className="row" role="group" aria-label="보기와 표시">
            <button type="button" className="toggle" aria-pressed={state.view === 'default'} onClick={() => set({ view: 'default' })}>처음 위치</button>
            <button type="button" className="toggle" aria-pressed={state.view === 'top'} onClick={() => set({ view: 'top' })}>위에서 보기</button>
            <button type="button" className="toggle" aria-pressed={state.view === 'side'} onClick={() => set({ view: 'side' })}>옆에서 보기</button>
            <button type="button" className="toggle" aria-pressed={state.showSightline} onClick={() => set({ showSightline: !state.showSightline })}>관측선</button>
            <button type="button" className="toggle" aria-pressed={state.showLitSide} onClick={() => set({ showLitSide: !state.showLitSide })}>밝은 면</button>
            {mode !== 'phase' ? <button type="button" className="toggle" aria-pressed={state.showShadow} onClick={() => set({ showShadow: !state.showShadow })}>그림자</button> : null}
            {controls.play ? <button type="button" className="toggle" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>{playing ? '멈추기' : '한 달 돌려보기'}</button> : null}
            {webglOk ? <button type="button" className="toggle" onClick={() => setRenderer(renderer === '3d' ? '2d' : '3d')}>{renderer === '3d' ? '2D로 보기' : '3D로 보기'}</button> : <span className="chip chip--warn">이 기기는 WebGL 을 지원하지 않아 2D 대체 화면을 보여줘요</span>}
            {sandboxLink && mode !== 'sandbox' ? (
              <Link className="toggle" to="/learn/sandbox" style={{ textDecoration: 'none' }}>
                자유 실험
              </Link>
            ) : null}
          </div>
          <p className="lab__hint">달을 움직이기(끌기·슬라이더·화살표 키) / 보는 방향 돌리기(빈 곳 끌기) / 지구에서 확인하기(오른쪽 창)는 서로 다른 조작이에요.</p>
        </div>
      </div>
      <div className="lab__side">
        <div>
          <span className="mono mono--dark">지구에서 보기</span>
          <div className="lab__earth">
            {renderer === '3d' ? (
              <Suspense fallback={null}>
                <EarthViewScene mode={mode} state={state} lowGraphics={lowGraphics} />
              </Suspense>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                <PhaseDisk theta={state.theta} size={150} hideName />
              </div>
            )}
          </div>
          <p className="lab__hint" style={{ marginTop: 6 }}>
            우주 시점의 카메라를 돌려도 이 창의 위상은 바뀌지 않아요. 지구 관측 방향을 단순화한 모형이에요(위쪽 = 북쪽).
          </p>
        </div>
        <div className="caption" style={{ color: 'rgba(255,255,255,.85)' }}>
          {mode === 'phase' || mode === 'sandbox' ? (
            <>
              달 전체 표면의 밝은 비율 <strong>{Math.round(WHOLE_SURFACE_LIT_FRACTION * 100)}%</strong> · 지구에서 보이는 원반의 밝은 비율 <strong>{Math.round(k * 100)}%</strong>
            </>
          ) : null}
          {lunar && mode !== 'eclipse-solar' ? (
            <div>
              월식 판정: <strong>{LUNAR_KIND_KO[lunar.kind]}</strong>
              {lunar.behindEarth ? ` (달–그림자 축 거리 ${Math.round(lunar.offsetKm).toLocaleString()} km, 본그림자 반지름 ${Math.round(lunar.umbraRadiusKm).toLocaleString()} km)` : ' — 달이 지구 그림자 쪽에 있지 않음'}
            </div>
          ) : null}
          {solar && mode !== 'eclipse-lunar' ? (
            <div>
              일식 판정: <strong>{SOLAR_KIND_KO[solar.kind]}</strong>
              {local ? (
                <>
                  {' '}
                  · 관측 지점에서는 <strong>{LOCAL_KO[local]}</strong>
                </>
              ) : null}
            </div>
          ) : null}
          <div className="lab__hint">판정은 실제 크기(km)로 계산하며 화면의 과장된 크기와 무관해요. 평균 거리 기준의 개념 모형이며 실제 식 예보가 아니에요.</div>
        </div>
        {target ? (
          <div className="card" style={{ padding: 12 }}>
            <span className="mono">목표</span>
            <div className="row" style={{ alignItems: 'center' }}>
              {target.drawingUrl ? <img src={target.drawingUrl} alt="내가 그린 달" style={{ width: 96, height: 96, borderRadius: '50%' }} /> : target.theta !== undefined ? <PhaseDisk theta={target.theta} size={96} hideName={target.hideName} /> : null}
              <span className="caption">{target.label}</span>
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
