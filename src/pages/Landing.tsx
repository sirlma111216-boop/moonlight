import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useSession } from '@/store/session';
import { api } from '@/lib/api';

export default function Landing() {
  const status = useSession((s) => s.status);
  const join = useSession((s) => s.join);
  const recover = useSession((s) => s.recover);
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [key, setKey] = useState('');
  const [mode, setMode] = useState<'join' | 'recover'>('join');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [appName, setAppName] = useState('달의 비밀: 관측에서 우주까지');
  useEffect(() => {
    api<{ appName: string }>('/api/config')
      .then((c) => c.appName && setAppName(c.appName))
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'join') await join(code);
      else await recover(code, key);
      nav('/learn');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <header className="stack" style={{ maxWidth: 760 }}>
        <span className="mono">중학교 과학 · 달</span>
        <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}>{appName}</h1>
        <p className="lead">
          달은 왜 날마다 모양이 바뀔까요? 실제 달 사진과 천문연구원 자료를 살펴보고, 3D 모형으로 달을 직접 옮겨 보면서 알아봐요. 일식과 월식도 만들어 보고, 마지막에는 나만의 달 설명서를 써요.
        </p>
        <p className="caption">이름이나 회원가입 없이, 선생님이 알려 준 수업 코드만 있으면 시작할 수 있어요.</p>
      </header>

      <div className="grid-2" style={{ marginTop: 48, alignItems: 'start' }}>
        <form className="card stack" onSubmit={submit} aria-labelledby="join-h">
          <h2 id="join-h" style={{ fontSize: 'var(--fs-feature)' }}>
            {mode === 'join' ? '수업 코드로 들어가기' : '다른 기기에서 이어 하기'}
          </h2>
          {status === 'joined' ? (
            <p className="note note--ok">
              이 기기에 하던 기록이 있어요. <Link to="/learn">이어서 하기</Link>
            </p>
          ) : null}
          <div className="field">
            <label htmlFor="code">수업 코드 (선생님이 알려 준 6자리)</label>
            <input id="code" className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" inputMode="text" placeholder="예: K7QM3R" required minLength={4} maxLength={8} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', letterSpacing: '0.2em' }} />
          </div>
          {mode === 'recover' ? (
            <div className="field">
              <label htmlFor="key">복구 키 (12단계에서 받아 둔 열쇠 번호)</label>
              <input id="key" className="input" value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} autoComplete="off" placeholder="XXXX-XXXX-XXXX-XXXX" required />
            </div>
          ) : null}
          {err ? (
            <p className="note note--error" role="alert">
              {err}
            </p>
          ) : null}
          <div className="row">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? '확인하는 중…' : mode === 'join' ? '들어가기' : '내 기록 불러오기'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setMode(mode === 'join' ? 'recover' : 'join')}>
              {mode === 'join' ? '다른 기기에서 이어 하기' : '수업 코드로 새로 들어가기'}
            </button>
          </div>
        </form>

        <aside className="stack">
          <section className="card card--stone stack-sm">
            <span className="mono">내 정보는 어떻게 되나요?</span>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--fs-caption)' }}>
              <li>들어올 때 이름, 반, 번호를 묻지 않아요. 화면에는 ‘달-3F7K’ 같은 무작위 표식만 보여요.</li>
              <li>내 답과 그림은 저절로 저장돼요. 같은 기기에서 다시 들어오면 이어서 할 수 있어요.</li>
              <li>이름은 마지막 12단계 보고서를 쓸 때만, 선생님이 정한 칸에 적어요.</li>
              <li>글이나 그림에 집 주소, 전화번호 같은 개인 정보를 쓰지 마세요.</li>
              <li>수업 코드를 알아도 다른 친구의 기록은 볼 수 없어요.</li>
            </ul>
          </section>
          <section className="card stack-sm">
            <span className="mono">선생님</span>
            <p className="caption" style={{ margin: 0 }}>
              선생님은 <Link to="/teacher">교사 화면</Link>에서 수업을 만들고 코드를 받아요.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
