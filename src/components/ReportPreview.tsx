import type { SourceType, StudentBundle } from '@shared/types';
import { SOURCE_LABEL } from '@shared/types';
import { QID } from '@shared/questionIds';
import { SECTION_DEFS, modelLine } from '@/lib/report';
import { PhaseDisk } from '@/components/PhaseDisk';
import { OrbitSchematic } from '@/components/OrbitSchematic';
import { SourceBadge } from '@/components/SourceBadge';
import { BADGES } from '@/content/badges';
import { ASSET_SLOTS } from '@/content/assets';
import { VIDEO_SLOTS } from '@/content/videos';
import { positionNo } from '@/lib/words';

const CONFIDENCE = { low: '잘 모르겠음', mid: '어느 정도', high: '확실함' } as const;

/** 보고서 미리보기·인쇄 공용. 학생이 쓴 문장만 싣고 앱이 결론을 만들지 않는다. */
export function ReportPreview({ bundle, forPrint = false }: { bundle: StudentBundle; forPrint?: boolean }) {
  const r = bundle.report;
  const cls = bundle.classSession;
  const identity = r?.identity ?? {};
  const modelAttempt = [...bundle.attempts].reverse().find((a) => a.submitted && !a.isSandbox && (a.stepId === 's07' || a.stepId === 's06'));
  const eclipseAttempts = bundle.attempts.filter((a) => a.submitted && !a.isSandbox && a.stepId === 's10');
  const obs = bundle.observations[bundle.observations.length - 1];
  const asset = obs?.mediaAssetId ? bundle.mediaAssets.find((m) => m.id === obs.mediaAssetId) : null;
  const monthSnap = bundle.snapshots.find((s) => s.id.startsWith('month:'));
  const target = bundle.responses.find((x) => x.questionId === 'q04-target')?.latest as { date?: string; region?: string; lunarAge?: number | null; moonrise?: string | null; moonset?: string | null } | undefined;
  const myQuestion = (bundle.responses.find((x) => x.questionId === QID.q01MyQuestion)?.latest as { text?: string } | undefined)?.text;
  const sandbox = bundle.attempts.filter((a) => a.isSandbox);
  const watched = VIDEO_SLOTS.filter((v) => bundle.responses.some((x) => x.questionId === `${v.id}-after` && (x.latest as { text?: string })?.text?.trim()));
  const cover = ASSET_SLOTS['report-cover'];
  const req = (monthSnap?.request ?? {}) as Record<string, string>;
  const order: SourceType[] = ['my-observation', 'provided-observation', 'institution-forecast', 'app-calculation', 'learning-model'];

  return (
    <article className={`stack ${forPrint ? 'print-page' : ''}`} aria-label="나의 달 설명서">
      <header className="print-section stack-sm">
        {cover.src ? <img src={cover.src} alt="" aria-hidden="true" style={{ maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--r-lg)' }} /> : null}
        <span className="mono">나의 달 설명서 · {cls.title}</span>
        <h1 style={{ fontSize: '2rem' }}>{identity.name ? `${identity.name}의 달 설명서` : '나의 달 설명서'}</h1>
        <p className="caption" style={{ margin: 0 }}>
          {[identity.grade && `${identity.grade}학년`, identity.classNo && `${identity.classNo}반`, identity.number && `${identity.number}번`].filter(Boolean).join(' ')} · 참여 표식 {bundle.participant.tag} ·{' '}
          {r?.status === 'submitted' ? `제출 ${r.submittedAt?.slice(0, 16).replace('T', ' ')}` : '아직 제출 전'}
        </p>
        <p className="caption" style={{ margin: 0 }}>
          탐구 질문: 같은 달인데 왜 밝게 보이는 부분이 날마다 다를까? · 초승달과 월식은 같은 걸까?
        </p>
      </header>

      {SECTION_DEFS.map((def) => {
        const sec = r?.sections.find((s) => s.id === def.id);
        const text = sec?.text?.trim();
        if (!text && !sec?.required) return null;
        return (
          <section key={def.id} className="print-section">
            <h3 style={{ fontSize: 'var(--fs-body-lg)', marginBottom: 4 }}>
              {def.title} {sec?.required ? <span className="chip chip--stone">꼭 쓰기</span> : null}
            </h3>
            {text ? (
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{text}</p>
            ) : (
              <p className="caption" style={{ margin: 0 }}>
                (아직 쓰지 않았어요)
              </p>
            )}
            {def.id === 'wonder' && myQuestion ? (
              <p className="caption" style={{ marginTop: 6 }}>
                1단계에서 쓴 ‘내가 궁금한 것’: “{myQuestion}”
              </p>
            ) : null}
            {def.id === 'model' && modelAttempt ? (
              <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
                <OrbitSchematic theta={modelAttempt.state.theta} size={170} showSightline label="우주 위에서 내려다본 내 모형" />
                <PhaseDisk theta={modelAttempt.state.theta} size={110} />
                <span className="caption">
                  <SourceBadge type="learning-model" /> {modelLine(modelAttempt.state.theta)} {(modelAttempt.result as { renderer?: string })?.renderer === '2d' ? '(간단한 그림으로 조작)' : '(3D로 조작)'}
                </span>
              </div>
            ) : null}
            {def.id === 'eclipse-conditions' && eclipseAttempts.length ? (
              <div className="row" style={{ marginTop: 8 }}>
                {eclipseAttempts.map((a) => (
                  <div key={a.id} style={{ textAlign: 'center' }}>
                    <OrbitSchematic theta={a.state.theta} inclination={a.state.inclination} nodeLongitude={a.state.nodeLongitude} size={130} showShadow label={a.mode === 'eclipse-solar' ? '일식 모습' : '월식 모습'} />
                    <span className="micro">{a.mode === 'eclipse-solar' ? '일식' : '월식'}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {sec?.refs.length ? (
              <p className="micro" style={{ marginTop: 6 }}>
                근거: {sec.refs.map((x) => x.label).join(' · ')}
              </p>
            ) : null}
          </section>
        );
      })}

      <section className="print-section stack-sm">
        <h3 style={{ fontSize: 'var(--fs-body-lg)' }}>내가 쓴 자료 모음</h3>
        {obs ? (
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {obs.drawingDataUrl ? <img src={obs.drawingDataUrl} alt="내가 그린 달" style={{ width: 90, height: 90, borderRadius: '50%' }} /> : null}
            {asset?.src ? <img src={asset.src} alt={asset.alt || asset.title} style={{ width: 120, borderRadius: 8 }} /> : null}
            <div className="caption">
              <SourceBadge type={obs.sourceType} /> {obs.date || '날짜 모름'} {obs.timeKnown && obs.time ? obs.time : '(시각 모름)'} · {obs.region} · 확실한 정도: {CONFIDENCE[obs.confidence]}
              <div>{obs.brightDescription}</div>
              {asset ? (
                <div>
                  사진: {asset.title} — 찍은 사람 {asset.credit || asset.photographer || '알 수 없음'}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {target?.date ? (
          <div className="caption">
            <SourceBadge type={monthSnap?.isExample ? 'app-calculation' : 'institution-forecast'} /> {target.region} {target.date} · 월령 {target.lunarAge ?? '자료 없음'} · 달 뜸 {target.moonrise ?? '없음'} · 달 짐 {target.moonset ?? '없음'}
            {monthSnap ? (
              <div>
                살펴본 자료: {req.region} {req.year}년 {req.month}월 · 불러온 날 {monthSnap.fetchedAt.slice(0, 10)}
              </div>
            ) : null}
          </div>
        ) : null}
        {r?.attachSandbox && sandbox.length ? (
          <div className="caption">
            <strong>자유 실험 기록</strong>
            {sandbox.map((a) => {
              const x = a.result as { predict?: string; observe?: string };
              return (
                <div key={a.id}>
                  · 달 {positionNo(a.state.theta)}번 자리{a.state.inclination > 0.05 ? ', 길 약 5도 기울임' : ''} — 예측: {x.predict} / 본 것: {x.observe}
                </div>
              );
            })}
          </div>
        ) : null}
        {watched.length ? (
          <div className="caption">
            참고한 영상 (관측 자료가 아니에요):{' '}
            {watched.map((v) => (
              <span key={v.id}>
                {v.title} ({v.officialUrl}){' '}
              </span>
            ))}
          </div>
        ) : null}
        {bundle.badges.length ? <div className="caption">받은 배지: {bundle.badges.map((b) => BADGES[b.badgeId].title).join(', ')}</div> : null}
        <div className="micro">
          이름표 뜻: {order.map((k) => SOURCE_LABEL[k]).join(' / ')}. 3D 모형은 이해를 돕기 위해 크기와 거리를 바꿔 만들었어요. 표의 달 모양 그림은 월령으로 그려 본 것이에요.
        </div>
      </section>
    </article>
  );
}
