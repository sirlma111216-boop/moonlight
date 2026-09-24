import { useState } from 'react';
import { Link } from 'react-router';
import { judgeLunarEclipse, judgeSolarEclipse } from '@shared/eclipseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { VideoSlot } from '@/components/VideoSlot';
import { Term } from '@/components/Term';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';

const STEP = 's10';

function Solar() {
  useScene(STEP, 's10-solar');
  const bundle = useSession((s) => s.bundle)!;
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s10-solar', { theta: 150, inclination: 0, nodeLongitude: 0, showShadow: true, observer: { lat: 35, lon: 0 } });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const attempt = bundle.attempts.find((a) => a.stepId === STEP && a.sceneId === 's10-solar' && a.submitted);
  const solar = judgeSolarEclipse({ theta: state.theta, inclination: state.inclination, nodeLongitude: state.nodeLongitude });
  const aligned = solar.kind !== 'none';
  const predicted = Boolean(useSession((s) => s.getResponse('q10-solar-predict')));
  useAutoComplete(STEP, 's10-solar', ['q10-solar-predict', 'q10-solar-explain'], Boolean(attempt));
  return (
    <div className="stack">
      <p className="lead">
        <strong>일식 실험</strong> — 옮기기 → 예측 → 관찰 → 설명. 태양–달–지구 순서가 되도록 달을 옮기고, 달의 그림자가 지구의 어디에 닿는지 보세요. 지구 위 관측 지점을 바꾸면 같은 순간에도 보이는 것이 달라져요.
      </p>
      <ChoiceQuestion
        qid="q10-solar-predict"
        stepId={STEP}
        sceneId="s10-solar"
        prompt="예측: 달 그림자가 지구에 닿으면 지구 어디에서나 같은 일식이 보일까요?"
        options={[
          { id: 'everywhere', label: '지구 어디서나 같은 모습', correct: false, feedback: '모형에서 관측 지점의 위도·경도를 바꿔 보세요. 그림자는 지구의 일부에만 닿아요.' },
          { id: 'partial', label: '그림자가 닿는 일부 지역에서만 보이고, 위치마다 다르다', correct: true, feedback: '모형에서 관측 지점을 옮기며 ‘관측 지점에서는’ 판정이 바뀌는지 확인해 보세요.' },
          { id: 'night', label: '밤인 곳에서 잘 보인다', correct: false, feedback: '일식은 태양이 떠 있는 낮에 달이 태양을 가리는 현상이에요. 밤 쪽 관측 지점은 태양 자체가 안 보여요.' },
        ]}
      />
      {predicted ? (
        <ModelLab mode="eclipse-solar" state={state} onChange={setState} controls={{ theta: true, observer: true }} badges={['일식 실험']} onRendererChange={setRenderer}>
          <div className="card stack-sm" style={{ padding: 12 }}>
            <span className="caption">{aligned ? '정렬됐어요. 관측 지점을 바꾸며 무엇이 달라지는지 보세요.' : '달을 태양과 지구 사이(0° 근처)로 옮기세요.'}</span>
            <button type="button" className="btn btn--sm" disabled={!aligned} onClick={() => saveAttempt({ id: attempt?.id ?? newAttemptId('s10s'), stepId: STEP, sceneId: 's10-solar', mode: 'eclipse-solar', targetSource: 'app:solar', target: { kind: 'solar' }, state, submitted: true, result: { solar, renderer }, hintsUsed: 0, isSandbox: false })}>
              이 배치를 제출
            </button>
            {attempt ? <span className="chip chip--green">제출됨</span> : null}
          </div>
        </ModelLab>
      ) : (
        <p className="caption">예측을 먼저 고르면 모형이 열려요.</p>
      )}
      {attempt ? <TextQuestion qid="q10-solar-explain" stepId={STEP} sceneId="s10-solar" prompt="설명: 일식을 만드는 천체 배치와, 지구의 관측 위치에 따라 달라지는 점" rows={3} /> : null}
      <details className="more">
        <summary>더 알아보기: 부분·개기·금환</summary>
        <div>본그림자(짙은 부분)가 닿는 좁은 지역에서는 태양이 다 가려지고(개기), 달이 조금 멀어 본그림자가 지구에 못 미치면 테두리가 남아요(금환). 반그림자만 닿는 넓은 지역에서는 일부만 가려져요(부분). 이 모형은 평균 거리 기준의 개념 모형이며 실제 예보가 아니에요.</div>
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
        <strong>월식 실험</strong> — 태양–지구–달 순서가 되도록 달을 옮기고, 달을 지구 그림자 안팎으로 움직여 보세요. 달이 <Term id="umbra" />에 들어가는 것을 보통의 위상 변화와 비교해요.
      </p>
      <ChoiceQuestion
        qid="q10-lunar-predict"
        stepId={STEP}
        sceneId="s10-lunar"
        prompt="예측: 보름 위치에서 달이 지구 그림자에 들어가면 지구에서는 어떻게 보일까요?"
        options={[
          { id: 'crescent', label: '초승달처럼 한쪽이 얇게 밝게 보인다', correct: false, feedback: '모형에서 확인해 보세요. 그림자에 들어간 부분은 위상의 어두운 부분과 모양이 달라요.' },
          { id: 'dark', label: '밝던 보름달이 그림자 들어간 만큼 어두워진다', correct: true, feedback: '들어간 부분이 어두워지고 다 들어가면 전체가 어두워져요. 위상 변화의 어두운 부분과 어떻게 다른지 설명해 보세요.' },
          { id: 'nothing', label: '아무 변화가 없다', correct: false, feedback: '달은 스스로 빛나지 않아요. 지구가 햇빛을 막으면 달이 어두워지는지 모형에서 확인해 보세요.' },
        ]}
      />
      {predicted ? (
        <ModelLab mode="eclipse-lunar" state={state} onChange={setState} controls={{ theta: true }} badges={['월식 실험']} onRendererChange={setRenderer}>
          <div className="card stack-sm" style={{ padding: 12 }}>
            <span className="caption">{inside ? '달이 지구 그림자에 들어갔어요. 지구 창에서 달이 어두워지는 것을 보세요.' : '달을 태양 반대편(180° 근처)으로 옮기세요.'}</span>
            <button type="button" className="btn btn--sm" disabled={!inside} onClick={() => saveAttempt({ id: attempt?.id ?? newAttemptId('s10l'), stepId: STEP, sceneId: 's10-lunar', mode: 'eclipse-lunar', targetSource: 'app:lunar', target: { kind: 'lunar' }, state, submitted: true, result: { lunar, renderer }, hintsUsed: 0, isSandbox: false })}>
              이 배치를 제출
            </button>
            {attempt ? <span className="chip chip--green">제출됨</span> : null}
          </div>
        </ModelLab>
      ) : (
        <p className="caption">예측을 먼저 고르면 모형이 열려요.</p>
      )}
      {attempt ? <TextQuestion qid="q10-lunar-explain" stepId={STEP} sceneId="s10-lunar" prompt="설명: 월식의 어두운 부분과 초승달의 어두운 부분은 무엇이 다른가요? 위치와 빛을 이용해 설명하세요." rows={3} /> : null}
      <details className="more">
        <summary>더 알아보기: 월식 때 달이 붉게 보이는 이유</summary>
        <div>지구 대기를 통과하며 굴절·산란된 햇빛 일부가 그림자 속 달에 닿아 붉게 보일 수 있어요. 이 모형의 어두운 색은 판정 결과를 나타낸 표시이고 대기 산란을 계산한 것은 아니에요.</div>
      </details>
    </div>
  );
}

const ORDER = [
  { id: 'sme', label: '태양–달–지구' },
  { id: 'sem', label: '태양–지구–달' },
  { id: 'mse', label: '달–태양–지구' },
];
const BODY = [
  { id: 'moon', label: '달' },
  { id: 'earth', label: '지구' },
  { id: 'sun', label: '태양' },
];
const PHASE = [
  { id: 'new', label: '삭' },
  { id: 'full', label: '보름' },
  { id: 'quarter', label: '상현/하현' },
];

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
      <p className="lead">두 실험을 비교표로 정리해요. ‘삭이면 반드시 일식’, ‘보름이면 반드시 월식’은 아니에요 — 삭과 보름은 필요한 배치이지만 정렬 조건까지 맞아야 해요(11단계).</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">현상</th>
              <th scope="col">천체 순서</th>
              <th scope="col">빛을 가리는 천체</th>
              <th scope="col">그림자가 생기는 대상</th>
              <th scope="col">관련된 위상</th>
              <th scope="col">보통의 위상 변화와 다른 점</th>
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
                    <select className="select" value={v[row]?.[col] ?? ''} onChange={(e) => set(row, col, e.target.value)} aria-label={`${row === 'solar' ? '일식' : '월식'} ${col}`} style={checked ? { borderColor: correct(row, col) ? 'var(--c-success)' : 'var(--c-error)' } : undefined}>
                      <option value="">선택</option>
                      {opts.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
                <td>
                  <input className="input" value={v[row]?.diff ?? ''} onChange={(e) => set(row, 'diff', e.target.value)} placeholder="한 문장" aria-label={`${row === 'solar' ? '일식' : '월식'} 다른 점`} />
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
          표 확인
        </button>
        {checked ? <span className="caption">빨간 테두리는 다시 살펴볼 칸이에요. 모형으로 돌아가 확인하고 고칠 수 있어요.</span> : null}
      </div>
      <p className="caption">
        09에서 예측한 분류를 고치고 싶다면 <Link to="/learn/s09/s09-classify">09단계로</Link> 돌아가세요. 처음 예측도 함께 보관돼요.
      </p>
    </div>
  );
}

function Videos() {
  useScene(STEP, 's10-videos');
  return (
    <div className="stack">
      <div className="note note--warn">
        <strong>안전:</strong> 실제 일식을 볼 때는 태양을 맨눈이나 필터 없는 망원경·쌍안경으로 직접 보지 마세요. 이 수업의 식 활동은 실내 모형·자료 활동으로 완결돼요.
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
