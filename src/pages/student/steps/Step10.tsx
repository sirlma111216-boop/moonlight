import { useState } from 'react';
import { Link } from 'react-router';
import { judgeLunarEclipse, judgeSolarEclipse } from '@shared/eclipseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { VideoSlot } from '@/components/VideoSlot';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';

const STEP = 's10';

function Solar() {
  useScene(STEP, 's10-solar');
  const bundle = useSession((s) => s.bundle)!;
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s10-solar', { theta: 150, inclination: 0, nodeLongitude: 0, showShadow: true, observer: { lat: 25, lon: 0 } });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const attempt = bundle.attempts.find((a) => a.stepId === STEP && a.sceneId === 's10-solar' && a.submitted);
  const solar = judgeSolarEclipse({ theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude });
  const aligned = solar.kind !== 'none';
  const predicted = Boolean(useSession((s) => s.getResponse('q10-solar-predict')));
  useAutoComplete(STEP, 's10-solar', ['q10-solar-predict', 'q10-solar-explain'], Boolean(attempt));
  return (
    <div className="stack">
      <p className="lead">
        <strong>일식 실험</strong>이에요. 순서는 ‘예측하기 → 옮기기 → 살펴보기 → 설명하기’예요.
      </p>
      <p>
        태양, 달, 지구가 이 순서로 한 줄로 늘어서도록 달을 옮겨요. 그러면 달의 그림자가 지구에 닿아요. 지구의 여러 곳을 골라 보면서, 같은 때에도 곳마다 다르게 보이는지 살펴보세요.
      </p>
      <ChoiceQuestion
        qid="q10-solar-predict"
        stepId={STEP}
        sceneId="s10-solar"
        prompt="예측: 달 그림자가 지구에 닿으면, 지구 어디에서나 똑같은 일식이 보일까요?"
        options={[
          { id: 'everywhere', label: '지구 어디에서나 똑같이 보인다', correct: false, feedback: '모형에서 ‘지구에서 보는 곳’을 바꿔 보세요. 달 그림자는 지구의 일부에만 닿아요.' },
          { id: 'partial', label: '그림자가 닿는 곳에서만 보이고, 곳마다 다르게 보인다', correct: true, feedback: '모형에서 보는 곳을 바꾸면서 결과 문장이 어떻게 바뀌는지 확인해 보세요.' },
          { id: 'night', label: '밤인 곳에서 더 잘 보인다', correct: false, feedback: '일식은 낮에 달이 태양을 가리는 일이에요. 밤인 곳에서는 태양이 보이지 않아요.' },
        ]}
      />
      {predicted ? (
        <ModelLab mode="eclipse-solar" state={state} onChange={setState} controls={{ theta: true, observer: true }} onRendererChange={setRenderer}>
          <div className="card stack-sm" style={{ padding: 12 }}>
            <span className="caption">{aligned ? '한 줄로 늘어섰어요. 이제 지구에서 보는 곳을 바꿔 가며 무엇이 달라지는지 보세요.' : '달을 태양과 지구 사이(1번 자리 근처)로 옮겨 보세요.'}</span>
            <button type="button" className="btn btn--sm" disabled={!aligned} onClick={() => saveAttempt({ id: attempt?.id ?? newAttemptId('s10s'), stepId: STEP, sceneId: 's10-solar', mode: 'eclipse-solar', targetSource: 'app:solar', target: { kind: 'solar' }, state, submitted: true, result: { solar, renderer }, hintsUsed: 0, isSandbox: false })}>
              이 모습을 제출
            </button>
            {attempt ? <span className="chip chip--green">제출함</span> : null}
          </div>
        </ModelLab>
      ) : (
        <p className="caption">예측을 먼저 고르면 모형이 열려요.</p>
      )}
      {attempt ? <TextQuestion qid="q10-solar-explain" stepId={STEP} sceneId="s10-solar" prompt="설명: 일식이 일어날 때 태양, 달, 지구는 어떻게 늘어서나요? 그리고 지구의 어느 곳에서 보느냐에 따라 무엇이 달랐나요?" rows={3} /> : null}
      <details className="more">
        <summary>더 알아보기: 개기 일식, 고리 모양 일식, 부분 일식</summary>
        <div>
          달의 진한 그림자가 닿는 좁은 곳에서는 태양이 완전히 가려져요. 이것을 개기 일식이라고 해요. 달이 조금 멀리 있을 때는 태양 가운데만 가려지고 둘레가 고리처럼 남아요. 옅은 그림자만 닿는 넓은 곳에서는 태양이 조금만 가려져요. 이 모형은 이해를 돕기 위한 것이라, 실제 일식이 일어날 날짜를 알려 주지는 않아요.
        </div>
      </details>
    </div>
  );
}

function Lunar() {
  useScene(STEP, 's10-lunar');
  const bundle = useSession((s) => s.bundle)!;
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s10-lunar', { theta: 120, inclination: 0, nodeLongitude: 0, showShadow: true });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const attempt = bundle.attempts.find((a) => a.stepId === STEP && a.sceneId === 's10-lunar' && a.submitted);
  const lunar = judgeLunarEclipse({ theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude });
  const inside = lunar.kind !== 'none';
  const predicted = Boolean(useSession((s) => s.getResponse('q10-lunar-predict')));
  useAutoComplete(STEP, 's10-lunar', ['q10-lunar-predict', 'q10-lunar-explain'], Boolean(attempt));
  return (
    <div className="stack">
      <p className="lead">
        <strong>월식 실험</strong>이에요. 태양, 지구, 달이 이 순서로 한 줄로 늘어서도록 달을 옮겨요.
      </p>
      <p>지구 뒤쪽으로는 지구의 그림자가 길게 뻗어 있어요. 달을 그 그림자 안으로 넣었다 뺐다 해 보세요. 오른쪽 창에서 달이 어떻게 보이는지도 함께 보세요.</p>
      <ChoiceQuestion
        qid="q10-lunar-predict"
        stepId={STEP}
        sceneId="s10-lunar"
        prompt="예측: 보름달이 지구 그림자 속으로 들어가면, 지구에서는 어떻게 보일까요?"
        options={[
          { id: 'crescent', label: '초승달처럼 한쪽만 가늘게 밝게 보인다', correct: false, feedback: '모형에서 직접 확인해 보세요. 그림자에 들어간 부분의 모양은 초승달의 어두운 부분과 달라요.' },
          { id: 'dark', label: '밝던 보름달이, 그림자에 들어간 만큼 어두워진다', correct: true, feedback: '들어간 부분이 어두워지고, 다 들어가면 달 전체가 어두워져요. 모형에서 확인한 뒤, 초승달의 어두운 부분과 어떻게 다른지 설명해 보세요.' },
          { id: 'nothing', label: '아무 변화가 없다', correct: false, feedback: '달은 스스로 빛을 내지 못해요. 지구가 햇빛을 막으면 달이 어두워지는지 모형에서 확인해 보세요.' },
        ]}
      />
      {predicted ? (
        <ModelLab mode="eclipse-lunar" state={state} onChange={setState} controls={{ theta: true }} onRendererChange={setRenderer}>
          <div className="card stack-sm" style={{ padding: 12 }}>
            <span className="caption">{inside ? '달이 지구 그림자 속에 들어갔어요. 오른쪽 창에서 달이 어두워진 것을 보세요.' : '달을 태양 반대편(5번 자리 근처)으로 옮겨 보세요.'}</span>
            <button type="button" className="btn btn--sm" disabled={!inside} onClick={() => saveAttempt({ id: attempt?.id ?? newAttemptId('s10l'), stepId: STEP, sceneId: 's10-lunar', mode: 'eclipse-lunar', targetSource: 'app:lunar', target: { kind: 'lunar' }, state, submitted: true, result: { lunar, renderer }, hintsUsed: 0, isSandbox: false })}>
              이 모습을 제출
            </button>
            {attempt ? <span className="chip chip--green">제출함</span> : null}
          </div>
        </ModelLab>
      ) : (
        <p className="caption">예측을 먼저 고르면 모형이 열려요.</p>
      )}
      {attempt ? <TextQuestion qid="q10-lunar-explain" stepId={STEP} sceneId="s10-lunar" prompt="설명: 월식 때 어두운 부분과 초승달의 어두운 부분은 무엇이 다른가요? 달이 있는 자리와 햇빛으로 설명해 보세요." rows={3} /> : null}
      <details className="more">
        <summary>더 알아보기: 월식 때 달이 붉게 보이는 까닭</summary>
        <div>햇빛 중 일부는 지구의 공기를 지나면서 꺾여 그림자 속까지 들어가요. 이때 붉은 빛이 더 많이 남아서, 그림자 속 달이 붉게 보일 수 있어요. 모형 속 달의 색은 이것을 흉내 낸 그림이에요.</div>
      </details>
    </div>
  );
}

const ORDER = [
  { id: 'sme', label: '태양 - 달 - 지구' },
  { id: 'sem', label: '태양 - 지구 - 달' },
  { id: 'mse', label: '달 - 태양 - 지구' },
];
const BODY = [
  { id: 'moon', label: '달' },
  { id: 'earth', label: '지구' },
  { id: 'sun', label: '태양' },
];
const PHASE = [
  { id: 'new', label: '삭' },
  { id: 'full', label: '보름달' },
  { id: 'quarter', label: '상현달·하현달' },
];
const COLS = { order: '늘어선 순서', blocker: '햇빛을 가리는 것', target: '그림자가 생기는 곳', phase: '그때의 달' } as const;

function Table() {
  useScene(STEP, 's10-table');
  const respond = useSession((s) => s.respond);
  const saved = useSession((s) => s.getResponse('q10-table'))?.latest as Record<string, Record<string, string>> | undefined;
  const [v, setV] = useState<Record<string, Record<string, string>>>(saved ?? { solar: {}, lunar: {} });
  const answer = { solar: { order: 'sme', blocker: 'moon', target: 'earth', phase: 'new' }, lunar: { order: 'sem', blocker: 'earth', target: 'moon', phase: 'full' } } as const;
  const complete = (['solar', 'lunar'] as const).every((k) => ['order', 'blocker', 'target', 'phase', 'diff'].every((c) => v[k]?.[c]?.trim()));
  const [checked, setChecked] = useState(Boolean(saved));
  useAutoComplete(STEP, 's10-table', ['q10-table']);
  function set(row: 'solar' | 'lunar', col: string, val: string) {
    setV((p) => ({ ...p, [row]: { ...p[row], [col]: val } }));
    setChecked(false);
  }
  const correct = (row: 'solar' | 'lunar', col: keyof (typeof answer)['solar']) => v[row]?.[col] === answer[row][col];
  return (
    <div className="stack">
      <p className="lead">두 실험을 표로 정리해요.</p>
      <p className="caption">삭이라고 꼭 일식이 일어나지는 않고, 보름달이라고 꼭 월식이 일어나지도 않아요. 왜 그런지는 11단계에서 알아봐요.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">무슨 일?</th>
              {Object.values(COLS).map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
              <th scope="col">보통 달 모양이 바뀌는 것과 다른 점</th>
            </tr>
          </thead>
          <tbody>
            {(['solar', 'lunar'] as const).map((row) => (
              <tr key={row}>
                <th scope="row">{row === 'solar' ? '일식' : '월식'}</th>
                {(
                  [
                    ['order', ORDER],
                    ['blocker', BODY],
                    ['target', BODY],
                    ['phase', PHASE],
                  ] as const
                ).map(([col, opts]) => (
                  <td key={col}>
                    <select className="select" value={v[row]?.[col] ?? ''} onChange={(e) => set(row, col, e.target.value)} aria-label={`${row === 'solar' ? '일식' : '월식'}: ${COLS[col]}`} style={checked ? { borderColor: correct(row, col) ? 'var(--c-success)' : 'var(--c-error)' } : undefined}>
                      <option value="">고르기</option>
                      {opts.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
                <td>
                  <input className="input" value={v[row]?.diff ?? ''} onChange={(e) => set(row, 'diff', e.target.value)} placeholder="한 문장" aria-label={`${row === 'solar' ? '일식' : '월식'}: 다른 점`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={!complete}
          onClick={() => {
            const allCorrect = (['solar', 'lunar'] as const).every((r) => (['order', 'blocker', 'target', 'phase'] as const).every((c) => correct(r, c)));
            respond('q10-table', STEP, 's10-table', { ...v, correct: allCorrect });
            setChecked(true);
          }}
        >
          표 확인하기
        </button>
        {checked ? <span className="caption">빨간 테두리 칸은 다시 살펴볼 곳이에요. 앞의 실험으로 돌아가 확인하고 고쳐도 돼요.</span> : null}
      </div>
      <p className="caption">
        9단계에서 한 예측을 고치고 싶다면 <Link to="/learn/s09/s09-classify">9단계로</Link> 돌아가세요. 처음 예측도 함께 남아 있어요.
      </p>
    </div>
  );
}

function Videos() {
  useScene(STEP, 's10-videos');
  return (
    <div className="stack">
      <div className="note note--warn">
        <strong>안전 약속:</strong> 진짜 일식을 볼 때 태양을 맨눈으로 보거나, 태양 보기용 필터가 없는 망원경·쌍안경으로 보면 눈을 다쳐요. 이 수업의 일식 활동은 교실 안 모형으로만 해요.
      </div>
      <VideoSlot id="video-solar-role" stepId={STEP} sceneId="s10-videos" />
      <VideoSlot id="video-lunar" stepId={STEP} sceneId="s10-videos" />
    </div>
  );
}

export default function Step10({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's10-solar':
      return <Solar />;
    case 's10-lunar':
      return <Lunar />;
    case 's10-table':
      return <Table />;
    case 's10-videos':
      return <Videos />;
    default:
      return null;
  }
}
