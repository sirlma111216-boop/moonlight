import { useEffect, useState } from 'react';
import { judgePhaseAttempt, PHASE_LABEL_KO, phaseName, type PhaseJudgement, type PhaseTarget } from '@shared/phaseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { Hints, TextQuestion, useHints } from '@/components/questions';
import { PhaseDisk } from '@/components/PhaseDisk';
import { MoonDrawCanvas } from '@/components/MoonDrawCanvas';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';
import { litWordsAt, positionNo } from '@/lib/words';

const STEP = 's06';

/** 목표 — 이름과 정답 자리는 숨긴다. 허용 범위는 교사 안내(docs/SCIENCE_MODEL.md)에 적혀 있다. */
const TARGETS: { id: string; target: PhaseTarget; hint3: string }[] = [
  { id: 'full', target: { kind: 'theta', theta: 180, toleranceDeg: 15 }, hint3: '달을 태양의 반대편, 지구 뒤쪽으로 옮겨 보세요.' },
  { id: 'first-quarter', target: { kind: 'theta', theta: 90, toleranceDeg: 15 }, hint3: '3번 자리와 7번 자리 중 하나예요. 밝은 쪽이 오른쪽인지 왼쪽인지 보고 골라 보세요.' },
  { id: 'waxing-crescent', target: { kind: 'theta', theta: 45, toleranceDeg: 18 }, hint3: '1번 자리와 3번 자리 사이 어딘가예요.' },
];
const HINTS_COMMON = [
  '‘햇빛 받는 쪽 표시’를 켜 보세요. 달에서 햇빛을 받는 절반이 노랗게 보여요. 지구에서는 그 노란 절반 중 지구를 향한 부분만 보여요.',
  '‘눈길 보기’를 켜고 오른쪽 창을 보면서 달을 조금씩 옮겨 보세요.',
];

function RestoreOne({ idx, onDone }: { idx: number; onDone: () => void }) {
  const t = TARGETS[idx];
  const [state, setState] = useLabState(`s06-restore-${t.id}`, { theta: 20 });
  const hints = useHints(3);
  const saveAttempt = useSession((s) => s.saveAttempt);
  const submitted = useSession((s) => s.bundle?.attempts.find((a) => a.stepId === STEP && a.sceneId === 's06-restore' && a.targetSource === `app:${t.id}` && a.submitted));
  const [result, setResult] = useState<PhaseJudgement | null>((submitted?.result as { judgement?: PhaseJudgement } | null)?.judgement ?? null);
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const explainQ = `q06-explain-${idx}`;
  const explained = useSession((s) => Boolean((s.getResponse(explainQ)?.latest as { text?: string } | undefined)?.text?.trim()));
  useEffect(() => {
    if (result && explained) onDone();
  }, [result, explained, onDone]);

  function submit() {
    const j = judgePhaseAttempt(state.theta, t.target);
    setResult(j);
    saveAttempt({ id: submitted?.id ?? newAttemptId('s06'), stepId: STEP, sceneId: 's06-restore', mode: 'phase', targetSource: `app:${t.id}`, target: t.target, state, submitted: true, result: { judgement: j, renderer }, hintsUsed: hints.level, isSandbox: false });
  }
  const targetTheta = t.target.kind === 'theta' ? t.target.theta : 0;
  return (
    <div className="stack">
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} target={{ theta: targetTheta, label: `목표 ${idx + 1}: 지구에서 이 모양으로 보이도록 달을 옮기세요.`, hideName: true }} badges={[`목표 ${idx + 1}`]} onRendererChange={setRenderer}>
        <Hints hints={[...HINTS_COMMON, t.hint3]} level={hints.level} onNext={hints.next} dark />
        <button type="button" className="btn btn--on-dark" onClick={submit}>
          이 자리로 제출
        </button>
        {result ? (
          <div className="card stack-sm" style={{ padding: 12 }}>
            <div className="row" style={{ justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <PhaseDisk theta={targetTheta} size={72} hideName={!result.ok} />
                <div className="micro">목표</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <PhaseDisk theta={state.theta} size={72} hideName />
                <div className="micro">내 모형 ({positionNo(state.theta)}번 자리)</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--fs-caption)' }}>{result.feedback}</p>
            {result.ok ? <span className="chip chip--green">이 모양의 이름: {PHASE_LABEL_KO[phaseName(targetTheta)]}</span> : null}
          </div>
        ) : null}
      </ModelLab>
      {result ? (
        <TextQuestion
          qid={explainQ}
          stepId={STEP}
          sceneId="s06-restore"
          prompt="왜 이 자리에서 이런 모양으로 보일까요? ‘햇빛을 받는 쪽’과 ‘지구에서 보이는 쪽’이라는 말을 넣어 설명해 보세요."
          rows={3}
          placeholder="예: 달에서 햇빛을 받는 쪽은 태양 쪽 절반인데, 이 자리에서는 지구에서 그 절반 중 오른쪽 반만 보여서 …"
        />
      ) : null}
    </div>
  );
}

function Restore() {
  useScene(STEP, 's06-restore');
  const mode = useSession((s) => s.bundle!.classSession.mode);
  const count = mode === '2' ? 2 : 3;
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<boolean[]>(Array(count).fill(false));
  const markDone = (i: number) => setDone((d) => (d[i] ? d : d.map((v, j) => (j === i ? true : v))));
  useAutoComplete(STEP, 's06-restore', [], done.slice(0, count).every(Boolean));
  return (
    <div className="stack">
      <p className="lead">오른쪽 ‘목표’에 보이는 달 모양만 보고, 달을 어느 자리에 놓아야 하는지 찾아요.</p>
      <p className="caption">처음에는 모양의 이름과 정답 자리를 알려 주지 않아요. 제출하면 목표와 내 모형을 나란히 보여 줘요. 여러 번 제출해도 되고, 힌트를 써도 괜찮아요.</p>
      <div className="row">
        {Array.from({ length: count }).map((_, i) => (
          <button key={i} type="button" className={`btn btn--sm ${idx === i ? '' : 'btn--secondary'}`} aria-pressed={idx === i} onClick={() => setIdx(i)}>
            목표 {i + 1} {done[i] ? '✓' : ''}
          </button>
        ))}
      </div>
      <RestoreOne key={idx} idx={idx} onDone={() => markDone(idx)} />
    </div>
  );
}

function SelfGoal() {
  useScene(STEP, 's06-self');
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const saveAttempt = useSession((s) => s.saveAttempt);
  const goal = bundle.responses.find((r) => r.questionId === 'q06-self-goal')?.latest as { kind?: 'draw' | 'date'; drawing?: string | null; date?: string; approxTheta?: number | null } | undefined;
  const predicted = Boolean((bundle.responses.find((r) => r.questionId === 'q06-self-predict')?.latest as { text?: string } | undefined)?.text?.trim());
  const [state, setState] = useLabState('s06-self', { theta: 30 });
  const [drawing, setDrawing] = useState<string | null>(goal?.drawing ?? null);
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const attempt = bundle.attempts.find((a) => a.stepId === STEP && a.sceneId === 's06-self' && a.submitted);
  const selected = bundle.responses.find((r) => r.questionId === 'q04-selection')?.latest as { dates?: string[] } | undefined;
  const target = bundle.responses.find((r) => r.questionId === 'q04-target')?.latest as { date?: string; approxTheta?: number | null; lunarAge?: number | null } | undefined;
  const compare = bundle.responses.find((r) => r.questionId === 'q06-self-compare')?.latest as { choice?: string } | undefined;
  useAutoComplete(STEP, 's06-self', [], Boolean(attempt) && (goal?.kind === 'date' || Boolean(compare?.choice)));

  const dateOptions = [target?.date, ...(selected?.dates ?? [])].filter((d): d is string => Boolean(d)).filter((d, i, a) => a.indexOf(d) === i);

  function submit() {
    const isDate = goal?.kind === 'date' && typeof goal.approxTheta === 'number';
    const result = isDate ? { judgement: judgePhaseAttempt(state.theta, { kind: 'theta', theta: goal.approxTheta as number, toleranceDeg: 25 }), renderer } : { judgement: null, renderer, note: '학생이 그린 목표는 자동으로 맞고 틀림을 정하지 않는다' };
    saveAttempt({ id: attempt?.id ?? newAttemptId('s06self'), stepId: STEP, sceneId: 's06-self', mode: 'phase', targetSource: isDate ? `publicdata:${goal.date}` : 'self:drawing', target: isDate ? { theta: goal.approxTheta } : { drawing: true }, state, submitted: true, result, hintsUsed: 0, isSandbox: false });
  }

  return (
    <div className="stack">
      <p className="lead">
        이번에는 <strong>내가 목표를 정해요.</strong> 보고 싶은 달 모양을 직접 그리거나, 4단계에서 고른 날짜 중 하나를 고르세요.
      </p>
      {!goal ? (
        <div className="grid-2">
          <div className="card stack-sm">
            <span className="mono">가 · 직접 그리기</span>
            <MoonDrawCanvas value={drawing} onChange={setDrawing} size={180} />
            <button type="button" className="btn btn--sm" disabled={!drawing} onClick={() => respond('q06-self-goal', STEP, 's06-self', { kind: 'draw', drawing })}>
              이 그림을 목표로 정하기
            </button>
          </div>
          <div className="card stack-sm">
            <span className="mono">나 · 4단계에서 고른 날짜</span>
            {dateOptions.length === 0 ? <p className="caption">4단계에서 고른 날짜가 없어요. ‘가’를 하거나 4단계로 돌아가세요.</p> : null}
            <div className="row">
              {dateOptions.map((d) => (
                <button key={d} type="button" className="btn btn--secondary btn--sm" onClick={() => respond('q06-self-goal', STEP, 's06-self', { kind: 'date', date: d, approxTheta: d === target?.date ? (target?.approxTheta ?? null) : null, lunarAge: d === target?.date ? target?.lunarAge : null })}>
                  {d}
                </button>
              ))}
            </div>
            <span className="micro">날짜를 고르면 그날의 월령으로 그려 본 달 모양이 목표가 돼요.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="row">
            <span className="chip chip--coral">내가 정한 목표: {goal.kind === 'draw' ? '내가 그린 달' : `${goal.date}의 달 (월령으로 그린 모양)`}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => respond('q06-self-goal', STEP, 's06-self', null)}>
              목표 다시 정하기
            </button>
          </div>
          <TextQuestion qid="q06-self-predict" stepId={STEP} sceneId="s06-self" prompt="예측 카드 — 옮기기 전에 먼저 쓰세요: ‘달을 몇 번 자리 근처에 두면 이런 모양으로 보일 것이다.’" rows={2} placeholder="예: 4번과 5번 자리 사이에 두면 오른쪽이 거의 다 밝게 보일 것이다" />
          {predicted ? (
            <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} target={goal.kind === 'draw' ? { drawingUrl: goal.drawing, label: '내가 그린 목표' } : { theta: goal.approxTheta ?? 0, label: `${goal.date}의 달 (월령으로 그린 모양)`, hideName: true }} onRendererChange={setRenderer}>
              <button type="button" className="btn btn--on-dark" onClick={submit}>
                이 자리로 제출
              </button>
              {attempt ? (
                <div className="card stack-sm" style={{ padding: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-around' }}>
                    <div style={{ textAlign: 'center' }}>
                      {goal.kind === 'draw' ? <img src={goal.drawing ?? ''} alt="내가 그린 달" style={{ width: 72, height: 72, borderRadius: '50%' }} /> : <PhaseDisk theta={goal.approxTheta ?? 0} size={72} hideName />}
                      <div className="micro">목표</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <PhaseDisk theta={attempt.state.theta} size={72} hideName />
                      <div className="micro">내 모형 ({positionNo(attempt.state.theta)}번 자리)</div>
                    </div>
                  </div>
                  {goal.kind === 'date' ? (
                    <p className="caption" style={{ margin: 0 }}>
                      {(attempt.result as { judgement?: PhaseJudgement }).judgement?.feedback}
                    </p>
                  ) : (
                    <div className="stack-sm">
                      <p className="caption" style={{ margin: 0 }}>
                        그림 목표는 앱이 맞고 틀림을 정하지 않아요. 지구에서는 {litWordsAt(attempt.state.theta)}. 내 그림과 비교해 보세요.
                      </p>
                      <div className="row">
                        {[
                          ['similar', '비슷하다'],
                          ['different', '다르다 — 다시 해 볼래요'],
                        ].map(([k, l]) => (
                          <button key={k} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={compare?.choice === k} onClick={() => respond('q06-self-compare', STEP, 's06-self', { choice: k })}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </ModelLab>
          ) : (
            <p className="caption">예측 카드를 먼저 쓰면 모형이 열려요.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function Step06({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's06-restore':
      return <Restore />;
    case 's06-self':
      return <SelfGoal />;
    default:
      return null;
  }
}
