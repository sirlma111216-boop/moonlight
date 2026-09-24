import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { illuminatedFraction, normalizeDeg } from '@shared/phaseMath';
import { judgeLunarEclipse, judgeSolarEclipse, localSolarEclipseView, PHYS } from '@shared/eclipseMath';
import type { ModelMode, ModelState } from '@shared/types';
import { usePrefs } from '@/store/prefs';
import { PhaseDisk } from '@/components/PhaseDisk';
import { litWords, positionNo } from '@/lib/words';
import { Fallback2D } from './Fallback2D';
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

/** 한 달 동안 살펴본 결과를 짧게 */
export const LUNAR_SHORT = { none: '안 일어남', penumbral: '옅은 그림자에만 살짝 들어감', partial: '부분 월식', total: '개기 월식' } as const;
export const SOLAR_SHORT = { none: '안 일어남', partial: '부분 일식', annular: '고리 모양 일식', total: '개기 일식' } as const;

/** 지금 모습의 결과를 문장으로 */
const LUNAR_SENTENCE = {
  none: '월식이 아니에요. 달이 지구 그림자 밖에 있어요.',
  penumbral: '달이 옅은 그림자에만 살짝 들어갔어요. 눈으로는 거의 티가 안 나요.',
  partial: '부분 월식이에요. 달의 일부가 지구의 진한 그림자에 들어갔어요.',
  total: '개기 월식이에요. 달 전체가 지구의 진한 그림자에 들어갔어요.',
} as const;
const SOLAR_SENTENCE = {
  none: '일식이 아니에요. 달 그림자가 지구에 닿지 않아요.',
  partial: '달 그림자가 지구의 일부에 닿아요. 그곳에서는 태양이 조금 가려져요.',
  annular: '달 그림자의 한가운데가 지구에 닿아요. 그곳에서는 태양 가운데가 가려지고 둘레가 고리처럼 남아요.',
  total: '달의 진한 그림자가 지구에 닿아요. 그곳에서는 태양이 완전히 가려져요.',
} as const;
const LOCAL_SENTENCE = {
  night: '그곳은 밤이라 태양이 보이지 않아요.',
  none: '그곳에서는 태양이 가려지지 않아요.',
  partial: '그곳에서는 태양이 조금 가려져요.',
  annular: '그곳에서는 태양 둘레가 고리처럼 남아요.',
  total: '그곳에서는 태양이 완전히 가려져요.',
} as const;

const PLACES = [
  { id: 'equator', label: '적도 근처, 한낮인 곳', lat: 0, lon: 0 },
  { id: 'north', label: '조금 북쪽인 곳', lat: 25, lon: 0 },
  { id: 'pole', label: '북극 가까운 곳', lat: 70, lon: 0 },
  { id: 'night', label: '지구 반대편 (밤인 곳)', lat: 0, lon: 180 },
] as const;

const VIEW_WORDS = {
  default: '우주에서 비스듬히 내려다보는 중',
  top: '우주에서 바로 위에서 내려다보는 중',
  side: '우주에서 옆으로 보는 중',
} as const;

export interface ModelLabProps {
  mode: ModelMode;
  state: ModelState;
  onChange: (s: ModelState) => void;
  /** 학생이 바꿀 수 있는 조작 */
  controls?: { theta?: boolean; inclination?: boolean; node?: boolean; observer?: boolean; play?: boolean };
  /** 오른쪽에 보여줄 목표 */
  target?: { theta?: number; drawingUrl?: string | null; label: string; hideName?: boolean };
  badges?: string[];
  children?: ReactNode;
  /** 자유 실험 단추 표시(모든 3D 화면에 고정, R3-4) */
  sandboxLink?: boolean;
  onRendererChange?: (r: '3d' | '2d') => void;
  height?: number;
  /** 모드 이름표 문구를 바꾼다 */
  modeLabel?: string;
  /** 1~8번 자리 표시 (기본: 달 모양 실험에서 켬) */
  marks?: boolean;
  /** 보는 자리를 마우스로 마음대로 돌리기 — 자유 실험에서만 */
  freeCamera?: boolean;
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
  return [
    r,
    (v) => {
      try {
        localStorage.setItem('ml:renderer', v);
      } catch {
        /* noop */
      }
      setPref(v);
    },
    ok,
  ];
}

export function ModelLab(props: ModelLabProps) {
  const { mode, state, onChange, controls = { theta: true }, target, badges = [], children, sandboxLink = true, height = 420, freeCamera = false } = props;
  const marks = props.marks ?? (mode === 'phase' || mode === 'sandbox');
  const lowGraphics = usePrefs((s) => s.lowGraphics);
  const reduceMotion = usePrefs((s) => s.reduceMotion);
  const [renderer, setRenderer, webglOk] = useRenderer();
  useEffect(() => props.onRendererChange?.(renderer), [renderer]); // eslint-disable-line react-hooks/exhaustive-deps
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function set(patch: Partial<ModelState>) {
    onChange({ ...state, ...patch });
  }
  const setTheta = (t: number) => set({ theta: normalizeDeg(t) });

  // '한 달 동안 돌려 보기' — 움직임 줄이기를 켜면 한 칸씩 건너뛴다
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (reduceMotion) {
        acc += dt;
        if (acc > 400) {
          acc = 0;
          onChange({ ...stateRef.current, theta: normalizeDeg(stateRef.current.theta + 45) });
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

  const k = illuminatedFraction(state.theta);
  const pos = positionNo(state.theta);
  const params = { theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude };
  const lunar = mode !== 'phase' ? judgeLunarEclipse(params) : null;
  const solar = mode !== 'phase' ? judgeSolarEclipse(params) : null;
  const local = state.observer && solar ? localSolarEclipseView(params, state.observer.lat, state.observer.lon) : null;
  const place = state.observer ? PLACES.find((p) => p.lat === state.observer!.lat && p.lon === state.observer!.lon) : null;

  const modeBadge =
    props.modeLabel ??
    (mode === 'phase' ? '달 모양 실험' : mode === 'eclipse-solar' ? '일식 실험' : mode === 'eclipse-lunar' ? '월식 실험' : mode === 'tilt' ? '달이 도는 길 기울이기 실험' : '자유 실험 중');

  return (
    <div className="lab" data-mode={mode}>
      <div className="stack-sm">
        <div
          className="lab__view"
          style={{ height, minHeight: height }}
          tabIndex={0}
          role="application"
          aria-label={`우주에서 본 모습. 지금 달은 ${pos}번 자리에 있어요. 화살표 키로 달을 옮길 수 있어요.`}
          onKeyDown={(e) => {
            if (controls.theta === false) return;
            const step = e.shiftKey ? 45 : 5;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setTheta(state.theta + step);
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setTheta(state.theta - step);
            }
          }}
        >
          {renderer === '3d' ? (
            <Suspense fallback={<div style={{ color: '#fff', padding: 16 }} className="caption">3D 모형을 불러오는 중…</div>}>
              <SpaceScene
                mode={mode}
                state={state}
                onTheta={setTheta}
                dragEnabled={controls.theta !== false}
                lowGraphics={lowGraphics}
                showEcliptic={mode === 'tilt' || mode === 'sandbox'}
                showNodeLine={mode === 'tilt' || (mode === 'sandbox' && state.inclination > 0)}
                showMarks={marks}
                freeCamera={freeCamera}
              />
            </Suspense>
          ) : (
            <Fallback2D mode={mode} state={state} onTheta={setTheta} size={Math.min(height - 24, 520)} />
          )}
          <div className="lab__badge">
            <span className={`chip ${mode === 'sandbox' && !props.modeLabel ? 'chip--coral' : 'chip--on-dark'}`}>{modeBadge}</span>
            <span className="chip chip--on-dark">크기와 거리는 실제와 달라요</span>
            {badges.map((b) => (
              <span key={b} className="chip chip--on-dark">
                {b}
              </span>
            ))}
          </div>
        </div>
        <div className="lab__controls">
          {renderer === '3d' ? <p className="lab__hint" style={{ margin: 0 }}>지금 보는 자리: {VIEW_WORDS[state.view]}{freeCamera ? ' · 빈 곳을 끌면 보는 자리가 돌아가요' : ''}</p> : null}
          {controls.theta !== false ? (
            <label>
              달 옮기기 <span className="mono mono--dark">지금 {pos}번 자리</span>
              <input type="range" min={0} max={359} step={1} value={Math.round(state.theta)} onChange={(e) => setTheta(Number(e.target.value))} aria-valuetext={`${pos}번 자리`} />
            </label>
          ) : null}
          {controls.inclination ? (
            <div>
              달이 도는 길의 기울기 <span className="mono mono--dark">{state.inclination < 0.05 ? '기울지 않음' : `약 ${Math.round(state.inclination)}도`}</span>
              <div className="row" style={{ marginTop: 4 }}>
                <button type="button" className="toggle" aria-pressed={state.inclination === 0} onClick={() => set({ inclination: 0 })}>
                  기울지 않게 (상상 실험)
                </button>
                <button type="button" className="toggle" aria-pressed={Math.abs(state.inclination - PHYS.realInclinationDeg) < 0.01} onClick={() => set({ inclination: PHYS.realInclinationDeg })}>
                  실제처럼 약 5도
                </button>
              </div>
            </div>
          ) : null}
          {controls.node ? (
            <label>
              주황색 선(두 길이 만나는 곳) 돌리기
              <input type="range" min={0} max={359} step={1} value={Math.round(state.nodeLongitude)} onChange={(e) => set({ nodeLongitude: Number(e.target.value) })} aria-valuetext="주황색 선의 방향" />
              <div className="row">
                <button type="button" className="toggle" aria-pressed={state.nodeLongitude === 0} onClick={() => set({ nodeLongitude: 0 })}>
                  태양 쪽을 향하게
                </button>
                <button type="button" className="toggle" aria-pressed={state.nodeLongitude === 90} onClick={() => set({ nodeLongitude: 90 })}>
                  태양과 엇갈리게
                </button>
              </div>
            </label>
          ) : null}
          {controls.observer ? (
            <div>
              지구에서 보는 곳 고르기
              <div className="row" style={{ marginTop: 4 }}>
                {PLACES.map((p) => (
                  <button key={p.id} type="button" className="toggle" aria-pressed={place?.id === p.id} onClick={() => set({ observer: { lat: p.lat, lon: p.lon } })}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="row" role="group" aria-label="보는 자리와 표시">
            <button type="button" className="toggle" aria-pressed={state.view === 'default'} onClick={() => set({ view: 'default' })}>
              비스듬히 보기
            </button>
            <button type="button" className="toggle" aria-pressed={state.view === 'top'} onClick={() => set({ view: 'top' })}>
              바로 위에서 보기
            </button>
            <button type="button" className="toggle" aria-pressed={state.view === 'side'} onClick={() => set({ view: 'side' })}>
              옆에서 보기
            </button>
            <button type="button" className="toggle" aria-pressed={state.showSightline} onClick={() => set({ showSightline: !state.showSightline })}>
              눈길 보기
            </button>
            <button type="button" className="toggle" aria-pressed={state.showLitSide} onClick={() => set({ showLitSide: !state.showLitSide })}>
              햇빛 받는 쪽 표시
            </button>
            {mode !== 'phase' ? (
              <button type="button" className="toggle" aria-pressed={state.showShadow} onClick={() => set({ showShadow: !state.showShadow })}>
                그림자 보기
              </button>
            ) : null}
            {controls.play ? (
              <button type="button" className="toggle" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
                {playing ? '멈추기' : '한 달 동안 돌려 보기'}
              </button>
            ) : null}
            {webglOk ? (
              <button type="button" className="toggle" onClick={() => setRenderer(renderer === '3d' ? '2d' : '3d')}>
                {renderer === '3d' ? '간단한 그림으로 보기' : '3D로 보기'}
              </button>
            ) : (
              <span className="chip chip--warn">이 기기에서는 3D를 쓸 수 없어서 간단한 그림으로 보여 줘요</span>
            )}
            {sandboxLink && mode !== 'sandbox' ? (
              <Link className="toggle" to="/learn/sandbox" style={{ textDecoration: 'none' }}>
                자유 실험
              </Link>
            ) : null}
          </div>
          <p className="lab__hint">
            달은 끌거나 막대를 밀어서 옮겨요. 화살표 키로도 옮길 수 있어요. ‘눈길 보기’를 켜면 지구의 나와 달을 잇는 선이 보이고, ‘햇빛 받는 쪽 표시’를 켜면 달에서 햇빛을 받는 절반이 노랗게 보여요.
          </p>
        </div>
      </div>
      <div className="lab__side">
        <div>
          <span className="mono mono--dark">{mode === 'eclipse-solar' ? '지구에서 태양 쪽을 올려다본 모습' : '지구에 있는 내가 본 달'}</span>
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
            왼쪽에서 보는 자리를 바꿔도 이 창의 달 모양은 그대로예요. 달을 옮길 때만 바뀌어요.
          </p>
        </div>
        <div className="caption" style={{ color: 'rgba(255,255,255,.88)' }}>
          {mode === 'phase' || mode === 'sandbox' ? (
            <>
              <div>달 전체에서 햇빛 받는 곳: 언제나 절반</div>
              <div>
                지구의 나에게는: <strong>{litWords(k)}</strong>
              </div>
            </>
          ) : null}
          {lunar && mode !== 'eclipse-solar' ? <div style={{ marginTop: 4 }}>{LUNAR_SENTENCE[lunar.kind]}</div> : null}
          {solar && mode !== 'eclipse-lunar' ? (
            <div style={{ marginTop: 4 }}>
              {SOLAR_SENTENCE[solar.kind]}
              {local && place ? (
                <div>
                  <strong>{place.label}</strong>: {LOCAL_SENTENCE[local]}
                </div>
              ) : null}
            </div>
          ) : null}
          {mode !== 'phase' ? <div className="lab__hint" style={{ marginTop: 4 }}>화면 속 크기와 거리는 보기 좋게 바꿨지만, 일식·월식이 일어나는지는 실제 크기로 따져서 알려 줘요.</div> : null}
        </div>
        {target ? (
          <div className="card" style={{ padding: 12 }}>
            <span className="mono">목표</span>
            <div className="row" style={{ alignItems: 'center' }}>
              {target.drawingUrl ? (
                <img src={target.drawingUrl} alt="내가 그린 달" style={{ width: 96, height: 96, borderRadius: '50%' }} />
              ) : target.theta !== undefined ? (
                <PhaseDisk theta={target.theta} size={96} hideName={target.hideName} />
              ) : null}
              <span className="caption">{target.label}</span>
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
