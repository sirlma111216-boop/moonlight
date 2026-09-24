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

const STEP = 's07';

function Place() {
  useScene(STEP, 's07-place');
  const bundle = useSession((s) => s.bundle)!;
  const saveAttempt = useSession((s) => s.saveAttempt);
  const obs = bundle.observations[bundle.observations.length - 1];
  const asset = obs?.mediaAssetId ? bundle.mediaAssets.find((m) => m.id === obs.mediaAssetId) : null;
  const target = bundle.responses.find((r) => r.questionId === 'q04-target')?.latest as { date?: string; region?: string; lunarAge?: number | null; approxTheta?: number | null; moonrise?: string | null; moonset?: string | null; source?: string; sourceLabel?: string } | undefined;
  const [state, setState] = useLabState('s07-place', { theta: 30 });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const attempt = bundle.attempts.find((a) => a.stepId === STEP && a.sceneId === 's07-place' && a.submitted);
  const [ref, setRef] = useState<{ fraction: number; elongationDeg: number; basis: string } | null>(null);
  const [refErr, setRefErr] = useState<string | null>(null);
  useAutoComplete(STEP, 's07-place', [], Boolean(attempt));

  const usingObs = Boolean(obs);
  const dateForRef = obs?.date || target?.date;
  const timeForRef = obs?.timeKnown && obs.time ? obs.time : '21:00';
  const uncertain = !obs?.timeKnown || obs?.sourceType === 'my-observation';

  function submit() {
    // 관측(그림/사진)은 정성 비교 — 회전·시각 불확실이면 좌우 판정을 하지 않는다
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
      const r = await api<{ fraction: number; elongationDeg: number; basis: string }>(`/api/publicdata/illumination?date=${dateForRef}&time=${timeForRef}`);
      setRef(r);
    } catch (e) {
      setRefErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="stack">
      <p className="lead">왼쪽에는 내 관측 카드와 공공데이터 근거, 오른쪽에는 3D 모형이 있어요. 자료의 위상을 모형으로 재현한 뒤 근거를 연결해요. 모형을 정답 위치에 먼저 놓아 주지 않아요.</p>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-sm">
          <div className="card stack-sm">
            {obs ? (
              <>
                <div className="row">
                  <SourceBadge type={obs.sourceType} extra={obs.sourceType === 'my-observation' ? '그림' : undefined} />
                  <span className="caption">
                    {obs.date || '날짜 미상'} {obs.timeKnown && obs.time ? obs.time : '(시각 모름)'} · {obs.region}
                  </span>
                </div>
                {obs.drawingDataUrl ? <img src={obs.drawingDataUrl} alt="내가 그린 달" style={{ width: 120, height: 120, borderRadius: '50%' }} /> : null}
                {asset ? <MediaPhoto asset={asset} compact /> : null}
                <p className="caption" style={{ margin: 0 }}>{obs.brightDescription}</p>
                <p className="micro">{uncertain ? '시각을 모르거나 그림/사진의 회전이 있을 수 있어 정성적으로만 비교해요.' : '시각이 있는 자료라 참고 배치와 정량 비교도 가능해요.'}</p>
              </>
            ) : (
              <p className="caption" style={{ margin: 0 }}>03의 관측 카드가 없어요. 04의 목표 자료만으로도 진행할 수 있어요.</p>
            )}
          </div>
          <div className="card stack-sm">
            {target?.date ? (
              <>
                <div className="row">
                  <SourceBadge type={target.source === 'kasi' ? 'institution-forecast' : 'app-calculation'} extra={target.sourceLabel} />
                </div>
                <p className="caption" style={{ margin: 0 }}>
                  {target.region} {target.date} · 월령 {target.lunarAge ?? '결측'} · 월출 {fmtTime(target.moonrise)} · 월몰 {fmtTime(target.moonset)}
                </p>
                {typeof target.approxTheta === 'number' ? (
                  <div className="row">
                    <PhaseDisk theta={target.approxTheta} size={56} hideName />
                    <span className="micro">월령을 이용한 근사 모형</span>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="caption" style={{ margin: 0 }}>04의 목표 카드가 없어요.</p>
            )}
          </div>
        </div>
        <div>
          <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} height={360} onRendererChange={setRenderer}>
            <button type="button" className="btn btn--on-dark" onClick={submit} disabled={!usingObs && !target?.date}>
              이 위치로 제출
            </button>
            {attempt ? (
              <div className="card stack-sm" style={{ padding: 12 }}>
                <span className="mono">제출됨 · {Math.round(attempt.state.theta)}°</span>
                {(attempt.result as { judgement?: PhaseJudgement | null }).judgement ? <p className="caption" style={{ margin: 0 }}>{(attempt.result as { judgement: PhaseJudgement }).judgement.feedback}</p> : <p className="caption" style={{ margin: 0 }}>그림 자료는 자동 판정하지 않아요. 아래 참고 배치와 정성적으로 비교해 보세요.</p>}
                <button type="button" className="btn btn--secondary btn--sm" onClick={loadRef}>
                  참고 배치 보기 (앱 계산)
                </button>
                {refErr ? <span className="note note--error">{refErr}</span> : null}
                {ref ? (
                  <div className="stack-sm">
                    <div className="row">
                      <SourceBadge type="app-calculation" extra={ref.basis} />
                    </div>
                    <div className="row">
                      <PhaseDisk theta={ref.elongationDeg} size={56} hideName />
                      <span className="caption">
                        앱 계산 밝은 비율 {Math.round(ref.fraction * 100)}% · 내 모형 {Math.round(illuminatedFraction(attempt.state.theta) * 100)}%
                      </span>
                    </div>
                    <span className="micro">참고 배치는 Astronomy Engine 계산이며 기관 자료도, 관측 자료도 아니에요. {uncertain ? '시각이 불확실해 21:00 기준으로 계산했어요.' : ''}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </ModelLab>
        </div>
      </div>
      <p className="caption">자료와 모형이 완전히 같지 않은 것은 자연스러워요. 사진의 회전, 관측 시각, 월령의 기준 시각, 모형의 단순화가 모두 이유가 될 수 있어요. 다음 장면에서 정리해요.</p>
    </div>
  );
}

function Facts() {
  useScene(STEP, 's07-facts');
  useAutoComplete(STEP, 's07-facts', ['q07-fact-obs', 'q07-fact-data', 'q07-fact-model', 'q07-fact-diff']);
  return (
    <div className="stack">
      <p className="lead">네 가지 사실을 한 문장씩 남겨요. 이 문장들은 보고서로 이어져요.</p>
      <TextQuestion qid="q07-fact-obs" stepId={STEP} sceneId="s07-facts" prompt="관측 자료에서 확인한 사실 한 가지" rows={2} placeholder="예: 9/13 저녁, 오른쪽이 반 넘게 밝았다" />
      <TextQuestion qid="q07-fact-data" stepId={STEP} sceneId="s07-facts" prompt="공공데이터에서 확인한 사실 한 가지" rows={2} placeholder="예: 그 날 월령은 10.2였고 월출은 15:50이었다" />
      <TextQuestion qid="q07-fact-model" stepId={STEP} sceneId="s07-facts" prompt="내가 모형으로 설명한 것 한 가지" rows={2} placeholder="예: 달을 태양에서 약 120° 위치에 두면 오른쪽이 반 넘게 밝게 보인다" />
      <TextQuestion qid="q07-fact-diff" stepId={STEP} sceneId="s07-facts" prompt="자료와 모형이 완전히 같지 않다면 가능한 이유 한 가지" rows={2} placeholder="예: 내가 본 시각을 정확히 몰라서 / 사진이 회전되어 있어서" />
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
