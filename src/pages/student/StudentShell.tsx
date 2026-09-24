import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import { useSession } from '@/store/session';
import { usePrefs } from '@/store/prefs';
import { STEPS, scenesFor } from '@/content/steps';
import { findScene, nextTarget, prevTarget, resumeTarget, sceneStatus, stepOpen, stepStatus } from '@/lib/scenes';
import { PeriodIntro, PeriodOutro } from './PeriodScreens';

const Sandbox = lazy(() => import('./Sandbox'));
const stepModules: Record<string, React.LazyExoticComponent<React.ComponentType<{ sceneId: string }>>> = {
  s01: lazy(() => import('./steps/Step01')),
  s02: lazy(() => import('./steps/Step02')),
  s03: lazy(() => import('./steps/Step03')),
  s04: lazy(() => import('./steps/Step04')),
  s05: lazy(() => import('./steps/Step05')),
  s06: lazy(() => import('./steps/Step06')),
  s07: lazy(() => import('./steps/Step07')),
  s08: lazy(() => import('./steps/Step08')),
  s09: lazy(() => import('./steps/Step09')),
  s10: lazy(() => import('./steps/Step10')),
  s11: lazy(() => import('./steps/Step11')),
  s12: lazy(() => import('./steps/Step12')),
};

function SaveStatus() {
  const save = useSession((s) => s.save);
  const err = useSession((s) => s.lastError);
  const retry = useSession((s) => s.retrySaves);
  const label = { idle: '', saving: '저장하는 중…', saved: '저장됨', offline: '인터넷이 끊겼어요 · 다시 시도하는 중', error: '저장하지 못했어요' }[save.status];
  return (
    <span className="save-status" data-status={save.status} role="status" aria-live="polite" title={err ?? undefined}>
      {label}
      {save.status === 'error' || save.status === 'offline' ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={retry} style={{ marginLeft: 6 }}>
          다시 시도
        </button>
      ) : null}
    </span>
  );
}

function PrefsMenu() {
  const { fontSize, setFontSize, reduceMotion, setReduceMotion, lowGraphics, setLowGraphics } = usePrefs();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="btn btn--secondary btn--sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        보기 설정
      </button>
      {open ? (
        <div className="card" style={{ position: 'absolute', right: 0, top: 40, zIndex: 40, minWidth: 260 }} role="dialog" aria-label="보기 설정">
          <div className="field">
            <span className="label">글자 크기</span>
            <div className="row">
              {(['normal', 'large', 'xlarge'] as const).map((f) => (
                <button key={f} type="button" className={`btn btn--sm ${fontSize === f ? '' : 'btn--secondary'}`} aria-pressed={fontSize === f} onClick={() => setFontSize(f)}>
                  {f === 'normal' ? '보통' : f === 'large' ? '크게' : '더 크게'}
                </button>
              ))}
            </div>
          </div>
          <label className="row" style={{ marginTop: 10 }}>
            <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} /> 움직임 줄이기
          </label>
          <label className="row" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={lowGraphics} onChange={(e) => setLowGraphics(e.target.checked)} /> 3D 화면 가볍게 (기기가 느릴 때)
          </label>
        </div>
      ) : null}
    </div>
  );
}

function TopBar() {
  const bundle = useSession((s) => s.bundle)!;
  const leave = useSession((s) => s.leave);
  const nav = useNavigate();
  const { stepId } = useParams();
  const [help, setHelp] = useState(false);
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/learn" className="topbar__title" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="mono">Moon</span> <strong>{bundle.classSession.title}</strong> <span className="chip chip--stone">{bundle.classSession.mode}차시</span>
        </Link>
        <nav className="steps" aria-label="단계">
          {STEPS.map((st) => {
            const status = stepStatus(bundle, st);
            const open = stepOpen(bundle, st.id);
            const first = scenesFor(st, bundle.classSession.mode)[0];
            return (
              <Link
                key={st.id}
                to={open ? `/learn/${st.id}/${first.id}` : '#'}
                className={`step-dot ${status === 'completed' ? 'step-dot--done' : ''} ${open ? '' : 'step-dot--locked'}`}
                aria-current={stepId === st.id ? 'step' : undefined}
                aria-disabled={!open}
                title={open ? st.title : `${st.title} (선생님이 아직 열지 않았어요)`}
                onClick={(e) => !open && e.preventDefault()}
              >
                <span className="step-dot__n">{String(st.number).padStart(2, '0')}</span>
                <span>{st.title}</span>
                {status === 'completed' ? <span aria-label="완료">✓</span> : status === 'partial' ? <span aria-label="진행 중">·</span> : null}
              </Link>
            );
          })}
        </nav>
        <SaveStatus />
        <span className="chip chip--stone" title="이름 대신 쓰는 무작위 표식이에요">
          {bundle.participant.tag}
        </span>
        <PrefsMenu />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setHelp(true)}>
          도움말
        </button>
      </div>
      {help ? (
        <div className="container" style={{ paddingBottom: 12 }}>
          <div className="card card--stone stack-sm" role="dialog" aria-label="도움말">
            <p style={{ margin: 0 }}>
              위에 번호가 붙은 것이 <strong>단계</strong>예요. 한 단계 안에는 짧은 <strong>장면</strong>이 여러 개 있고, 맨 아래 ‘이전’과 ‘다음’으로 넘겨요. 답은 저절로 저장되고 나중에 고칠 수 있어요. 처음에 쓴 답도 지워지지 않아요.
            </p>
            <p className="caption" style={{ margin: 0 }}>
              화면 아래에 ‘들어와 봄 · 답 저장함 · 활동 마침’이 표시돼요. 들어와 보기만 하면 마친 것이 아니에요. 틀려도 처음부터 다시 하지 않아도 되고, 힌트를 써도 괜찮아요.
            </p>
            <div className="row">
              <button type="button" className="btn btn--sm" onClick={() => setHelp(false)}>
                닫기
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={async () => {
                  if (confirm('이 기기에 남은 내 기록을 지우고 나가요. 제출한 보고서는 그대로 남아요. 복구 키를 받아 두지 않았다면 다른 기기에서 이어 하기 어려워요. 나갈까요?')) {
                    await leave();
                    nav('/');
                  }
                }}
              >
                내 활동 끝내기 (여럿이 쓰는 기기일 때)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function SceneView() {
  const { stepId = '', sceneId = '' } = useParams();
  const bundle = useSession((s) => s.bundle)!;
  const nav = useNavigate();
  const mode = bundle.classSession.mode;
  const ref = findScene(mode, stepId, sceneId);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [stepId, sceneId]);
  if (!ref) return <Navigate to="/learn" replace />;
  if (!stepOpen(bundle, stepId)) {
    return (
      <main id="main" className="scene">
        <div className="scene-head">
          <h2>{ref.step.title}</h2>
          <p className="note note--warn">선생님이 아직 이 단계를 열지 않았어요. 다른 단계를 먼저 해도 돼요.</p>
        </div>
      </main>
    );
  }
  const Step = stepModules[stepId];
  const scenes = scenesFor(ref.step, mode);
  const go = (t: ReturnType<typeof nextTarget>) => {
    if (t.kind === 'scene') nav(`/learn/${t.stepId}/${t.sceneId}`);
    else if (t.kind === 'period-outro') nav(`/learn/period/${t.period}/outro`);
    else if (t.kind === 'period-intro') nav(`/learn/period/${t.period}/intro`);
    else nav('/learn');
  };
  const status = sceneStatus(bundle.progress, stepId, sceneId);
  return (
    <main id="main" className="scene">
      <div className="scene-head">
        <span className="mono">
          {ref.step.number}단계 · 장면 {ref.index + 1}/{ref.total} · 약 {ref.step.minutes[mode]}분
        </span>
        <h2>{ref.step.title}</h2>
        <p className="caption" style={{ margin: 0 }}>
          {ref.scene.title}
          {ref.scene.optional ? ' · 하고 싶을 때만' : ''}
        </p>
      </div>
      <Suspense fallback={<p className="muted">장면을 불러오는 중…</p>}>
        <Step sceneId={sceneId} />
      </Suspense>
      <nav className="scene-nav" aria-label="장면 이동">
        <button type="button" className="btn btn--secondary" onClick={() => go(prevTarget(mode, stepId, sceneId))}>
          ← 이전
        </button>
        <div className="scene-dots" aria-hidden="true">
          {scenes.map((s) => (
            <span key={s.id} data-state={s.id === sceneId ? 'current' : sceneStatus(bundle.progress, stepId, s.id) === 'completed' ? 'completed' : sceneStatus(bundle.progress, stepId, s.id) === 'answered' ? 'answered' : ''} />
          ))}
        </div>
        <div className="row">
          <span className="micro">{status === 'completed' ? '활동 마침' : status === 'answered' ? '답 저장함' : status === 'visited' ? '들어와 봄' : ''}</span>
          <button type="button" className="btn" onClick={() => go(nextTarget(mode, stepId, sceneId))}>
            다음 →
          </button>
        </div>
      </nav>
    </main>
  );
}

function Resume() {
  const bundle = useSession((s) => s.bundle)!;
  const t = resumeTarget(bundle);
  const started = bundle.progress.length > 0;
  if (!started) return <Navigate to="/learn/period/1/intro" replace />;
  return <Navigate to={`/learn/${t.stepId}/${t.sceneId}`} replace />;
}

export default function StudentShell() {
  const status = useSession((s) => s.status);
  if (status === 'loading') return <p className="container" style={{ padding: 40 }}>불러오는 중…</p>;
  if (status === 'anonymous') return <Navigate to="/" replace />;
  return (
    <div className="shell">
      <Routes>
        <Route path="sandbox" element={null} />
        <Route path="*" element={<TopBar />} />
      </Routes>
      <Suspense fallback={<p className="container" style={{ padding: 40 }}>불러오는 중…</p>}>
        <Routes>
          <Route index element={<Resume />} />
          <Route path="period/:n/intro" element={<PeriodIntro />} />
          <Route path="period/:n/outro" element={<PeriodOutro />} />
          <Route path="sandbox" element={<Sandbox />} />
          <Route path=":stepId/:sceneId" element={<SceneView />} />
          <Route path="*" element={<Navigate to="/learn" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
