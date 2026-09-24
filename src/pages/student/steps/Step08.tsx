import { useEffect, useState } from 'react';
import { illuminatedFraction } from '@shared/phaseMath';
import { QID } from '@shared/questionIds';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { PhaseDisk } from '@/components/PhaseDisk';
import { VideoSlot } from '@/components/VideoSlot';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';
import { Q01_CHOICES, Q01_OPTIONS } from '@/lib/report';
import { litWords, positionNo } from '@/lib/words';

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
        <span className="mono">달 연구소의 틀린 설명 1</span>
        <p className="lead" style={{ margin: 0 }}>
          “초승달은 지구 그림자가 달을 조금 가려서 생긴다.”
        </p>
      </div>
      <p>
        이 설명이 맞는지 모형으로 확인해 봐요. ‘그림자 보기’가 켜져 있어서 지구 그림자가 검게 보여요. 달을 옮겨서 <strong>초승달이나 그믐달처럼 가늘게 보이는 자리</strong>를 찾아보세요. 그때 지구 그림자가 달에 닿아 있나요?
      </p>
      <ModelLab mode="sandbox" modeLabel="틀린 설명 확인하기" state={state} onChange={setState} controls={{ theta: true }} onRendererChange={setRenderer}>
        <div className="card stack-sm" style={{ padding: 12 }}>
          <span className="caption">지구에서는 {litWords(k)}. {crescent ? '가늘게 보이는 자리예요. 그림자가 달에 닿았는지 보세요.' : '가늘게 보이는 자리까지 옮겨 보세요.'}</span>
          <button
            type="button"
            className="btn btn--sm"
            disabled={!crescent}
            onClick={() => saveAttempt({ id: evidence?.id ?? newAttemptId('s08m1'), stepId: STEP, sceneId: 's08-mission1', mode: 'sandbox', targetSource: 'mission:1', target: { claim: 'crescent-by-earth-shadow' }, state, submitted: true, result: { fraction: k, renderer, shadowShown: state.showShadow }, hintsUsed: 0, isSandbox: false })}
          >
            이 모습을 증거로 제출
          </button>
          {evidence ? <span className="chip chip--green">증거 제출함 ({positionNo(evidence.state.theta)}번 자리)</span> : null}
        </div>
      </ModelLab>
      {evidence ? (
        <>
          <ChoiceQuestion
            qid="q08-m1-verdict"
            stepId={STEP}
            sceneId="s08-mission1"
            prompt="내 증거로 보면 이 설명은?"
            options={[
              { id: 'true', label: '맞다', correct: false, feedback: '지구 그림자는 태양 반대쪽(5번 자리 쪽)으로 뻗어요. 초승달 자리의 달은 그림자 근처에 없어요. 달의 어두운 부분은 그림자가 아니라 햇빛을 못 받는 쪽이에요.' },
              { id: 'false', label: '틀리다. 초승달의 어두운 부분은 지구 그림자가 아니다', correct: true, feedback: '맞아요. 초승달은 햇빛을 받는 절반 중 아주 조금만 지구를 향할 때 보여요. 지구 그림자가 달에 닿는 것은 월식이고, 5번 자리 근처에서만 일어날 수 있어요.' },
            ]}
          />
          <TextQuestion qid="q08-m1-why" stepId={STEP} sceneId="s08-mission1" prompt="모형에서 본 것을 근거로 한 문장 쓰기" rows={2} placeholder="예: 그림자는 태양 반대쪽으로 뻗었는데, 초승달이 보이는 달은 태양 쪽에 있었다" />
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
        <span className="mono">달 연구소의 틀린 설명 2</span>
        <p className="lead" style={{ margin: 0 }}>
          “달의 절반이 햇빛을 받으니, 지구에서는 언제나 반달로 보인다.”
        </p>
      </div>
      <p>‘햇빛 받는 쪽 표시’가 켜져 있어요. 햇빛 받는 절반은 그대로인데 지구에서 보이는 모양이 서로 다른 두 자리를 찾아, 하나씩 증거로 제출하세요.</p>
      <ModelLab mode="phase" modeLabel="틀린 설명 확인하기" state={state} onChange={setState} controls={{ theta: true }} onRendererChange={setRenderer}>
        <div className="card stack-sm" style={{ padding: 12 }}>
          <span className="caption">
            달 전체에서 햇빛 받는 곳: 언제나 절반
            <br />
            지구에서는: {litWords(k)}
          </span>
          <button type="button" className="btn btn--sm" onClick={() => saveAttempt({ id: newAttemptId('s08m2'), stepId: STEP, sceneId: 's08-mission2', mode: 'phase', targetSource: 'mission:2', target: { claim: 'half-lit-always-half-moon' }, state, submitted: true, result: { fraction: k, renderer }, hintsUsed: 0, isSandbox: false })}>
            이 모습을 증거로 제출 (지금까지 {evidences.length}개)
          </button>
          <div className="row">
            {evidences.slice(-4).map((e) => (
              <div key={e.id} style={{ textAlign: 'center' }}>
                <PhaseDisk theta={e.state.theta} size={44} hideName />
                <div className="micro">{positionNo(e.state.theta)}번 자리</div>
              </div>
            ))}
          </div>
          {distinct ? <span className="chip chip--green">서로 다르게 보이는 증거 2개를 모았어요</span> : null}
        </div>
      </ModelLab>
      {distinct ? (
        <>
          <ChoiceQuestion
            qid="q08-m2-verdict"
            stepId={STEP}
            sceneId="s08-mission2"
            prompt="내 증거로 보면 이 설명은?"
            options={[
              { id: 'true', label: '맞다', correct: false, feedback: '내가 모은 증거 두 개를 다시 보세요. 햇빛 받는 곳은 똑같이 절반인데, 지구에서 보이는 모양은 달랐어요.' },
              { id: 'false', label: '틀리다. 절반이 햇빛을 받아도, 지구에서 보이는 모양은 자리에 따라 다르다', correct: true, feedback: '맞아요. 반달로 보이는 것은 3번과 7번 자리일 때뿐이에요. ‘달 전체에서 햇빛 받는 곳’과 ‘지구에서 보이는 곳’을 구분한 것이 핵심이에요.' },
            ]}
          />
          <TextQuestion qid="q08-m2-why" stepId={STEP} sceneId="s08-mission2" prompt="내 증거 두 개로 이 설명이 틀린 까닭을 한 문장으로" rows={2} />
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
        <p className="lead" style={{ margin: 0 }}>
          달에 대해 내가 맞다고 믿는 문장을 하나 쓰고, 모형으로 시험해 봐요.
        </p>
        <p className="caption" style={{ margin: '6px 0 0' }}>앱은 맞다 틀리다를 정하지 않아요. 선생님이 읽어 보실 거예요.</p>
      </div>
      <div className="field">
        <label htmlFor="claim-text">내 주장</label>
        <input id="claim-text" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 보름달은 언제나 해가 질 때쯤 뜬다" />
      </div>
      <ModelLab mode="sandbox" modeLabel="내 주장 시험하기" state={state} onChange={setState} controls={{ theta: true, inclination: true, node: true, play: true }} onRendererChange={setRenderer}>
        <button type="button" className="btn btn--on-dark btn--sm" onClick={() => saveAttempt({ id: newAttemptId('s08claim'), stepId: STEP, sceneId: 's08-claim', mode: 'sandbox', targetSource: 'mission:claim', target: { claim: text }, state, submitted: true, result: { renderer }, hintsUsed: 0, isSandbox: false })}>
          지금 모습을 증거로 저장
        </button>
      </ModelLab>
      <div className="field">
        <span className="label">시험해 본 결과, 내 주장은?</span>
        <div className="row">
          {[
            ['keep', '그대로 둔다'],
            ['revise', '고친다'],
            ['undecided', '모형만으로는 알 수 없다'],
          ].map(([k, l]) => (
            <button key={k} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={verdict === k} onClick={() => setVerdict(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="claim-reason">까닭 (모형에서 무엇을 봤나요? 고쳤다면 어떻게 고쳤나요?)</label>
        <textarea id="claim-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="row">
        <button type="button" className="btn" disabled={!text.trim() || !verdict || !reason.trim()} onClick={() => respond(QID.q08Claim, STEP, 's08-claim', { text, verdict, reason, teacherReview: true })}>
          저장하기
        </button>
        {done ? <span className="chip chip--coral">선생님이 읽어 볼 글로 저장했어요</span> : null}
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
      <p className="lead">1단계에서 적어 둔 내 첫 생각을 다시 꺼내 봐요. 모형으로 이것저것 해 본 지금, 그대로 둘까요, 고칠까요?</p>
      <div className="card card--pale-blue">
        <span className="mono">1단계에서 고른 내 첫 생각</span>
        {first?.choice ? (
          <p style={{ margin: 0 }}>
            <strong>{Q01_OPTIONS[first.choice]}</strong>
            {reason ? <span className="caption"> — {reason}</span> : null}
          </p>
        ) : (
          <p className="caption" style={{ margin: 0 }}>
            1단계의 첫 생각이 없어요. 1단계로 돌아가 채우면 여기서 비교할 수 있어요.
          </p>
        )}
      </div>
      <div className="field">
        <span className="label">내 첫 생각을</span>
        <div className="row">
          <button type="button" className="choice" style={{ width: 'auto' }} aria-pressed={verdict === 'keep'} onClick={() => setVerdict('keep')}>
            그대로 둔다
          </button>
          <button type="button" className="choice" style={{ width: 'auto' }} aria-pressed={verdict === 'revise'} onClick={() => setVerdict('revise')}>
            고친다
          </button>
        </div>
      </div>
      {verdict === 'revise' ? (
        <div className="field">
          <span className="label">지금 내 생각</span>
          <div className="choice-list">
            {Q01_CHOICES.map((c) => (
              <button key={c.id} type="button" className="choice" aria-pressed={newChoice === c.id} onClick={() => setNewChoice(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="revisit-why">까닭 — 어떤 자료나 모형 활동 덕분에 그렇게 판단했나요?</label>
        <textarea id="revisit-why" className="textarea" value={why} onChange={(e) => setWhy(e.target.value)} />
      </div>
      <button type="button" className="btn" disabled={!verdict || !why.trim() || (verdict === 'revise' && !newChoice)} onClick={() => respond(QID.q08FirstRevisit, STEP, 's08-revisit', { verdict, newChoice: verdict === 'revise' ? newChoice : first?.choice, reason: why })}>
        저장하기
      </button>
      {done ? <p className="note note--ok">저장했어요. 첫 생각도 지워지지 않고 그대로 남아 있어요.</p> : null}
    </div>
  );
}

function Pair() {
  useScene(STEP, 's08-pair');
  const rec = useSession((s) => s.getResponse('q08-pair'));
  useAutoComplete(STEP, 's08-pair', ['q08-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q08-pair" stepId={STEP} sceneId="s08-pair" topic="첫 생각 다시 보기" ask="너는 첫 생각을 그대로 뒀어, 고쳤어? 어떤 증거 때문이었어?" />;
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
