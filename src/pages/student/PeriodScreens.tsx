import { Link, Navigate, useParams } from 'react-router';
import { useSession } from '@/store/session';
import { PERIODS, STEPS, scenesFor } from '@/content/steps';
import { BADGES } from '@/content/badges';
import { periodProgress } from '@/lib/scenes';
import { Q01_OPTIONS } from '@/lib/report';
import { QID } from '@shared/questionIds';

/** 차시 시작 화면: 오늘의 질문, 할 일 3가지, 지난 차시의 내 기록 */
export function PeriodIntro() {
  const { n = '1' } = useParams();
  const bundle = useSession((s) => s.bundle)!;
  const mode = bundle.classSession.mode;
  const period = PERIODS[mode].find((p) => p.number === Number(n));
  if (!period) return <Navigate to="/learn" replace />;
  const prev = PERIODS[mode].find((p) => p.number === period.number - 1);
  const first = STEPS.find((s) => s.id === period.steps[0])!;
  const firstScene = scenesFor(first, mode)[0];
  const q01 = bundle.responses.find((r) => r.questionId === QID.q01Choice)?.first as { choice?: string } | undefined;
  const q01reason = (bundle.responses.find((r) => r.questionId === QID.q01Reason)?.latest as { text?: string } | undefined)?.text;
  const target = bundle.responses.find((r) => r.questionId === 'q04-target')?.latest as { date?: string; region?: string } | undefined;
  const totalMin = period.steps.reduce((a, s) => a + (STEPS.find((x) => x.id === s)?.minutes[mode] ?? 0), 0);
  return (
    <main id="main" className="scene stack" style={{ paddingTop: 40 }}>
      <div className="band stack">
        <span className="mono mono--dark">
          Period {period.number} · 권장 {totalMin}분 (강제 종료 타이머 아님)
        </span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>{period.title}</h1>
        <p className="lead" style={{ margin: 0 }}>
          오늘의 질문: <strong>{period.question}</strong>
        </p>
      </div>
      <div className="grid-2">
        <section className="card stack-sm">
          <span className="mono">오늘 할 일 3가지</span>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {period.todos.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {periodProgress(bundle, period.number).map(({ step, status }) => (
              <div key={step.id} className="row row--between" style={{ fontSize: 'var(--fs-caption)' }}>
                <span>
                  <span className="mono">{String(step.number).padStart(2, '0')}</span> {step.title} · {step.minutes[mode]}분
                </span>
                <span className={`chip ${status === 'completed' ? 'chip--green' : status === 'partial' ? 'chip--coral' : 'chip--stone'}`}>{status === 'completed' ? '완료' : status === 'partial' ? '진행 중' : status === 'visited' ? '방문함' : '아직'}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card card--stone stack-sm">
          <span className="mono">{prev ? '지난 차시의 내 기록' : '시작하기 전에'}</span>
          {prev ? (
            <>
              {q01?.choice ? (
                <p style={{ margin: 0 }}>
                  처음 생각: <strong>{Q01_OPTIONS[q01.choice]}</strong>
                  {q01reason ? <span className="caption"> — {q01reason}</span> : null}
                </p>
              ) : (
                <p className="caption" style={{ margin: 0 }}>아직 01의 첫 생각이 없어요. 이전 차시 단계로 돌아가 채울 수 있어요.</p>
              )}
              {target?.date ? (
                <p style={{ margin: 0 }}>
                  고른 자료: {target.region} {target.date}
                </p>
              ) : null}
              {bundle.badges.length ? (
                <div className="row">
                  {bundle.badges.map((b) => (
                    <span key={b.badgeId} className="chip chip--green">
                      {BADGES[b.badgeId].title}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="caption" style={{ margin: 0 }}>
              이 앱에서 당신은 ‘서로 다른 달의 얼굴을 증거로 설명하는 개인 연구자’예요. 빠르기나 순위가 아니라 발견과 설명의 개선을 기록해요. 답은 언제든 고칠 수 있고 처음 생각도 함께 보관돼요.
            </p>
          )}
        </section>
      </div>
      <div className="row">
        <Link className="btn" to={`/learn/${first.id}/${firstScene.id}`}>
          {period.number === 1 ? '시작하기' : `${period.number}차시 시작하기`} →
        </Link>
        {prev ? (
          <Link className="btn btn--ghost" to={`/learn/period/${prev.number}/outro`}>
            지난 차시 마무리 다시 보기
          </Link>
        ) : null}
      </div>
    </main>
  );
}

/** 차시 종료 화면: 만든 결과와 다음 질문 */
export function PeriodOutro() {
  const { n = '1' } = useParams();
  const bundle = useSession((s) => s.bundle)!;
  const mode = bundle.classSession.mode;
  const period = PERIODS[mode].find((p) => p.number === Number(n));
  if (!period) return <Navigate to="/learn" replace />;
  const next = PERIODS[mode].find((p) => p.number === period.number + 1);
  const results = periodProgress(bundle, period.number);
  return (
    <main id="main" className="scene stack" style={{ paddingTop: 40 }}>
      <div className="band stack">
        <span className="mono mono--dark">Period {period.number} · 마무리</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>오늘 만든 것</h1>
        <div className="stack-sm">
          {results.map(({ step, status }) => (
            <div key={step.id} className="row row--between" style={{ borderTop: '1px solid rgba(255,255,255,.2)', paddingTop: 8 }}>
              <span>
                <span className="mono mono--dark">{String(step.number).padStart(2, '0')}</span> {step.title} — <span style={{ opacity: 0.8 }}>{step.outcome}</span>
              </span>
              <span className={`chip ${status === 'completed' ? 'chip--on-dark' : 'chip--coral'}`}>{status === 'completed' ? '완료' : status === 'partial' ? '진행 중' : '아직'}</span>
            </div>
          ))}
        </div>
        <p className="lead" style={{ margin: 0 }}>
          다음 질문: <strong>{period.closingQuestion}</strong>
        </p>
      </div>
      <div className="row">
        {next ? (
          <Link className="btn" to={`/learn/period/${next.number}/intro`}>
            {next.number}차시로 →
          </Link>
        ) : (
          <Link className="btn" to="/learn/s12/s12-submit">
            보고서 확인하기
          </Link>
        )}
        <Link className="btn btn--ghost" to="/learn">
          완료하지 않은 장면으로 돌아가기
        </Link>
      </div>
      <p className="caption">완료하지 않은 활동은 나중에 다시 살펴볼 수 있어요. 교사가 특정 단계를 닫아 두었을 수도 있어요.</p>
    </main>
  );
}
