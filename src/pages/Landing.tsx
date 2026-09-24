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
    api<{ appName: string }>('/api/config').then((c) => c.appName && setAppName(c.appName)).catch(() => undefined);
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
        <span className="mono">Middle school science · Moon</span>
        <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 4.5rem)' }}>{appName}</h1>
        <p className="lead">
          실제 관측, 공공데이터, 직접 움직이는 3D 모형, 일식·월식 탐구가 하나의 보고서로 이어지는 개인 학습 앱이에요. 이름이나 회원가입 없이 <strong>수업 코드</strong>만으로 시작해요.
        </p>
      </header>

      <div className="grid-2" style={{ marginTop: 48, alignItems: 'start' }}>
        <form className="card stack" onSubmit={submit} aria-labelledby="join-h">
          <h2 id="join-h" style={{ fontSize: 'var(--fs-feature)' }}>
            {mode === 'join' ? '수업 코드로 입장' : '다른 기기에서 이어 하기'}
          </h2>
          {status === 'joined' ? (
            <p className="note note--ok">
              이 기기에 이어 할 기록이 있어요. <Link to="/learn">이어서 학습하기</Link>
            </p>
          ) : null}
          <div className="field">
            <label htmlFor="code">수업 코드 (교사가 알려준 6자리)</label>
            <input id="code" className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" inputMode="text" placeholder="예: K7QM3R" required minLength={4} maxLength={8} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', letterSpacing: '0.2em' }} />
          </div>
          {mode === 'recover' ? (
            <div className="field">
              <label htmlFor="key">개인 복구 키 (12단계나 상단 메뉴에서 발급받은 것)</label>
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
              {busy ? '확인 중…' : mode === 'join' ? '입장하기' : '기록 불러오기'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setMode(mode === 'join' ? 'recover' : 'join')}>
              {mode === 'join' ? '다른 기기에서 이어 하기' : '수업 코드로 새로 입장'}
            </button>
          </div>
        </form>

        <aside className="stack">
          <section className="card card--stone stack-sm">
            <span className="mono">Privacy</span>
            <h3 style={{ fontSize: 'var(--fs-body-lg)' }}>저장되는 것과 저장되지 않는 것</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 'var(--fs-caption)' }}>
              <li>입장할 때 이름·반·번호·이메일을 받지 않아요. 화면에는 무작위 표식(예: 달-3F7K)만 보여요.</li>
              <li>활동 응답·관측 카드·모형 상태는 자동 저장되고, 같은 기기에서 이어 할 수 있어요.</li>
              <li>보고서를 쓰는 12단계에서만 교사가 켜 둔 항목(이름·학년·반·번호)을 입력해요.</li>
              <li>자유 서술과 그림에는 개인정보를 넣지 마세요. 사진 위치 정보는 업로드 시 제거돼요.</li>
              <li>수업 코드는 입장 수단일 뿐, 다른 학생의 기록을 볼 수 있는 권한이 아니에요.</li>
            </ul>
          </section>
          <section className="card stack-sm">
            <span className="mono">Teacher</span>
            <p className="caption" style={{ margin: 0 }}>
              교사는 <Link to="/teacher">교사 화면</Link>에서 수업을 만들고 코드를 발급해요.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
