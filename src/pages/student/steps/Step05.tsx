import { useEffect, useState } from 'react';
import { illuminatedFraction, normalizeDeg } from '@shared/phaseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { AssetSlot } from '@/components/AssetSlot';
import { PhaseDisk } from '@/components/PhaseDisk';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';

const STEP = 's05';

function Intro() {
  useScene(STEP, 's05-intro');
  const [state, setState] = useLabState('s05-intro', { theta: 60 });
  const rec = useSession((s) => s.getResponse('q05-intro-check'));
  const respond = useSession((s) => s.respond);
  const v = (rec?.latest as { moved?: boolean; rotated?: boolean; checked?: boolean } | undefined) ?? {};
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  useAutoComplete(STEP, 's05-intro', ['q05-intro-check'], Boolean(v.moved && v.rotated && v.checked));
  return (
    <div className="stack">
      <AssetSlot id="model-lab" />
      <p className="lead">
        화면에는 두 창이 있어요. <strong>우주 시점</strong>은 태양빛의 방향, 지구, 달의 궤도를 보여주고, <strong>지구 시점</strong>은 지구 부근 관찰자가 보는 달의 원반이에요.
      </p>
      <div className="grid-3">
        <div className="card card--stone">
          <span className="mono">1 · 달을 움직이기</span>
          <p style={{ margin: 0 }} className="caption">달(또는 반투명 손잡이)을 끌면 궤도를 따라 움직여요. 슬라이더나 화살표 키로도 같은 조작을 할 수 있어요. 아무 방향으로 날려 보내지는 않아요.</p>
        </div>
        <div className="card card--stone">
          <span className="mono">2 · 보는 방향 돌리기</span>
          <p style={{ margin: 0 }} className="caption">빈 공간을 끌면 카메라가 돌아요. 이것은 달을 움직이는 것과 달라서 오른쪽 창의 달 모양은 바뀌지 않아요.</p>
        </div>
        <div className="card card--stone">
          <span className="mono">3 · 지구에서 확인하기</span>
          <p style={{ margin: 0 }} className="caption">오른쪽 창에서 지구 관찰자가 보는 모양을 확인해요. ‘관측선’을 켜면 지구에서 달로 향하는 선이 보여요.</p>
        </div>
      </div>
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} onRendererChange={setRenderer}>
        <div className="card stack-sm" style={{ padding: 12 }}>
          <span className="mono">해 본 것에 표시하세요</span>
          {(
            [
              ['moved', '달을 움직여 봤어요'],
              ['rotated', '보는 방향을 돌려 봤어요(위에서/옆에서 보기 포함)'],
              ['checked', '지구 창에서 모양이 바뀌는 것을 확인했어요'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="row" style={{ gap: 6, fontSize: 'var(--fs-caption)' }}>
              <input type="checkbox" checked={Boolean(v[k])} onChange={(e) => respond('q05-intro-check', STEP, 's05-intro', { ...v, [k]: e.target.checked, renderer })} /> {label}
            </label>
          ))}
        </div>
      </ModelLab>
    </div>
  );
}

const TARGET_THETA = 270;
const PREDICT_OPTIONS = [45, 90, 180, 270];

function Predict() {
  useScene(STEP, 's05-predict');
  const [state, setState] = useLabState('s05-predict', { theta: 90 });
  const rec = useSession((s) => s.getResponse('q05-predict'));
  const respond = useSession((s) => s.respond);
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const chosen = (rec?.latest as { choice?: number } | undefined)?.choice;
  const reached = Math.abs(normalizeDeg(state.theta) - TARGET_THETA) <= 10;
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (chosen !== undefined && reached && !revealed) {
      setRevealed(true);
      saveAttempt({ id: newAttemptId('s05'), stepId: STEP, sceneId: 's05-predict', mode: 'phase', targetSource: 'app:theta-270', target: { theta: TARGET_THETA }, state, submitted: true, result: { reached: true, renderer, predicted: chosen, correct: chosen === TARGET_THETA }, hintsUsed: 0, isSandbox: false });
    }
  }, [chosen, reached, revealed, saveAttempt, state, renderer]);
  useAutoComplete(STEP, 's05-predict', ['q05-predict'], revealed);
  return (
    <div className="stack">
      <p className="lead">
        먼저 예측하세요. 달을 궤도의 <strong>270° 위치</strong>(태양 방향에서 4분의 3 바퀴, 슬라이더 270)로 옮기면 지구에서는 어떻게 보일까요?
      </p>
      <div className="row" role="radiogroup" aria-label="예측">
        {PREDICT_OPTIONS.map((t) => (
          <button key={t} type="button" className="choice" style={{ width: 'auto', flexDirection: 'column' }} role="radio" aria-checked={chosen === t} disabled={revealed} onClick={() => respond('q05-predict', STEP, 's05-predict', { choice: t, correct: t === TARGET_THETA })}>
            <PhaseDisk theta={t} size={72} hideName />
          </button>
        ))}
      </div>
      {chosen === undefined ? <p className="caption">예측을 고른 뒤 달을 옮겨 확인하세요.</p> : null}
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} target={{ theta: TARGET_THETA, label: '목표 위치 270° — 지구 창을 보고 예측과 비교하세요', hideName: true }} onRendererChange={setRenderer}>
        {revealed ? (
          <div className={`feedback ${chosen === TARGET_THETA ? '' : 'feedback--retry'}`}>
            <p style={{ margin: 0 }}>
              {chosen === TARGET_THETA ? '예측과 같아요.' : '예측과 달랐어요.'} 270° 위치에서는 원반의 {Math.round(illuminatedFraction(TARGET_THETA) * 100)}%가 밝고 <strong>왼쪽</strong>이 밝은 하현달로 보여요. 90°(상현)와 밝은 비율은 같지만 밝은 쪽이 반대예요. 왜 그런지 ‘밝은 면’과 ‘관측선’을 켜고 두 위치를 오가며 비교해 보세요.
            </p>
          </div>
        ) : (
          <p className="caption" style={{ color: '#fff' }}>{reached ? '도착했어요! 예측을 고르면 확인할 수 있어요.' : '달을 270° 근처로 옮기면 결과가 열려요.'}</p>
        )}
      </ModelLab>
    </div>
  );
}

export default function Step05({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's05-intro':
      return <Intro />;
    case 's05-predict':
      return <Predict />;
    default:
      return null;
  }
}
