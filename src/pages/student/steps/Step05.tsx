import { useEffect, useState } from 'react';
import { normalizeDeg } from '@shared/phaseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { AssetSlot } from '@/components/AssetSlot';
import { PhaseDisk } from '@/components/PhaseDisk';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';
import { positionNo, thetaOfPosition } from '@/lib/words';

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
      <p className="lead">3D 모형에는 창이 두 개 있어요.</p>
      <ul style={{ marginTop: 0 }}>
        <li>
          <strong>왼쪽 큰 창</strong>은 우주에서 태양, 지구, 달을 한꺼번에 본 모습이에요.
        </li>
        <li>
          <strong>오른쪽 작은 창</strong>은 지구에 있는 ‘나’가 달을 올려다본 모습이에요.
        </li>
      </ul>
      <div className="grid-3">
        <div className="card card--stone">
          <span className="mono">1 · 달 옮기기</span>
          <p style={{ margin: 0 }} className="caption">
            달을 끌거나 아래 막대를 밀면, 달이 지구 둘레의 길을 따라 움직여요. 길 위에는 1번부터 8번까지 자리 번호가 있어요.
          </p>
        </div>
        <div className="card card--stone">
          <span className="mono">2 · 보는 자리 바꾸기</span>
          <p style={{ margin: 0 }} className="caption">
            ‘바로 위에서 보기’, ‘옆에서 보기’ 단추를 누르면 우주에서 보는 자리만 바뀌어요. 달은 그대로라서 오른쪽 창의 달 모양도 그대로예요.
          </p>
        </div>
        <div className="card card--stone">
          <span className="mono">3 · 지구에서 확인하기</span>
          <p style={{ margin: 0 }} className="caption">
            달을 옮긴 뒤 오른쪽 창을 보세요. ‘눈길 보기’를 켜면 지구의 나와 달을 잇는 선이 보여요.
          </p>
        </div>
      </div>
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} onRendererChange={setRenderer}>
        <div className="card stack-sm" style={{ padding: 12 }}>
          <span className="mono">해 본 것에 표시하세요</span>
          {(
            [
              ['moved', '달을 옮겨 봤어요'],
              ['rotated', '‘바로 위에서 보기’와 ‘옆에서 보기’를 눌러 봤어요'],
              ['checked', '달을 옮기면 오른쪽 창의 달 모양이 바뀌는 것을 봤어요'],
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

const TARGET_POS = 7;
const TARGET_THETA = thetaOfPosition(TARGET_POS);
const PREDICT_OPTIONS = [2, 3, 5, 7].map(thetaOfPosition);

function Predict() {
  useScene(STEP, 's05-predict');
  const [state, setState] = useLabState('s05-predict', { theta: 90 });
  const rec = useSession((s) => s.getResponse('q05-predict'));
  const respond = useSession((s) => s.respond);
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const chosen = (rec?.latest as { choice?: number } | undefined)?.choice;
  const reached = Math.abs(normalizeDeg(state.theta) - TARGET_THETA) <= 12;
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (chosen !== undefined && reached && !revealed) {
      setRevealed(true);
      saveAttempt({ id: newAttemptId('s05'), stepId: STEP, sceneId: 's05-predict', mode: 'phase', targetSource: 'app:position-7', target: { theta: TARGET_THETA }, state, submitted: true, result: { reached: true, renderer, predicted: chosen, correct: chosen === TARGET_THETA }, hintsUsed: 0, isSandbox: false });
    }
  }, [chosen, reached, revealed, saveAttempt, state, renderer]);
  useAutoComplete(STEP, 's05-predict', ['q05-predict'], revealed);
  return (
    <div className="stack">
      <p className="lead">
        먼저 예측해 보세요. 달을 <strong>{TARGET_POS}번 자리</strong>로 옮기면, 지구에 있는 나에게는 어떤 모양으로 보일까요?
      </p>
      <div className="row" role="radiogroup" aria-label="예측">
        {PREDICT_OPTIONS.map((t, i) => (
          <button key={t} type="button" className="choice" style={{ width: 'auto', flexDirection: 'column', alignItems: 'center' }} role="radio" aria-checked={chosen === t} disabled={revealed} onClick={() => respond('q05-predict', STEP, 's05-predict', { choice: t, correct: t === TARGET_THETA })}>
            <PhaseDisk theta={t} size={72} hideName />
            <span className="micro">{['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'][i]}</span>
          </button>
        ))}
      </div>
      {chosen === undefined ? <p className="caption">예측을 고른 다음, 아래 모형에서 달을 {TARGET_POS}번 자리로 옮겨 확인하세요.</p> : null}
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} onRendererChange={setRenderer}>
        {revealed ? (
          <div className={`feedback ${chosen === TARGET_THETA ? '' : 'feedback--retry'}`}>
            <p style={{ margin: 0 }}>
              {chosen === TARGET_THETA ? '예측이 맞았어요.' : '예측과 달랐어요.'} {TARGET_POS}번 자리에서는 <strong>왼쪽 반쪽</strong>이 밝은 반달로 보여요. 3번 자리도 반달이지만 밝은 쪽이 오른쪽이에요. 왜 그런지 ‘햇빛 받는 쪽 표시’와 ‘눈길 보기’를 켜고 3번과 7번 자리를 오가며 비교해 보세요.
            </p>
          </div>
        ) : (
          <p className="caption" style={{ color: '#fff' }}>
            {reached ? `${TARGET_POS}번 자리에 왔어요. 위에서 예측을 고르면 결과를 볼 수 있어요.` : `지금 ${positionNo(state.theta)}번 자리예요. 달을 ${TARGET_POS}번 자리까지 옮겨 보세요.`}
          </p>
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
