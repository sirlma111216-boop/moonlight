import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router';
import { teacherApi } from './teacherApi';
import TeacherHome from './TeacherHome';
import TeacherClass from './TeacherClass';

function Login({ onDone }: { onDone: () => void }) {
  const [modes, setModes] = useState<string[]>([]);
  const [key, setKey] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    teacherApi.authModes().then((r) => setModes(r.modes)).catch(() => setModes([]));
  }, []);
  async function go(mode: string) {
    setBusy(true);
    setErr(null);
    try {
      await teacherApi.login({ mode, key });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container" style={{ paddingTop: 48, maxWidth: 560 }}>
      <span className="mono">Teacher</span>
      <h1 style={{ fontSize: '2.2rem' }}>교사 화면</h1>
      <p className="caption">교사 인증은 서버에서 검증해요. 학생 세션으로는 이 화면에 들어올 수 없어요.</p>
      <div className="card stack">
        {modes.includes('access') ? (
          <div className="stack-sm">
            <p style={{ margin: 0 }}>Cloudflare Access 로 보호된 주소로 접속했다면 아래를 눌러 세션을 만드세요.</p>
            <button type="button" className="btn" disabled={busy} onClick={() => go('access')}>
              Cloudflare Access 로 계속
            </button>
          </div>
        ) : null}
        {modes.includes('key') ? (
          <form
            className="stack-sm"
            onSubmit={(e) => {
              e.preventDefault();
              go('key');
            }}
          >
            <div className="field">
              <label htmlFor="tkey">교사 접근 키 (서버 비밀값 TEACHER_ACCESS_KEY)</label>
              <input id="tkey" type="password" className="input" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" />
            </div>
            <button className="btn" type="submit" disabled={busy || !key}>
              접근 키로 로그인
            </button>
            <span className="micro">1분에 5회까지 시도할 수 있어요. 운영에서는 Cloudflare Access 연동을 권장해요(docs/DEPLOY.md).</span>
          </form>
        ) : null}
        {modes.includes('dev') ? (
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => go('dev')}>
            개발용 교사 로그인 (로컬 전용)
          </button>
        ) : null}
        {modes.length === 0 ? <p className="note note--warn">사용 가능한 교사 인증 방식이 없어요. 서버에 TEACHER_ACCESS_KEY 또는 Cloudflare Access 설정이 필요해요.</p> : null}
        {err ? (
          <p className="note note--error" role="alert">
            {err}
          </p>
        ) : null}
      </div>
      <p className="caption" style={{ marginTop: 16 }}>
        <Link to="/">학생 입장 화면으로</Link>
      </p>
    </div>
  );
}

export default function TeacherApp() {
  const [me, setMe] = useState<{ teacherId: string; mode: string } | null | undefined>(undefined);
  const nav = useNavigate();
  const refresh = () => teacherApi.me().then((r) => setMe(r.teacher)).catch(() => setMe(null));
  useEffect(() => {
    void refresh();
  }, []);
  if (me === undefined) return <p className="container" style={{ padding: 40 }}>확인 중…</p>;
  if (!me) return <Login onDone={refresh} />;
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/teacher" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="mono">Teacher</span> <strong>교사 화면</strong>
          </Link>
          <span className="chip chip--stone">
            {me.mode === 'access' ? 'Access' : me.mode === 'key' ? '접근 키' : '개발'} · {me.teacherId}
          </span>
          <span style={{ flex: 1 }} />
          <Link className="btn btn--ghost btn--sm" to="/">
            학생 화면
          </Link>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={async () => {
              await teacherApi.logout();
              setMe(null);
              nav('/teacher');
            }}
          >
            로그아웃
          </button>
        </div>
      </header>
      <main id="main" className="scene" style={{ paddingTop: 24 }}>
        <Routes>
          <Route index element={<TeacherHome />} />
          <Route path="class/:id" element={<TeacherClass />} />
        </Routes>
      </main>
    </div>
  );
}
