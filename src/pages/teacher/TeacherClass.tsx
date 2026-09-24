import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { ClassSettings, MediaAsset } from '@shared/types';
import { REGIONS } from '@shared/regions';
import { STEP_IDS, QID } from '@shared/questionIds';
import { STEPS } from '@/content/steps';
import { VIDEO_SLOTS } from '@/content/videos';
import { Q01_OPTIONS } from '@/lib/report';
import { MediaKindBadge } from '@/components/SourceBadge';
import { teacherApi, type AggregateResponse, type ApiStatusResponse, type TeacherClass as TC } from './teacherApi';

type Tab = 'overview' | 'media' | 'aggregate' | 'narratives' | 'change' | 'reports' | 'api' | 'guide';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '설정' },
  { id: 'media', label: '관측 자료' },
  { id: 'aggregate', label: '익명 집계' },
  { id: 'narratives', label: '서술 검토' },
  { id: 'change', label: '생각의 변화' },
  { id: 'reports', label: '보고서' },
  { id: 'api', label: 'API 상태' },
  { id: 'guide', label: '운영 안내' },
];

export default function TeacherClass() {
  const { id = '' } = useParams();
  const [cls, setCls] = useState<TC | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(() => teacherApi.getClass(id).then(setCls).catch((e) => setErr(e.message)), [id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  if (err) return <p className="note note--error">{err}</p>;
  if (!cls) return <p className="muted">불러오는 중…</p>;
  return (
    <div className="stack">
      <div className="row row--between">
        <div>
          <Link to="/teacher" className="caption">
            ← 내 수업
          </Link>
          <h2 style={{ marginBottom: 4 }}>{cls.title}</h2>
          <p className="caption" style={{ margin: 0 }}>
            {cls.mode}차시 · {cls.region} · 참여 {cls.stats?.participants ?? 0}명 {cls.endedAt ? `· 종료 ${cls.endedAt.slice(0, 10)}` : ''}
          </p>
        </div>
        <div className="band" style={{ padding: '12px 20px', textAlign: 'center' }}>
          <span className="mono mono--dark">수업 코드</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.4rem', letterSpacing: '0.2em' }}>{cls.code}</div>
        </div>
      </div>
      <nav className="row" aria-label="탭">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`btn btn--sm ${tab === t.id ? '' : 'btn--secondary'}`} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'overview' ? <Overview cls={cls} reload={reload} /> : null}
      {tab === 'media' ? <Media cls={cls} /> : null}
      {tab === 'aggregate' ? <Aggregate cls={cls} /> : null}
      {tab === 'narratives' ? <Narratives cls={cls} /> : null}
      {tab === 'change' ? <ChangeTable cls={cls} /> : null}
      {tab === 'reports' ? <Reports cls={cls} /> : null}
      {tab === 'api' ? <ApiStatus /> : null}
      {tab === 'guide' ? <Guide /> : null}
    </div>
  );
}

function Overview({ cls, reload }: { cls: TC; reload: () => Promise<void> }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ title: cls.title, mode: cls.mode, region: cls.region, periodStart: cls.periodStart, periodEnd: cls.periodEnd, retentionDays: cls.retentionDays });
  const [settings, setSettings] = useState<ClassSettings>(cls.settings);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    try {
      await teacherApi.updateClass(cls.id, { ...form, settings });
      await reload();
      setMsg('저장했어요.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card stack-sm">
        <span className="mono">기본</span>
        <div className="field">
          <label htmlFor="t-title">수업 이름</label>
          <input id="t-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="t-mode">차시 모드</label>
            <select id="t-mode" className="select" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as '3' | '2' })}>
              <option value="3">3차시 (권장)</option>
              <option value="2">2차시 압축</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-region">기본 지역</label>
            <select id="t-region" className="select" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
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
            <label htmlFor="t-ps">기간 시작</label>
            <input id="t-ps" type="date" className="input" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t-pe">기간 끝</label>
            <input id="t-pe" type="date" className="input" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="t-ret">보관 기간(일)</label>
            <input id="t-ret" type="number" className="input" min={1} max={365} value={form.retentionDays} onChange={(e) => setForm({ ...form, retentionDays: Number(e.target.value) })} />
          </div>
        </div>
        <div className="field">
          <span className="label">관측 계획 미션 목표 시간대</span>
          <div className="row">
            <input type="time" className="input" style={{ width: 'auto' }} value={settings.observationWindow.start} onChange={(e) => setSettings({ ...settings, observationWindow: { ...settings.observationWindow, start: e.target.value } })} aria-label="시작" />
            ~
            <input type="time" className="input" style={{ width: 'auto' }} value={settings.observationWindow.end} onChange={(e) => setSettings({ ...settings, observationWindow: { ...settings.observationWindow, end: e.target.value } })} aria-label="끝" />
          </div>
        </div>
        <div className="field">
          <span className="label">보고서 식별 항목 (끈 항목은 학생 화면에 나오지 않음)</span>
          <div className="row">
            {(['name', 'grade', 'classNo', 'number'] as const).map((k) => (
              <label key={k} className="row" style={{ gap: 4 }}>
                <input type="checkbox" checked={settings.identityFields[k]} onChange={(e) => setSettings({ ...settings, identityFields: { ...settings.identityFields, [k]: e.target.checked } })} /> {{ name: '이름', grade: '학년', classNo: '반', number: '번호' }[k]}
              </label>
            ))}
          </div>
        </div>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={settings.photoUploadEnabled} onChange={(e) => setSettings({ ...settings, photoUploadEnabled: e.target.checked })} /> 03 사진 업로드 허용 (P2 · R2 저장소가 설정되어야 작동. 꺼져 있으면 학생 화면에 업로드 UI 가 전혀 보이지 않음)
        </label>
        <div className="field">
          <span className="label">영상 사용 (교사가 재생·자막을 확인한 것만 켜세요)</span>
          {VIDEO_SLOTS.map((v) => (
            <label key={v.id} className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={settings.videos[v.id] ?? false} onChange={(e) => setSettings({ ...settings, videos: { ...settings.videos, [v.id]: e.target.checked } })} /> {v.title} {v.youtubeId ? '' : <span className="chip chip--warn">ID 미입력</span>}
            </label>
          ))}
        </div>
        <div className="field">
          <span className="label">열린 단계 (닫힌 단계는 학생이 진입 불가)</span>
          <div className="row">
            {STEP_IDS.map((s) => (
              <label key={s} className="row" style={{ gap: 4 }}>
                <input type="checkbox" checked={settings.openSteps.includes(s)} onChange={(e) => setSettings({ ...settings, openSteps: e.target.checked ? [...settings.openSteps, s] : settings.openSteps.filter((x) => x !== s) })} /> {s.slice(1)}
              </label>
            ))}
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={save}>
            저장
          </button>
          {msg ? <span className="caption">{msg}</span> : null}
        </div>
      </div>
      <div className="stack-sm">
        <div className="card stack-sm">
          <span className="mono">코드·종료·삭제</span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={async () => { if (confirm('코드를 새로 발급하면 기존 코드로는 입장할 수 없어요. 이미 입장한 학생의 세션은 유지돼요.')) { await teacherApi.regenerateCode(cls.id); await reload(); } }}>
            수업 코드 새로 발급
          </button>
          {!cls.endedAt ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={async () => { if (confirm(`수업을 종료하면 ${cls.retentionDays}일 뒤 학생 기록이 자동 정리돼요. 종료할까요?`)) { await teacherApi.endClass(cls.id); await reload(); } }}>
              수업 종료 (보관 기간 시작)
            </button>
          ) : (
            <span className="chip chip--warn">종료됨 · {cls.retentionDays}일 뒤 정리</span>
          )}
          <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--c-error)' }} onClick={async () => { if (confirm('수업과 모든 학생 기록·보고서를 지금 삭제해요. 되돌릴 수 없어요.')) { await teacherApi.deleteClass(cls.id); nav('/teacher'); } }}>
            수업과 모든 기록 삭제
          </button>
        </div>
        <div className="card card--stone caption">
          학생은 이름 없이 코드로 입장해요. 교사가 특정 단계를 닫으면 학생은 다른 단계를 진행할 수 있어요. 완료한 활동은 학생이 다시 살펴볼 수 있어요.
        </div>
      </div>
    </div>
  );
}

const EMPTY_ASSET: Partial<MediaAsset> = { kind: 'real', category: 'phase', title: '', photographer: '', sourceUrl: '', takenAt: '', takenTz: 'Asia/Seoul', takenUnknown: false, region: '', processing: '', license: '', credit: '', alt: '', useSteps: ['s01', 's03', 's07'], src: '' };

function Media({ cls }: { cls: TC }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof teacherApi.media>> | null>(null);
  const [form, setForm] = useState<Partial<MediaAsset>>(EMPTY_ASSET);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => teacherApi.media(cls.id).then(setData).catch((e) => setMsg(e.message)), [cls.id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) await teacherApi.updateMedia(cls.id, editId, form);
      else await teacherApi.addMedia(cls.id, form);
      setForm(EMPTY_ASSET);
      setEditId(null);
      setMsg('저장했어요.');
      await load();
    } catch (e2) {
      setMsg(e2 instanceof Error ? e2.message : String(e2));
    }
  }
  const r = data?.readiness;
  return (
    <div className="stack">
      {r ? (
        <div className={`note ${r.phaseReady ? 'note--ok' : 'note--warn'}`}>
          <strong>{r.phaseReady ? `실사진 ${r.phasePhotos}장 준비됨.` : '01·07·09 활동에 필요한 실사진이 부족합니다.'}</strong> 위상 실사진 {r.phasePhotos}/3 · 일식 사진 {r.solarPhoto ? '있음' : '없음'} · 월식 사진 {r.lunarPhoto ? '있음' : '없음'} · 코드 매니페스트 빈 자리 {r.manifestPlaceholders}개
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li>확보 체크리스트: 촬영자/기관 · 촬영 일시와 시간대(모르면 ‘미상’) · 지역 · 실사진/합성/시뮬레이션 구분 · 처리 내용 · 이용 조건과 저작자 표시 · 대체 텍스트 · 사용 단계</li>
            <li>NASA SVS 위상 렌더는 ‘시뮬레이션’으로만 등록되며 01의 실제 사진 3장에는 쓰이지 않아요. 07의 참고 렌더로만 쓰여요.</li>
            <li>파일은 저장소의 public/media/ 에 넣고 경로(/media/…)를 적거나, 이용 조건이 확인된 https:// 주소를 적으세요.</li>
          </ul>
        </div>
      ) : null}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack-sm">
          {data?.assets.map((a) => (
            <div key={a.id} className="card row row--between" style={{ padding: 12 }}>
              <div className="caption">
                <div className="row" style={{ gap: 6 }}>
                  <MediaKindBadge kind={a.kind} />
                  <span className="chip chip--stone">{a.category}</span>
                  <span className={`chip ${a.src ? 'chip--green' : 'chip--warn'}`}>{a.src ? '파일 있음' : '미확보'}</span>
                  <span className="chip chip--stone">{a.origin === 'manifest' ? '코드 매니페스트' : '콘솔 등록'}</span>
                </div>
                <strong>{a.title}</strong> · {a.photographer || '촬영자 미기재'} · {a.takenAt ?? '일시 미상'} · {a.useSteps.join(', ')}
                {a.src ? <div className="micro">{a.src}</div> : null}
              </div>
              {a.origin === 'teacher' ? (
                <div className="row">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditId(a.id); setForm({ ...a, takenAt: a.takenAt ?? '', sourceUrl: a.sourceUrl ?? '', region: a.region ?? '', processing: a.processing ?? '', src: a.src ?? '' }); }}>
                    수정
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { if (confirm('이 자료를 삭제할까요?')) { await teacherApi.deleteMedia(cls.id, a.id); await load(); } }}>
                    삭제
                  </button>
                </div>
              ) : (
                <span className="micro">shared/mediaManifest.ts 에서 수정</span>
              )}
            </div>
          ))}
        </div>
        <form className="card stack-sm" onSubmit={submit}>
          <span className="mono">{editId ? '자료 수정' : '관측 사진 등록'}</span>
          <div className="row">
            <div className="field">
              <label htmlFor="m-kind">자료 유형</label>
              <select id="m-kind" className="select" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as MediaAsset['kind'] })}>
                <option value="real">실사진</option>
                <option value="composite">합성</option>
                <option value="simulation">시뮬레이션 (NASA SVS 렌더 등)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="m-cat">분류</label>
              <select id="m-cat" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as MediaAsset['category'] })}>
                <option value="phase">위상 (01·03·07)</option>
                <option value="solar-eclipse">일식 (09·10)</option>
                <option value="lunar-eclipse">월식 (09·10)</option>
                <option value="other">기타</option>
              </select>
            </div>
          </div>
          {(
            [
              ['title', '제목'],
              ['photographer', '촬영자/기관'],
              ['sourceUrl', '원본 URL 또는 소유·이용 근거'],
              ['takenAt', '촬영 일시 (YYYY-MM-DD HH:MM · 모르면 비우고 아래 미상 체크)'],
              ['takenTz', '시간대'],
              ['region', '촬영 지역·방향 (정확한 주소 제외)'],
              ['processing', '처리 내용 (회전·반전·크롭·합성)'],
              ['license', '이용 조건'],
              ['credit', '저작자 표시 문구'],
              ['alt', '대체 텍스트'],
              ['src', '파일 경로 (/media/…) 또는 https:// 주소'],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="field">
              <label htmlFor={`m-${k}`}>{label}</label>
              <input id={`m-${k}`} className="input" value={(form[k] as string | null) ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={form.takenUnknown ?? false} onChange={(e) => setForm({ ...form, takenUnknown: e.target.checked })} /> 촬영 일시 미상
          </label>
          <div className="field">
            <span className="label">사용 단계</span>
            <div className="row">
              {STEP_IDS.map((s) => (
                <label key={s} className="row" style={{ gap: 4 }}>
                  <input type="checkbox" checked={form.useSteps?.includes(s) ?? false} onChange={(e) => setForm({ ...form, useSteps: e.target.checked ? [...(form.useSteps ?? []), s] : (form.useSteps ?? []).filter((x) => x !== s) })} /> {s.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <div className="row">
            <button className="btn" type="submit">
              {editId ? '수정 저장' : '등록'}
            </button>
            {editId ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditId(null); setForm(EMPTY_ASSET); }}>
                취소
              </button>
            ) : null}
            {msg ? <span className="caption">{msg}</span> : null}
          </div>
        </form>
      </div>
    </div>
  );
}

function Bars({ data, labels, total }: { data: Record<string, number>; labels?: Record<string, string>; total: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="caption">아직 응답이 없어요.</p>;
  return (
    <div className="stack-sm">
      {entries.map(([k, n]) => (
        <div key={k}>
          <div className="row row--between caption">
            <span>{labels?.[k] ?? k}</span>
            <span>
              {n}명 ({total ? Math.round((n / total) * 100) : 0}%)
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--c-stone)', borderRadius: 4 }}>
            <div style={{ width: `${total ? (n / total) * 100 : 0}%`, height: '100%', background: 'var(--c-deep-green)', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Aggregate({ cls }: { cls: TC }) {
  const [agg, setAgg] = useState<AggregateResponse | null>(null);
  const [live, setLive] = useState(true);
  useEffect(() => {
    let alive = true;
    const tick = () => teacherApi.aggregate(cls.id).then((a) => alive && setAgg(a)).catch(() => undefined);
    void tick();
    const t = live ? window.setInterval(tick, 5000) : null;
    return () => {
      alive = false;
      if (t) window.clearInterval(t);
    };
  }, [cls.id, live]);
  if (!agg) return <p className="muted">집계 중…</p>;
  const n = agg.participants;
  return (
    <div className="stack">
      <div className="row row--between">
        <p className="caption" style={{ margin: 0 }}>
          참여 {n}명 · 갱신 {agg.generatedAt.slice(11, 19)} · 이름·참여자 ID·개별 서술은 표시하지 않아요. 화면에 띄워 전체 토론에 쓰세요.
        </p>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> 5초마다 갱신
        </label>
      </div>
      <div className="grid-2">
        <div className="card stack-sm">
          <span className="mono">01 첫 생각 분포</span>
          <Bars data={agg.q01} labels={Q01_OPTIONS} total={n} />
        </div>
        <div className="card stack-sm">
          <span className="mono">02 필수 문항 정오</span>
          {Object.entries(agg.q02).map(([q, v]) => (
            <div key={q} className="caption">
              {q}: 정답 {v.correct} · 오답 {v.incorrect} · 응답 {v.answered}/{n}
            </div>
          ))}
        </div>
        <div className="card stack-sm">
          <span className="mono">08 유지/수정</span>
          <Bars data={agg.q08} labels={{ keep: '유지', revise: '수정' }} total={n} />
        </div>
        <div className="card stack-sm">
          <span className="mono">09 분류 (예측)</span>
          {QID.q09Classify.map((q) => (
            <div key={q}>
              <span className="micro">{q.replace('q09-classify-', '장면 ')}</span>
              <Bars data={agg.q09[q] ?? {}} labels={{ phase: '위상', solar: '일식', lunar: '월식' }} total={n} />
            </div>
          ))}
        </div>
        <div className="card stack-sm">
          <span className="mono">12 마무리 문항</span>
          <Bars data={agg.q12} labels={Q01_OPTIONS} total={n} />
        </div>
        <div className="card stack-sm">
          <span className="mono">단계별 진행 인원</span>
          <table className="table">
            <thead>
              <tr>
                <th>단계</th>
                <th>시작</th>
                <th>완료 장면 있음</th>
              </tr>
            </thead>
            <tbody>
              {STEPS.map((s) => (
                <tr key={s.id}>
                  <td>
                    {String(s.number).padStart(2, '0')} {s.title}
                  </td>
                  <td>{agg.steps[s.id]?.started ?? 0}</td>
                  <td>{agg.steps[s.id]?.completedAny ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="caption">보고서: 초안 {agg.reports.draft ?? 0} · 제출 {agg.reports.submitted ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

function Narratives({ cls }: { cls: TC }) {
  const [items, setItems] = useState<{ tag: string; questionId: string; value: unknown; updatedAt: string }[] | null>(null);
  useEffect(() => {
    teacherApi.narratives(cls.id).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [cls.id]);
  if (!items) return <p className="muted">불러오는 중…</p>;
  const label: Record<string, string> = { 'q08-claim': '08 내 주장 (검토 대상)', 'q01-my-question': '01 내 질문', 'q06-self-predict': '06 예측 카드', 'q12-open-question': '12 아직 궁금한 점' };
  return (
    <div className="stack-sm">
      <p className="caption">서술 응답은 참여 표식으로만 표시돼요. 앱은 정오를 판정하지 않아요.</p>
      {items.length === 0 ? <p className="note">아직 서술 응답이 없어요.</p> : null}
      {items.map((it, i) => {
        const v = it.value as { text?: string; verdict?: string; reason?: string };
        return (
          <div key={i} className="card" style={{ padding: 12 }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="chip chip--stone">{it.tag}</span>
              <span className="chip chip--coral">{label[it.questionId] ?? it.questionId}</span>
              <span className="micro">{it.updatedAt.slice(0, 16).replace('T', ' ')}</span>
            </div>
            <p style={{ margin: '6px 0 0' }}>{v.text}</p>
            {v.verdict ? (
              <p className="caption" style={{ margin: '4px 0 0' }}>
                판단: {{ keep: '유지', revise: '수정', undecided: '판단 불가' }[v.verdict] ?? v.verdict} — {v.reason}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ChangeTable({ cls }: { cls: TC }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof teacherApi.changeTable>>['rows'] | null>(null);
  useEffect(() => {
    teacherApi.changeTable(cls.id).then((r) => setRows(r.rows)).catch(() => setRows([]));
  }, [cls.id]);
  if (!rows) return <p className="muted">불러오는 중…</p>;
  const c = (v: unknown) => Q01_OPTIONS[(v as { choice?: string })?.choice ?? ''] ?? '—';
  return (
    <div className="table-wrap">
      <p className="caption">교사 권한 화면이에요. 참여 표식과 보고서에 적힌 이름(있을 때)이 함께 보여요.</p>
      <table className="table">
        <thead>
          <tr>
            <th>참여</th>
            <th>01 처음</th>
            <th>01 이유</th>
            <th>08 유지/수정</th>
            <th>12 지금</th>
            <th>내 질문 → 궁금한 점</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rv = r.answers[QID.q08FirstRevisit]?.latest as { verdict?: string; newChoice?: string; reason?: string } | undefined;
            return (
              <tr key={r.tag}>
                <td>
                  {r.tag}
                  {r.identity?.name ? <div className="micro">{r.identity.name}</div> : null}
                </td>
                <td>{c(r.answers[QID.q01Choice]?.first)}</td>
                <td>{(r.answers[QID.q01Reason]?.latest as { text?: string })?.text}</td>
                <td>{rv ? `${rv.verdict === 'keep' ? '유지' : '수정'}${rv.newChoice ? ` → ${Q01_OPTIONS[rv.newChoice]}` : ''}` : '—'}</td>
                <td>{c(r.answers[QID.q12Final]?.latest)}</td>
                <td className="micro">
                  {(r.answers[QID.q01MyQuestion]?.latest as { text?: string })?.text} → {(r.answers['q12-open-question']?.latest as { text?: string })?.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Reports({ cls }: { cls: TC }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof teacherApi.reports>>['items'] | null>(null);
  const [open, setOpen] = useState<Record<string, unknown> | null>(null);
  const load = useCallback(() => teacherApi.reports(cls.id).then((r) => setItems(r.items)).catch(() => setItems([])), [cls.id]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!items) return <p className="muted">불러오는 중…</p>;
  return (
    <div className="stack">
      <div className="row">
        <a className="btn btn--secondary btn--sm" href={`/api/teacher/classes/${cls.id}/export`} download>
          전체 기록 내보내기(JSON)
        </a>
        <span className="caption">학생 화면의 인쇄 보고서는 학생 기기에서 출력해요. 여기서는 열람·검토·삭제해요.</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>참여</th>
            <th>이름/반</th>
            <th>상태</th>
            <th>제출</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.participantId}>
              <td>{it.tag}</td>
              <td>{it.identity ? [it.identity.name, it.identity.grade && `${it.identity.grade}학년`, it.identity.classNo && `${it.identity.classNo}반`, it.identity.number && `${it.identity.number}번`].filter(Boolean).join(' ') : '—'}</td>
              <td>{it.status === 'submitted' ? '제출' : it.status === 'draft' ? '초안' : '없음'}</td>
              <td>{it.submittedAt?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
              <td className="row">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => teacherApi.report(cls.id, it.participantId).then(setOpen)}>
                  열람
                </button>
                <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--c-error)' }} onClick={async () => { if (confirm('이 참여자의 모든 기록과 보고서를 삭제할까요? 되돌릴 수 없어요.')) { await teacherApi.deleteReport(cls.id, it.participantId); await load(); } }}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {open ? (
        <div className="card stack-sm">
          <div className="row row--between">
            <span className="mono">기록 열람 · {String(open.tag)}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(null)}>
              닫기
            </button>
          </div>
          <ReportRecord record={open} />
        </div>
      ) : null}
    </div>
  );
}

function ReportRecord({ record }: { record: Record<string, unknown> }) {
  const report = record.report as { identity: Record<string, string>; sections: { id: string; text: string; required: boolean }[]; status: string; version: number } | null;
  const responses = record.responses as { questionId: string; first: unknown; latest: unknown; hintsUsed: number }[];
  const attempts = record.attempts as { stepId: string; sceneId: string; mode: string; state: { theta: number; inclination: number; nodeLongitude: number }; result: unknown; isSandbox: boolean }[];
  return (
    <div className="stack-sm caption">
      {report ? (
        <>
          <div>
            보고서 {report.status} · 버전 {report.version} · {Object.values(report.identity).filter(Boolean).join(' ')}
          </div>
          {report.sections.map((s) => (
            <div key={s.id}>
              <strong>{s.id}</strong> {s.required ? '(필수)' : ''}: <span style={{ whiteSpace: 'pre-wrap' }}>{s.text || '(비어 있음)'}</span>
            </div>
          ))}
        </>
      ) : (
        <div>보고서 없음</div>
      )}
      <details className="more">
        <summary>응답 {responses.length}개 (처음/최신, 힌트 사용)</summary>
        <div>
          {responses.map((r) => (
            <div key={r.questionId}>
              <code>{r.questionId}</code> 처음 {JSON.stringify(r.first)} → 최신 {JSON.stringify(r.latest)} · 힌트 {r.hintsUsed}
            </div>
          ))}
        </div>
      </details>
      <details className="more">
        <summary>모형 제출 {attempts.length}개 (2D 대체 화면 사용 여부 포함)</summary>
        <div>
          {attempts.map((a, i) => (
            <div key={i}>
              {a.stepId}/{a.sceneId} · {a.mode} · θ {Math.round(a.state.theta)}° i {a.state.inclination.toFixed(1)}° Ω {Math.round(a.state.nodeLongitude)}° · {(a.result as { renderer?: string })?.renderer === '2d' ? '2D 대체' : '3D'} {a.isSandbox ? '· 자유 실험' : ''}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function ApiStatus() {
  const [st, setSt] = useState<ApiStatusResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const load = () => teacherApi.apiStatus().then(setSt).catch(() => setSt(null));
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="stack">
      {st ? (
        <div className="grid-3">
          <div className={`card ${st.kasiKeyConfigured ? 'card--pale-green' : ''}`}>
            <span className="mono">KASI 서비스키</span>
            <p style={{ margin: 0 }}>{st.kasiKeyConfigured ? '설정됨' : '미설정 — 04는 앱 계산으로 대체되고 화면에 표시됨'}</p>
          </div>
          <div className={`card ${st.r2Configured ? 'card--pale-green' : ''}`}>
            <span className="mono">R2 사진 저장소</span>
            <p style={{ margin: 0 }}>{st.r2Configured ? '설정됨' : '미설정 — 사진 업로드(P2) 비활성'}</p>
          </div>
          <div className={`card ${st.accessConfigured ? 'card--pale-green' : ''}`}>
            <span className="mono">Cloudflare Access</span>
            <p style={{ margin: 0 }}>{st.accessConfigured ? '설정됨' : '미설정 — 접근 키 모드 사용 중'}</p>
          </div>
        </div>
      ) : null}
      <div className="card stack-sm">
        <span className="mono">실제 응답으로 점검</span>
        <p className="caption" style={{ margin: 0 }}>오늘 날짜로 월령·출몰 API 를 1건씩 호출해 결과와 원문 항목을 기록해요. 키 없이는 ‘연동 성공’으로 보고하지 않아요.</p>
        <div className="row">
          <button type="button" className="btn btn--sm" disabled={checking} onClick={async () => { setChecking(true); try { const r = await teacherApi.apiCheck(); setResult(r.results.map((x) => `${x.provider}: ${x.ok ? 'OK' : '실패'} — ${x.message}`).join('\n')); await load(); } finally { setChecking(false); } }}>
            지금 점검
          </button>
          {st ? <span className="caption">캐시 {st.cacheRows}행</span> : null}
        </div>
        {result ? <pre className="note" style={{ whiteSpace: 'pre-wrap' }}>{result}</pre> : null}
        {st?.lastLunarCheck ? <div className="caption">월령 마지막 점검 {st.lastLunarCheck.at.slice(0, 16)}: {st.lastLunarCheck.ok ? 'OK' : '실패'} — {st.lastLunarCheck.message}{st.lastLunarCheck.sample ? <details className="more"><summary>원문 항목</summary><div><pre>{JSON.stringify(st.lastLunarCheck.sample, null, 1)}</pre></div></details> : null}</div> : null}
        {st?.lastRiseSetCheck ? <div className="caption">출몰 마지막 점검 {st.lastRiseSetCheck.at.slice(0, 16)}: {st.lastRiseSetCheck.ok ? 'OK' : '실패'} — {st.lastRiseSetCheck.message}{st.lastRiseSetCheck.sample ? <details className="more"><summary>원문 항목</summary><div><pre>{JSON.stringify(st.lastRiseSetCheck.sample, null, 1)}</pre></div></details> : null}</div> : null}
      </div>
      <div className="card stack-sm">
        <span className="mono">보관 정리</span>
        <p className="caption" style={{ margin: 0 }}>매일 자동 실행되지만 지금 바로 돌릴 수도 있어요. 종료 후 보관 기간이 지난 수업의 학생 기록·만료 세션·오래된 캐시를 정리해요.</p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={async () => setResult(JSON.stringify(await teacherApi.cleanup(), null, 1))}>
          지금 정리 실행
        </button>
      </div>
    </div>
  );
}

function Guide() {
  return (
    <div className="stack" style={{ maxWidth: 800 }}>
      <div className="card stack-sm">
        <span className="mono">운영 순서</span>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>‘API 상태’에서 KASI 키 설정과 실제 응답을 확인해요. 키가 없으면 04는 앱 계산(기관 자료 아님)으로 표시돼요.</li>
          <li>‘관측 자료’에서 출처 있는 실사진을 3장 이상(권장 4~8장) 등록해요. 생성 이미지는 등록하지 않아요.</li>
          <li>영상은 재생·학교망·임베드·자막을 확인한 뒤 src/content/videos.ts 에 ID 를 넣고 ‘설정’에서 켜요.</li>
          <li>수업 코드를 칠판에 적고 학생이 입장해요. 3차시 45분×3 권장. 2차시 모드는 예제 수를 줄이고 영상은 선택으로 돌려요.</li>
          <li>‘익명 집계’를 화면에 띄워 01·02·08·09 분포로 토론해요. 서술은 ‘서술 검토’에서 개별 확인해요.</li>
          <li>수업이 끝나면 보고서를 열람·내보내기하고, 필요하면 ‘수업 종료’로 보관 기간 정리를 시작해요.</li>
        </ol>
      </div>
      <div className="card stack-sm">
        <span className="mono">예상 오개념과 질문 예시</span>
        <ul style={{ margin: 0, paddingLeft: 18 }} className="caption">
          <li>“초승달은 지구 그림자 때문” → 08 미션 1: 그림자는 태양 반대편, 초승달은 태양 쪽.</li>
          <li>“상현달은 달의 1/4만 밝다” → 02 두 가지 절반: 전체는 늘 절반, 보이는 원반이 절반.</li>
          <li>“삭이면 반드시 일식” → 11: 기울기와 교선 방향까지 맞아야 해요.</li>
          <li>“낮에는 달이 안 보인다” → 04 자료에서 낮에 뜨는 날 찾기.</li>
        </ul>
      </div>
      <div className="card stack-sm">
        <span className="mono">평가 참고 (0~2, 공식 성취수준 등급이 아님)</span>
        <table className="table">
          <thead>
            <tr>
              <th>항목</th>
              <th>0</th>
              <th>1</th>
              <th>2</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>관측·자료 해석</td><td>근거 없음</td><td>자료 제시, 연결 부족</td><td>출처 구분·값 근거 비교</td></tr>
            <tr><td>위상 설명</td><td>명칭만/원인 오류</td><td>위치 관계 일부</td><td>태양빛·관찰 방향으로 재현 설명</td></tr>
            <tr><td>식 현상 설명</td><td>일식·월식 혼동</td><td>배치 구별</td><td>그림자·정렬 조건·매달 없는 이유</td></tr>
            <tr><td>설명의 검토</td><td>처음 생각 반복</td><td>수정 여부만</td><td>근거로 유지/수정, 한계 설명</td></tr>
          </tbody>
        </table>
        <span className="micro">‘심화’ 표시가 있어도 일식·월식 전체를 다뤄야 성취기준을 모두 다룬 것이에요. 자세한 안내는 저장소의 docs/TEACHER_GUIDE.md 를 보세요.</span>
      </div>
    </div>
  );
}
