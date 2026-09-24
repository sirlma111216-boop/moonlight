import { useEffect, useState } from 'react';
import { illuminatedFraction, WHOLE_SURFACE_LIT_FRACTION } from '@shared/phaseMath';
import { QID } from '@shared/questionIds';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { PhaseDisk } from '@/components/PhaseDisk';
import { VideoSlot } from '@/components/VideoSlot';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';
import { Q01_OPTIONS } from '@/lib/report';

const STEP = 's08';

function Mission1() {
  useScene(STEP, 's08-mission1');
  const bundle = useSession((s) => s.bundle)!;
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s08-m1', { theta: 180, showShadow: true });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const evidence = bundle.attempts.find((a) => a.stepId === STEP && a.sceneId === 's08-mission1' && a.submitted);
  const k = illuminatedFraction(state.theta);
  const crescent = k > 0.03 && k < 0.45;
  useAutoComplete(STEP, 's08-mission1', ['q08-m1-verdict', 'q08-m1-why'], Boolean(evidence));
  return (
    <div className="stack">
      <div className="card card--stone">
        <span className="mono">달 연구소의 오류 1</span>
        <p className="lead" style={{ margin: 0 }}>“초승달은 지구 그림자가 달을 조금 가려서 생긴다.”</p>
      </div>
      <p>모형으로 반례를 만들어요. 초승달이 보이는 위치에 달을 놓고, ‘그림자’를 켜서 지구 그림자가 어느 쪽으로 뻗는지 보세요. 지구 그림자 없이도 초승 모양이 보이나요?</p>
      <ModelLab mode="sandbox" state={state} onChange={setState} controls={{ theta: true }} badges={['오류 1 검증']} onRendererChange={setRenderer}>
        <div className="card stack-sm" style={{ padding: 12 }}>
          <span className="caption">지금 원반 밝은 비율 {Math.round(k * 100)}% · {crescent ? '초승/그믐 모양이에요' : '초승 모양이 될 때까지 옮겨 보세요 (태양 쪽 절반)'}</span>
          <button type="button" className="btn btn--sm" disabled={!crescent} onClick={() => saveAttempt({ id: evidence?.id ?? newAttemptId('s08m1'), stepId: STEP, sceneId: 's08-mission1', mode: 'sandbox', targetSource: 'mission:1', target: { claim: 'crescent-by-earth-shadow' }, state, submitted: true, result: { fraction: k, renderer, shadowShown: state.showShadow }, hintsUsed: 0, isSandbox: false })}>
            이 상태를 증거로 제출
          </button>
          {evidence ? <span className="chip chip--green">증거 제출됨 ({Math.round(evidence.state.theta)}°)</span> : null}
        </div>
      </ModelLab>
      {evidence ? (
        <>
          <ChoiceQuestion
            qid="q08-m1-verdict"
            stepId={STEP}
            sceneId="s08-mission1"
            prompt="증거로 볼 때 이 문장은?"
            options={[
              { id: 'true', label: '옳다', correct: false, feedback: '지구 그림자는 태양 반대쪽(보름 위치)으로 뻗어요. 초승달 위치의 달은 그림자 근처에 없어요. 어두운 부분은 그림자가 아니라 태양빛을 못 받는 면이에요.' },
              { id: 'false', label: '틀리다 — 초승달의 어두운 부분은 지구 그림자가 아니다', correct: true, feedback: '초승달은 달의 밝은 절반 중 우리 쪽을 향한 부분이 작을 때 보여요. 지구 그림자가 달에 닿는 경우는 월식이고, 그것은 보름 위치에서 일어나요.' },
            ]}
          />
          <TextQuestion qid="q08-m1-why" stepId={STEP} sceneId="s08-mission1" prompt="내 모형에서 확인한 근거를 한 문장으로" rows={2} placeholder="예: 그림자는 왼쪽(태양 반대)으로 뻗었는데 달은 오른쪽(태양 쪽)에 있었다" />
        </>
      ) : null}
    </div>
  );
}

function Mission2() {
  useScene(STEP, 's08-mission2');
  const bundle = useSession((s) => s.bundle)!;
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s08-m2', { theta: 90, showLitSide: true });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const evidences = bundle.attempts.filter((a) => a.stepId === STEP && a.sceneId === 's08-mission2' && a.submitted);
  const k = illuminatedFraction(state.theta);
  const distinct = evidences.length >= 2 && Math.abs(illuminatedFraction(evidences[0].state.theta) - illuminatedFraction(evidences[evidences.length - 1].state.theta)) > 0.2;
  useAutoComplete(STEP, 's08-mission2', ['q08-m2-verdict', 'q08-m2-why'], distinct);
  return (
    <div className="stack">
      <div className="card card--stone">
        <span className="mono">달 연구소의 오류 2</span>
        <p className="lead" style={{ margin: 0 }}>“달의 절반이 밝으면 지구에서는 언제나 반달로 보인다.”</p>
      </div>
      <p>‘밝은 면’을 켜 두고, 같은 밝은 절반을 서로 다른 위치에서 봐요. 원반의 밝은 비율이 다른 두 상태를 증거로 제출하세요.</p>
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} badges={['오류 2 검증']} onRendererChange={setRenderer}>
        <div className="card stack-sm" style={{ padding: 12 }}>
          <span className="caption">
            달 전체 밝은 비율 {Math.round(WHOLE_SURFACE_LIT_FRACTION * 100)}% (항상) · 원반 {Math.round(k * 100)}%
          </span>
          <button type="button" className="btn btn--sm" onClick={() => saveAttempt({ id: newAttemptId('s08m2'), stepId: STEP, sceneId: 's08-mission2', mode: 'phase', targetSource: 'mission:2', target: { claim: 'half-lit-always-half-moon' }, state, submitted: true, result: { fraction: k, renderer }, hintsUsed: 0, isSandbox: false })}>
            이 상태를 증거로 제출 ({evidences.length}개)
          </button>
          <div className="row">
            {evidences.slice(-4).map((e) => (
              <div key={e.id} style={{ textAlign: 'center' }}>
                <PhaseDisk theta={e.state.theta} size={44} hideName />
                <div className="micro">{Math.round(illuminatedFraction(e.state.theta) * 100)}%</div>
              </div>
            ))}
          </div>
          {distinct ? <span className="chip chip--green">서로 다른 비율의 증거 2개 확보</span> : null}
        </div>
      </ModelLab>
      {distinct ? (
        <>
          <ChoiceQuestion
            qid="q08-m2-verdict"
            stepId={STEP}
            sceneId="s08-mission2"
            prompt="증거로 볼 때 이 문장은?"
            options={[
              { id: 'true', label: '옳다', correct: false, feedback: '달 전체는 늘 절반이 밝지만, 지구에서 보이는 원반의 밝은 비율은 위치에 따라 0~100%로 달라져요. 증거 두 개의 비율을 다시 비교해 보세요.' },
              { id: 'false', label: '틀리다 — 전체의 절반이 밝아도 보이는 원반은 위치에 따라 다르다', correct: true, feedback: '반달로 보이는 것은 특정 위치(상현·하현)뿐이에요. 두 가지 ‘절반’을 구분한 것이 핵심이에요.' },
            ]}
          />
          <TextQuestion qid="q08-m2-why" stepId={STEP} sceneId="s08-mission2" prompt="내 증거 두 개로 반박문을 한 문장으로" rows={2} />
        </>
      ) : null}
    </div>
  );
}

function Claim() {
  useScene(STEP, 's08-claim');
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const saveAttempt = useSession((s) => s.saveAttempt);
  const saved = bundle.responses.find((r) => r.questionId === QID.q08Claim)?.latest as { text?: string; verdict?: string; reason?: string } | undefined;
  const [text, setText] = useState(saved?.text ?? '');
  const [reason, setReason] = useState(saved?.reason ?? '');
  const [verdict, setVerdict] = useState(saved?.verdict ?? '');
  const [state, setState] = useLabState('s08-claim', { theta: 120, showShadow: true });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const done = Boolean(saved?.text && saved?.verdict && saved?.reason);
  useAutoComplete(STEP, 's08-claim', [], done);
  return (
    <div className="stack">
      <div className="card card--stone">
        <span className="mono">세 번째 미션 · 내 주장</span>
        <p className="lead" style={{ margin: 0 }}>달에 대해 내가 사실이라고 믿는 문장을 쓰고, 모형으로 시험해요. 앱은 옳고 그름을 판정하지 않고 교사가 검토해요.</p>
      </div>
      <div className="field">
        <label htmlFor="claim-text">내 주장</label>
        <input id="claim-text" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 보름달은 항상 해가 질 때 뜬다" />
      </div>
      <ModelLab mode="sandbox" state={state} onChange={setState} controls={{ theta: true, inclination: true, node: true, play: true }} badges={['내 주장 시험']} onRendererChange={setRenderer}>
        <button type="button" className="btn btn--on-dark btn--sm" onClick={() => saveAttempt({ id: newAttemptId('s08claim'), stepId: STEP, sceneId: 's08-claim', mode: 'sandbox', targetSource: 'mission:claim', target: { claim: text }, state, submitted: true, result: { renderer }, hintsUsed: 0, isSandbox: false })}>
          이 상태를 증거로 저장
        </button>
      </ModelLab>
      <div className="field">
        <span className="label">시험한 결과, 내 주장은?</span>
        <div className="row">
          {[
            ['keep', '유지'],
            ['revise', '수정'],
            ['undecided', '판단 불가'],
          ].map(([k, l]) => (
            <button key={k} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={verdict === k} onClick={() => setVerdict(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="claim-reason">이유 (모형에서 무엇을 봤나요? 수정했다면 어떻게?)</label>
        <textarea id="claim-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="row">
        <button type="button" className="btn" disabled={!text.trim() || !verdict || !reason.trim()} onClick={() => respond(QID.q08Claim, STEP, 's08-claim', { text, verdict, reason, teacherReview: true })}>
          저장 (교사 검토 대상)
        </button>
        {done ? <span className="chip chip--coral">교사 검토 대상으로 표시됨</span> : null}
      </div>
    </div>
  );
}

function Revisit() {
  useScene(STEP, 's08-revisit');
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const awardBadge = useSession((s) => s.awardBadge);
  const first = bundle.responses.find((r) => r.questionId === QID.q01Choice)?.first as { choice?: string } | undefined;
  const reason = (bundle.responses.find((r) => r.questionId === QID.q01Reason)?.first as { text?: string } | undefined)?.text;
  const saved = bundle.responses.find((r) => r.questionId === QID.q08FirstRevisit)?.latest as { verdict?: string; newChoice?: string; reason?: string } | undefined;
  const [verdict, setVerdict] = useState(saved?.verdict ?? '');
  const [newChoice, setNewChoice] = useState(saved?.newChoice ?? '');
  const [why, setWhy] = useState(saved?.reason ?? '');
  const done = Boolean(saved?.verdict && saved?.reason);
  useAutoComplete(STEP, 's08-revisit', [], done);
  const restoreDone = bundle.attempts.filter((a) => a.stepId === 's06' && a.sceneId === 's06-restore' && a.submitted).length >= (bundle.classSession.mode === '2' ? 2 : 3);
  useEffect(() => {
    if (done && restoreDone) void awardBadge('moon-restorer');
  }, [done, restoreDone, awardBadge]);
  return (
    <div className="stack">
      <p className="lead">01에서 보관해 둔 처음 생각을 꺼내요. 모형으로 시험한 지금, 유지할까요 수정할까요?</p>
      <div className="card card--pale-blue">
        <span className="mono">내 생각 보관함 · 01</span>
        {first?.choice ? (
          <p style={{ margin: 0 }}>
            <strong>{Q01_OPTIONS[first.choice]}</strong>
            {reason ? <span className="caption"> — {reason}</span> : null}
          </p>
        ) : (
          <p className="caption" style={{ margin: 0 }}>01의 첫 생각이 없어요. 01로 돌아가 채우면 여기서 비교할 수 있어요.</p>
        )}
      </div>
      <div className="field">
        <span className="label">처음 생각을</span>
        <div className="row">
          <button type="button" className="choice" style={{ width: 'auto' }} aria-pressed={verdict === 'keep'} onClick={() => setVerdict('keep')}>
            유지한다
          </button>
          <button type="button" className="choice" style={{ width: 'auto' }} aria-pressed={verdict === 'revise'} onClick={() => setVerdict('revise')}>
            수정한다
          </button>
        </div>
      </div>
      {verdict === 'revise' ? (
        <div className="field">
          <span className="label">지금 생각</span>
          <div className="choice-list">
            {Object.entries(Q01_OPTIONS).map(([k, l]) => (
              <button key={k} type="button" className="choice" aria-pressed={newChoice === k} onClick={() => setNewChoice(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="revisit-why">이유 — 어떤 근거(자료·모형)가 결정적이었나요?</label>
        <textarea id="revisit-why" className="textarea" value={why} onChange={(e) => setWhy(e.target.value)} />
      </div>
      <button type="button" className="btn" disabled={!verdict || !why.trim() || (verdict === 'revise' && !newChoice)} onClick={() => respond(QID.q08FirstRevisit, STEP, 's08-revisit', { verdict, newChoice: verdict === 'revise' ? newChoice : first?.choice, reason: why })}>
        저장
      </button>
      {done ? <p className="note note--ok">저장했어요. 처음 생각도 그대로 보관돼요.</p> : null}
    </div>
  );
}

function Pair() {
  useScene(STEP, 's08-pair');
  const rec = useSession((s) => s.getResponse('q08-pair'));
  useAutoComplete(STEP, 's08-pair', ['q08-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q08-pair" stepId={STEP} sceneId="s08-pair" topic="유지/수정" ask="너는 처음 생각을 유지했어, 수정했어? 어떤 증거 때문이었어?" />;
}

function Video() {
  useScene(STEP, 's08-video');
  return <VideoSlot id="video-phases-shadows" stepId={STEP} sceneId="s08-video" />;
}

export default function Step08({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's08-mission1':
      return <Mission1 />;
    case 's08-mission2':
      return <Mission2 />;
    case 's08-claim':
      return <Claim />;
    case 's08-revisit':
      return <Revisit />;
    case 's08-pair':
      return <Pair />;
    case 's08-video':
      return <Video />;
    default:
      return null;
  }
}
