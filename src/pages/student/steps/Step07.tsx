import { useState } from 'react';
import { illuminatedFraction, judgePhaseAttempt, type PhaseJudgement } from '@shared/phaseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { TextQuestion } from '@/components/questions';
import { PhaseDisk } from '@/components/PhaseDisk';
import { SourceBadge } from '@/components/SourceBadge';
import { MediaPhoto } from '@/components/MediaPhoto';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';
import { api } from '@/lib/api';
import { fmtTime } from '@/lib/publicdata';
import { litWords, positionNo } from '@/lib/words';

const STEP = 's07';

function Place() {
  useScene(STEP, 's07-place');
  const bundle = useSession((s) => s.bundle)!;
  const saveAttempt = useSession((s) => s.saveAttempt);
  const obs = bundle.observations[bundle.observations.length - 1];
  const asset = obs?.mediaAssetId ? bundle.mediaAssets.find((m) => m.id === obs.mediaAssetId) : null;
  const target = bundle.responses.find((r) => r.questionId === 'q04-target')?.latest as { date?: string; region?: string; lunarAge?: number | null; approxTheta?: number | null; moonrise?: string | null; moonset?: string | null; source?: string } | undefined;
  const [state, setState] = useLabState('s07-place', { theta: 30 });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const attempt = bundle.attempts.find((a) => a.stepId === STEP && a.sceneId === 's07-place' && a.submitted);
  const [ref, setRef] = useState<{ fraction: number; elongationDeg: number } | null>(null);
  const [refErr, setRefErr] = useState<string | null>(null);
  useAutoComplete(STEP, 's07-place', [], Boolean(attempt));

  const usingObs = Boolean(obs);
  const dateForRef = obs?.date || target?.date;
  const timeKnown = Boolean(obs?.timeKnown && obs.time);
  const timeForRef = timeKnown && obs?.time ? obs.time : '21:00';
  const uncertain = !obs?.timeKnown || obs?.sourceType === 'my-observation';

  function submit() {
    let judgement: PhaseJudgement | null = null;
    let targetSource = 'observation:none';
    let tgt: unknown = null;
    if (typeof target?.approxTheta === 'number') {
      targetSource = `publicdata:${target.date}`;
      const k = illuminatedFraction(target.approxTheta);
      tgt = { kind: 'illumination', minFraction: Math.max(0, k - 0.2), maxFraction: Math.min(1, k + 0.2), waxing: uncertain ? null : target.approxTheta < 180 };
      judgement = judgePhaseAttempt(state.theta, tgt as Parameters<typeof judgePhaseAttempt>[1]);
    } else if (obs) {
      targetSource = `observation:${obs.id}`;
      tgt = { drawing: true };
    }
    saveAttempt({ id: attempt?.id ?? newAttemptId('s07'), stepId: STEP, sceneId: 's07-place', mode: 'phase', targetSource, target: tgt, state, submitted: true, result: { judgement, renderer, uncertain }, hintsUsed: 0, isSandbox: false });
  }

  async function loadRef() {
    if (!dateForRef) return;
    setRefErr(null);
    try {
      const r = await api<{ fraction: number; elongationDeg: number }>(`/api/publicdata/illumination?date=${dateForRef}&time=${timeForRef}`);
      setRef(r);
    } catch (e) {
      setRefErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="stack">
      <p className="lead">왼쪽에는 내 관측 카드와 4단계에서 고른 자료가 있어요. 오른쪽 모형에서 자료 속 달 모양이 보이도록 달을 옮겨 보세요.</p>
      <p className="caption">정답 자리는 먼저 알려 주지 않아요. 제출한 뒤에 컴퓨터가 계산한 그날의 달 모양과 비교할 수 있어요.</p>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-sm">
          <div className="card stack-sm">
            {obs ? (
              <>
                <div className="row">
                  <SourceBadge type={obs.sourceType} />
                  <span className="caption">
                    {obs.date || '날짜 모름'} {obs.timeKnown && obs.time ? obs.time : '(시각 모름)'} · {obs.region}
                  </span>
                </div>
                {obs.drawingDataUrl ? <img src={obs.drawingDataUrl} alt="내가 그린 달" style={{ width: 120, height: 120, borderRadius: '50%' }} /> : null}
                {asset ? <MediaPhoto asset={asset} compact /> : null}
                <p className="caption" style={{ margin: 0 }}>
                  {obs.brightDescription}
                </p>
                <p className="micro">{uncertain ? '본 시각을 모르거나 그림·사진이 기울어져 있을 수 있어서, 밝은 부분의 크기만 비교해요.' : '본 시각을 알고 있어서, 그날 그 시각의 달과 비교할 수 있어요.'}</p>
              </>
            ) : (
              <p className="caption" style={{ margin: 0 }}>
                3단계 관측 카드가 없어요. 4단계에서 고른 날짜만으로도 할 수 있어요.
              </p>
            )}
          </div>
          <div className="card stack-sm">
            {target?.date ? (
              <>
                <div className="row">
                  <SourceBadge type={target.source === 'kasi' ? 'institution-forecast' : 'app-calculation'} />
                </div>
                <p className="caption" style={{ margin: 0 }}>
                  {target.region} {target.date} · 월령 {target.lunarAge ?? '자료 없음'} · 달 뜸 {fmtTime(target.moonrise)} · 달 짐 {fmtTime(target.moonset)}
                </p>
                {typeof target.approxTheta === 'number' ? (
                  <div className="row">
                    <PhaseDisk theta={target.approxTheta} size={56} hideName />
                    <span className="micro">월령으로 그려 본 달 모양</span>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="caption" style={{ margin: 0 }}>
                4단계 목표 카드가 없어요.
              </p>
            )}
          </div>
        </div>
        <div>
          <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} height={360} onRendererChange={setRenderer}>
            <button type="button" className="btn btn--on-dark" onClick={submit} disabled={!usingObs && !target?.date}>
              이 자리로 제출
            </button>
            {attempt ? (
              <div className="card stack-sm" style={{ padding: 12 }}>
                <span className="mono">제출함 · {positionNo(attempt.state.theta)}번 자리</span>
                {(attempt.result as { judgement?: PhaseJudgement | null }).judgement ? (
                  <p className="caption" style={{ margin: 0 }}>
                    {(attempt.result as { judgement: PhaseJudgement }).judgement.feedback}
                  </p>
                ) : (
                  <p className="caption" style={{ margin: 0 }}>
                    그림은 앱이 맞고 틀림을 정하지 않아요. 아래 버튼으로 컴퓨터가 계산한 달 모양을 보고 직접 비교해 보세요.
                  </p>
                )}
                <button type="button" className="btn btn--secondary btn--sm" onClick={loadRef} disabled={!dateForRef}>
                  컴퓨터가 계산한 그날의 달 모양 보기
                </button>
                {refErr ? <span className="note note--error">{refErr}</span> : null}
                {ref ? (
                  <div className="stack-sm">
                    <div className="row">
                      <SourceBadge type="app-calculation" />
                    </div>
                    <div className="row">
                      <PhaseDisk theta={ref.elongationDeg} size={56} hideName />
                      <span className="caption">
                        컴퓨터 계산: {litWords(ref.fraction)}
                        <br />내 모형: {litWords(illuminatedFraction(attempt.state.theta))}
                      </span>
                    </div>
                    <span className="micro">
                      컴퓨터 계산은 천문연구원 자료도, 내가 본 달도 아니에요. {timeKnown ? `${dateForRef} ${timeForRef} 기준이에요.` : `본 시각을 몰라서 ${dateForRef} 밤 9시로 계산했어요.`}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </ModelLab>
        </div>
      </div>
      <p className="caption">자료와 모형이 똑같지 않아도 괜찮아요. 사진이 기울어져 있거나, 본 시각을 정확히 모르거나, 모형을 단순하게 만들었기 때문일 수 있어요. 다음 장면에서 정리해요.</p>
    </div>
  );
}

function Facts() {
  useScene(STEP, 's07-facts');
  useAutoComplete(STEP, 's07-facts', ['q07-fact-obs', 'q07-fact-data', 'q07-fact-model', 'q07-fact-diff']);
  return (
    <div className="stack">
      <p className="lead">네 가지를 한 문장씩 써요. 이 문장들은 마지막 보고서로 이어져요.</p>
      <TextQuestion qid="q07-fact-obs" stepId={STEP} sceneId="s07-facts" prompt="1) 관측 카드(내가 본 달이나 사진)에서 알게 된 것" rows={2} placeholder="예: 9월 13일 저녁, 오른쪽이 반보다 조금 더 밝았다" />
      <TextQuestion qid="q07-fact-data" stepId={STEP} sceneId="s07-facts" prompt="2) 천문연구원 자료(또는 컴퓨터 계산)에서 알게 된 것" rows={2} placeholder="예: 그날 월령은 10.2였고 달은 오후 3시 50분에 떴다" />
      <TextQuestion qid="q07-fact-model" stepId={STEP} sceneId="s07-facts" prompt="3) 모형으로 설명할 수 있게 된 것" rows={2} placeholder="예: 달을 4번 자리 근처에 두면 오른쪽이 반보다 크게 밝게 보인다" />
      <TextQuestion qid="q07-fact-diff" stepId={STEP} sceneId="s07-facts" prompt="4) 자료와 모형이 똑같지 않았다면, 그 까닭으로 생각나는 것" rows={2} placeholder="예: 내가 본 시각을 정확히 몰라서 / 사진이 기울어져 있어서" />
    </div>
  );
}

export default function Step07({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's07-place':
      return <Place />;
    case 's07-facts':
      return <Facts />;
    default:
      return null;
  }
}
