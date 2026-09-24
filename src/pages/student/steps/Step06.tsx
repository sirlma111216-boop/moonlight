import { useEffect, useState } from 'react';
import { illuminatedFraction, judgePhaseAttempt, PHASE_LABEL_KO, phaseName, type PhaseJudgement, type PhaseTarget } from '@shared/phaseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { Hints, TextQuestion, useHints } from '@/components/questions';
import { PhaseDisk } from '@/components/PhaseDisk';
import { MoonDrawCanvas } from '@/components/MoonDrawCanvas';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';

const STEP = 's06';

/** 대표 위상 목표 — 이름과 정답 위치는 숨긴다(원문 06). 판정 허용 범위는 교사 안내(docs/SCIENCE_MODEL.md)에 적혀 있다. */
const TARGETS: { id: string; target: PhaseTarget; hint3: string }[] = [
  { id: 'full', target: { kind: 'theta', theta: 180, toleranceDeg: 15 }, hint3: '달은 태양의 반대편, 지구 뒤쪽 절반 어딘가에 있어요.' },
  { id: 'first-quarter', target: { kind: 'theta', theta: 90, toleranceDeg: 15 }, hint3: '지구에서 볼 때 태양과 달이 직각을 이루는 두 위치 중, 보름 앞(차오르는) 쪽이에요.' },
  { id: 'waxing-crescent', target: { kind: 'theta', theta: 45, toleranceDeg: 18 }, hint3: '달은 태양과 같은 쪽 절반에 있고, 삭에서 상현으로 가는 중간쯤이에요.' },
];
const HINTS_COMMON = ['‘밝은 면’을 켜서 달의 어느 쪽이 태양을 향하는지 보세요. 지구에서 보이는 것은 그 밝은 절반의 일부예요.', '‘관측선’을 켜세요. 지구→달 선과 태양 방향이 이루는 각이 밝은 비율을 정해요.'];

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
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} target={{ theta: targetTheta, label: `목표 ${idx + 1}/${TARGETS.length} — 이 모양이 보이도록 달을 옮기세요`, hideName: true }} badges={[`목표 ${idx + 1}`]} onRendererChange={setRenderer}>
        <Hints hints={[...HINTS_COMMON, t.hint3]} level={hints.level} onNext={hints.next} dark />
        <button type="button" className="btn btn--on-dark" onClick={submit}>
          이 위치로 제출
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
                <div className="micro">내 모형 {Math.round(state.theta)}°</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--fs-caption)' }} className={result.ok ? '' : 'muted'}>
              {result.feedback}
            </p>
            {result.ok ? <span className="chip chip--green">{PHASE_LABEL_KO[phaseName(targetTheta)]} · 밝은 비율 {Math.round(illuminatedFraction(targetTheta) * 100)}%</span> : null}
          </div>
        ) : null}
      </ModelLab>
      {result ? (
        <TextQuestion qid={explainQ} stepId={STEP} sceneId="s06-restore" prompt="왜 이 위치에서 이 모양이 보일까요? ‘태양빛을 받는 부분’과 ‘지구에서 보이는 부분’을 연결해 설명하세요." rows={3} placeholder="예: 달의 태양 쪽 절반이 밝은데, 이 위치에서는 지구가 그 절반의 오른쪽 절반만 볼 수 있어서 …" />
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
      <p className="lead">모양만 보고 배치를 추론해요. 처음에는 위상 이름과 정답 위치를 숨겨요. 제출하면 목표와 내 모형을 나란히 비교해요.</p>
      <div className="row">
        {Array.from({ length: count }).map((_, i) => (
          <button key={i} type="button" className={`btn btn--sm ${idx === i ? '' : 'btn--secondary'}`} aria-pressed={idx === i} onClick={() => setIdx(i)}>
            목표 {i + 1} {done[i] ? '✓' : ''}
          </button>
        ))}
      </div>
      <RestoreOne key={idx} idx={idx} onDone={() => markDone(idx)} />
      <p className="caption">판정은 모형의 물리적 상태(각도)와 목표의 허용 범위로 해요. 밝은 비율만 같고 차오름/기움이 다른 경우는 구분해서 알려줘요. 여러 번 제출해도 돼요.</p>
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
    const result = isDate ? { judgement: judgePhaseAttempt(state.theta, { kind: 'theta', theta: goal.approxTheta as number, toleranceDeg: 25 }), renderer } : { judgement: null, renderer, note: '학생이 그린 목표는 자동 판정하지 않는다' };
    saveAttempt({ id: attempt?.id ?? newAttemptId('s06self'), stepId: STEP, sceneId: 's06-self', mode: 'phase', targetSource: isDate ? `publicdata:${goal.date}` : 'self:drawing', target: isDate ? { theta: goal.approxTheta } : { drawing: true }, state, submitted: true, result, hintsUsed: 0, isSandbox: false });
  }

  return (
    <div className="stack">
      <p className="lead">이번에는 <strong>내가 정한 목표</strong>예요. 달의 모양을 직접 그리거나, 04에서 고른 날짜 중 하나를 목표로 정해요.</p>
      {!goal ? (
        <div className="grid-2">
          <div className="card stack-sm">
            <span className="mono">A · 직접 그리기</span>
            <MoonDrawCanvas value={drawing} onChange={setDrawing} size={180} />
            <button type="button" className="btn btn--sm" disabled={!drawing} onClick={() => respond('q06-self-goal', STEP, 's06-self', { kind: 'draw', drawing })}>
              이 그림을 목표로
            </button>
          </div>
          <div className="card stack-sm">
            <span className="mono">B · 04에서 고른 날짜</span>
            {dateOptions.length === 0 ? <p className="caption">04에서 고른 날짜가 없어요. A 를 쓰거나 04로 돌아가세요.</p> : null}
            <div className="row">
              {dateOptions.map((d) => (
                <button key={d} type="button" className="btn btn--secondary btn--sm" onClick={() => respond('q06-self-goal', STEP, 's06-self', { kind: 'date', date: d, approxTheta: d === target?.date ? (target?.approxTheta ?? null) : null, lunarAge: d === target?.date ? target?.lunarAge : null })}>
                  {d}
                </button>
              ))}
            </div>
            <span className="micro">날짜 목표는 월령 근사 모형으로 판정해요(허용 ±25°).</span>
          </div>
        </div>
      ) : (
        <>
          <div className="row">
            <span className="chip chip--coral">내가 정한 목표: {goal.kind === 'draw' ? '직접 그린 달' : `${goal.date} (월령 근사 모형)`}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => respond('q06-self-goal', STEP, 's06-self', null)}>
              목표 다시 정하기
            </button>
          </div>
          <TextQuestion qid="q06-self-predict" stepId={STEP} sceneId="s06-self" prompt="예측 카드 — 제출 전에 먼저 쓰세요: ‘달을 이 위치(대략 몇 도, 어느 쪽)로 옮기면 이렇게 보일 것이다’" rows={2} placeholder="예: 태양 반대편 가까이(약 150°)에 두면 오른쪽이 거의 다 밝은 달로 보일 것이다" />
          {predicted ? (
            <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} target={goal.kind === 'draw' ? { drawingUrl: goal.drawing, label: '내가 그린 목표' } : { theta: goal.approxTheta ?? 0, label: `${goal.date} 월령 근사 모형`, hideName: true }} onRendererChange={setRenderer}>
              <button type="button" className="btn btn--on-dark" onClick={submit}>
                이 위치로 제출
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
                      <div className="micro">내 모형 {Math.round(attempt.state.theta)}°</div>
                    </div>
                  </div>
                  {goal.kind === 'date' ? (
                    <p className="caption" style={{ margin: 0 }}>{(attempt.result as { judgement?: PhaseJudgement }).judgement?.feedback}</p>
                  ) : (
                    <div className="stack-sm">
                      <p className="caption" style={{ margin: 0 }}>그림 목표는 자동 채점하지 않아요. 스스로 비교해 보세요.</p>
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
