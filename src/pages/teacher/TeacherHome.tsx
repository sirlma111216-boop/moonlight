import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { REGIONS } from '@shared/regions';
import { teacherApi, type TeacherClass } from './teacherApi';
import { todayKST } from '@/lib/publicdata';

export default function TeacherHome() {
  const [classes, setClasses] = useState<TeacherClass[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '달의 비밀 수업', mode: '3', region: '서울', periodStart: todayKST(), periodEnd: todayKST(), retentionDays: 30 });
  const [busy, setBusy] = useState(false);
  const load = () => teacherApi.classes().then(setClasses).catch((e) => setErr(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await teacherApi.createClass(form);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <div>
        <h2>내 수업</h2>
        <p className="caption">수업을 만들면 6자리 코드가 발급돼요. 학생은 코드만으로 입장하고 이름은 보고서 단계에서만 입력해요. 3차시 운영을 권장하며, 2차시에서는 관측 자료를 미리 준비하면 좋아요.</p>
      </div>
      {err ? <p className="note note--error">{err}</p> : null}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-sm">
          {classes === null ? <p className="muted">불러오는 중…</p> : classes.length === 0 ? <p className="note">아직 수업이 없어요. 오른쪽에서 만들어 보세요.</p> : null}
          {classes?.map((c) => (
            <Link key={c.id} to={`/teacher/class/${c.id}`} className="card row row--between" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div>
                <strong>{c.title}</strong>
                <div className="caption">
                  {c.mode}차시 · {c.region} · {c.periodStart}~{c.periodEnd} · 참여 {c.stats?.participants ?? 0}명 {c.endedAt ? '· 종료됨' : ''}
                </div>
              </div>
              <span className="mono" style={{ fontSize: '1.3rem', letterSpacing: '0.15em', color: 'var(--c-primary)' }}>
                {c.code}
              </span>
            </Link>
          ))}
        </div>
        <form className="card stack-sm" onSubmit={create}>
          <span className="mono">새 수업</span>
          <div className="field">
            <label htmlFor="c-title">수업 이름</label>
            <input id="c-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="c-mode">차시 모드</label>
              <select id="c-mode" className="select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="3">3차시 (권장)</option>
                <option value="2">2차시 압축</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-region">기본 지역</label>
              <select id="c-region" className="select" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.label}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="c-start">기간 시작 (04 기본 조회 월)</label>
              <input id="c-start" type="date" className="input" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="c-end">기간 끝</label>
              <input id="c-end" type="date" className="input" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-ret">수업 종료 후 보관 기간(일) — 법적 의무 기간이 아닌 기본 예시</label>
            <input id="c-ret" type="number" min={1} max={365} className="input" value={form.retentionDays} onChange={(e) => setForm({ ...form, retentionDays: Number(e.target.value) })} />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            수업 만들기
          </button>
        </form>
      </div>
    </div>
  );
}
