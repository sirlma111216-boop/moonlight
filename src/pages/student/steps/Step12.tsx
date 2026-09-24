import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ReportSection } from '@shared/types';
import { QID } from '@shared/questionIds';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { MoonDrawCanvas } from '@/components/MoonDrawCanvas';
import { ReportPreview } from '@/components/ReportPreview';
import { AssetSlot } from '@/components/AssetSlot';
import { buildSections, Q01_OPTIONS, SECTION_DEFS } from '@/lib/report';
import { buildRows, fmtTime, todayKST } from '@/lib/publicdata';
import { addDaysISO } from '@shared/horizon';

const STEP = 's12';

function Identity() {
  useScene(STEP, 's12-identity');
  const bundle = useSession((s) => s.bundle)!;
  const saveReport = useSession((s) => s.saveReport);
  const fields = bundle.classSession.settings.identityFields;
  const anyField = Object.values(fields).some(Boolean);
  const report = bundle.report;
  const has = Boolean(report && Object.values(report.identity).some((v) => v));
  const [form, setForm] = useState({ ...(report?.identity ?? {}) });
  const [editing, setEditing] = useState(!has);
  const [msg, setMsg] = useState<string | null>(null);
  useAutoComplete(STEP, 's12-identity', [], !anyField || has);
  async function save() {
    const r = await saveReport({ identity: form, sections: report?.sections ?? buildSections(bundle, undefined), attachSandbox: report?.attachSandbox ?? false });
    setMsg(r.ok ? '저장했어요.' : '저장하지 못했어요. 다시 시도해 주세요.');
    if (r.ok) setEditing(false);
  }
  if (!anyField) return <p className="note note--info">이 수업은 보고서에 개인 식별 항목을 넣지 않아요. 다음으로 진행하세요.</p>;
  return (
    <div className="stack">
      <p className="lead">보고서에 넣을 정보예요. 이 단계에서만 입력하고, 교사가 끈 항목은 보이지 않아요. 이메일·전화번호·생년월일·주소는 받지 않아요.</p>
      {editing ? (
        <div className="card stack-sm" style={{ maxWidth: 520 }}>
          {fields.name ? (
            <div className="field">
              <label htmlFor="id-name">이름</label>
              <input id="id-name" className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
            </div>
          ) : null}
          <div className="row">
            {fields.grade ? (
              <div className="field">
                <label htmlFor="id-grade">학년</label>
                <input id="id-grade" className="input" value={form.grade ?? ''} onChange={(e) => setForm({ ...form, grade: e.target.value })} inputMode="numeric" style={{ width: 90 }} />
              </div>
            ) : null}
            {fields.classNo ? (
              <div className="field">
                <label htmlFor="id-class">반</label>
                <input id="id-class" className="input" value={form.classNo ?? ''} onChange={(e) => setForm({ ...form, classNo: e.target.value })} inputMode="numeric" style={{ width: 90 }} />
              </div>
            ) : null}
            {fields.number ? (
              <div className="field">
                <label htmlFor="id-number">번호</label>
                <input id="id-number" className="input" value={form.number ?? ''} onChange={(e) => setForm({ ...form, number: e.target.value })} inputMode="numeric" style={{ width: 90 }} />
              </div>
            ) : null}
          </div>
          <button type="button" className="btn" onClick={save}>
            저장
          </button>
        </div>
      ) : (
        <div className="card card--stone row row--between">
          <span>
            {[report?.identity.name, report?.identity.grade && `${report.identity.grade}학년`, report?.identity.classNo && `${report.identity.classNo}반`, report?.identity.number && `${report.identity.number}번`].filter(Boolean).join(' · ')}
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
            수정
          </button>
        </div>
      )}
      {msg ? <p className="note">{msg}</p> : null}
    </div>
  );
}

function Write() {
  useScene(STEP, 's12-write');
  const bundle = useSession((s) => s.bundle)!;
  const saveReport = useSession((s) => s.saveReport);
  const bootstrap = useSession((s) => s.bootstrap);
  const initial = useMemo(() => buildSections(bundle, bundle.report?.sections), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sections, setSections] = useState<ReportSection[]>(initial);
  const [conflict, setConflict] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const decided = (s: ReportSection) => s.kept || (s.text.trim().length > 0 && s.text !== s.imported);
  const allRequiredDecided = sections.filter((s) => s.required).every(decided);
  useAutoComplete(STEP, 's12-write', [], allRequiredDecided && savedAt !== null);

  function schedule(next: ReportSection[]) {
    setSections(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(next), 1200);
  }
  async function persist(next: ReportSection[]) {
    const r = await saveReport({ identity: bundle.report?.identity ?? {}, sections: next, attachSandbox: bundle.report?.attachSandbox ?? false });
    if (r.ok) {
      setSavedAt(new Date().toLocaleTimeString());
      setConflict(false);
    } else if (r.conflict !== undefined) setConflict(true);
  }
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const requiredCount = sections.filter((s) => s.required).length;
  return (
    <div className="stack">
      <p className="lead">
        필수 항목 {requiredCount}개는 이전 단계의 내 답이 그대로 들어와 있어요. 항목마다 <strong>그대로 두기</strong> 또는 <strong>한 문장 고치기</strong>를 고르세요. 앱이 새 문장을 만들어 넣지 않아요. 나머지는 선택이에요.
      </p>
      {conflict ? (
        <div className="note note--error">
          다른 곳에서 저장한 보고서 버전이 있어요. 조용히 덮어쓰지 않았어요.{' '}
          <button type="button" className="btn btn--sm" onClick={() => bootstrap()}>
            서버 버전 불러오기
          </button>
        </div>
      ) : null}
      {sections.map((s) => {
        const def = SECTION_DEFS.find((d) => d.id === s.id)!;
        const body = (
          <div className="stack-sm">
            <p className="micro" style={{ margin: 0 }}>{def.hint}</p>
            {s.imported ? (
              <div className="note" style={{ whiteSpace: 'pre-wrap' }}>
                {s.imported}
              </div>
            ) : (
              <p className="caption">불러올 답이 없어요. 해당 단계로 돌아가 채우거나 여기서 직접 쓸 수 있어요.</p>
            )}
            <div className="row">
              <button type="button" className={`btn btn--sm ${s.kept ? '' : 'btn--secondary'}`} aria-pressed={s.kept} disabled={!s.imported} onClick={() => schedule(sections.map((x) => (x.id === s.id ? { ...x, kept: true, text: x.imported } : x)))}>
                그대로 두기
              </button>
              <button type="button" className={`btn btn--sm ${!s.kept && s.text !== s.imported ? '' : 'btn--secondary'}`} onClick={() => schedule(sections.map((x) => (x.id === s.id ? { ...x, kept: false } : x)))}>
                한 문장 고치기
              </button>
              {decided(s) ? <span className="chip chip--green">결정됨</span> : null}
            </div>
            {!s.kept ? <textarea className="textarea" value={s.text} onChange={(e) => schedule(sections.map((x) => (x.id === s.id ? { ...x, text: e.target.value, kept: false } : x)))} rows={3} aria-label={`${def.title} 고치기`} /> : null}
          </div>
        );
        return s.required ? (
          <section key={s.id} className="card stack-sm">
            <h3 style={{ fontSize: 'var(--fs-body-lg)', margin: 0 }}>
              {def.title} <span className="chip chip--stone">필수</span>
            </h3>
            {body}
          </section>
        ) : (
          <details key={s.id} className="more">
            <summary>{def.title} (선택)</summary>
            <div>{body}</div>
          </details>
        );
      })}
      <div className="row">
        <button type="button" className="btn" onClick={() => persist(sections)}>
          초안 저장
        </button>
        <span className="caption">{savedAt ? `저장됨 ${savedAt}` : '입력이 멈추면 자동 저장돼요.'}</span>
      </div>
    </div>
  );
}

function Final() {
  useScene(STEP, 's12-final');
  useAutoComplete(STEP, 's12-final', [QID.q12Final, 'q12-final-reason', 'q12-open-question']);
  const bundle = useSession((s) => s.bundle)!;
  const first = bundle.responses.find((r) => r.questionId === QID.q01Choice)?.first as { choice?: string } | undefined;
  const revisit = bundle.responses.find((r) => r.questionId === QID.q08FirstRevisit)?.latest as { verdict?: string; newChoice?: string } | undefined;
  const final = bundle.responses.find((r) => r.questionId === QID.q12Final)?.latest as { choice?: string } | undefined;
  return (
    <div className="stack">
      <p className="lead">처음과 같은 개념을 다른 사례로 물어요. 정답 공개 뒤 내 설명이 어떻게 달라졌는지 함께 보여줘요.</p>
      <ChoiceQuestion
        qid={QID.q12Final}
        stepId={STEP}
        sceneId="s12-final"
        prompt="새벽 동쪽 하늘에 왼쪽만 얇게 밝은 그믐달이 보여요. 왜 이렇게 보일까요?"
        options={[
          { id: 'a', label: '지구 그림자가 달의 대부분을 가려서', correct: false, feedback: '지구 그림자가 달에 닿는 것은 보름 위치의 월식이에요. 그믐달은 태양과 같은 쪽에 가까워서 밝은 절반이 거의 우리 반대쪽을 향해요.' },
          { id: 'b', label: '달에서 빛나는 부분이 줄어들어서', correct: false, feedback: '달은 늘 절반이 밝아요. 바뀌는 것은 지구에서 그 절반이 얼마나 보이느냐예요.' },
          { id: 'c', label: '태양빛을 받는 절반 중 지구에서 보이는 부분이 얇기 때문에', correct: true, feedback: '삭 직전 위치라 밝은 절반의 가장자리만 우리 쪽을 향해요. 왼쪽이 밝은 것은 태양이 달의 왼쪽(동쪽 아래) 방향에 있기 때문이에요.' },
          { id: 'd', label: '아직 모르겠다', correct: false, feedback: '08의 미션 1과 06의 재현 결과를 다시 떠올려 보세요.' },
        ]}
      />
      <TextQuestion qid="q12-final-reason" stepId={STEP} sceneId="s12-final" prompt="이유를 한 문장으로 (모형에서 본 것을 근거로)" rows={2} />
      {final?.choice ? (
        <div className="card card--stone stack-sm">
          <span className="mono">설명의 변화</span>
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">01 처음 생각</th>
                <td>{first?.choice ? Q01_OPTIONS[first.choice] : '—'}</td>
              </tr>
              <tr>
                <th scope="row">08 유지/수정</th>
                <td>{revisit?.verdict ? `${revisit.verdict === 'keep' ? '유지' : '수정'} → ${Q01_OPTIONS[revisit.newChoice ?? first?.choice ?? ''] ?? '—'}` : '—'}</td>
              </tr>
              <tr>
                <th scope="row">12 지금</th>
                <td>{Q01_OPTIONS[final.choice]}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      <TextQuestion qid="q12-open-question" stepId={STEP} sceneId="s12-final" prompt="아직 궁금한 점" rows={2} helper="01에서 쓴 내 질문이 보고서에서 이 옆에 다시 나타나요." />
    </div>
  );
}

function Submit() {
  useScene(STEP, 's12-submit');
  const bundle = useSession((s) => s.bundle)!;
  const saveReport = useSession((s) => s.saveReport);
  const submitReport = useSession((s) => s.submitReport);
  const awardBadge = useSession((s) => s.awardBadge);
  const issueRecoveryKey = useSession((s) => s.issueRecoveryKey);
  const report = bundle.report;
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitted = report?.status === 'submitted';
  useAutoComplete(STEP, 's12-submit', [], submitted);
  const requiredDone = (report?.sections ?? []).filter((s) => s.required).every((s) => s.kept || (s.text.trim() && s.text !== s.imported));
  async function doSubmit() {
    if (!report) return;
    if (!confirm(submitted ? '수정한 내용으로 다시 제출할까요?' : '보고서를 제출할까요? 제출 뒤에도 수정 제출할 수 있어요.')) return;
    setBusy(true);
    const r = await submitReport();
    setBusy(false);
    if (r.ok) {
      setMsg(submitted ? '수정 제출했어요.' : '제출했어요.');
      void awardBadge('manual-complete');
    } else setMsg(r.conflict ? '다른 곳에서 바뀐 버전이 있어 최신 상태를 불러왔어요. 확인 뒤 다시 제출해 주세요.' : '제출하지 못했어요.');
  }
  return (
    <div className="stack">
      <div className="row row--between">
        <div className="row">
          <span className={`chip ${submitted ? 'chip--green' : 'chip--stone'}`}>{submitted ? `제출됨 (버전 ${report?.version})` : report ? `초안 저장됨 (버전 ${report.version})` : '아직 저장된 초안 없음'}</span>
          {!requiredDone ? <span className="caption">필수 항목을 모두 결정하면 제출할 수 있어요.</span> : null}
        </div>
        <div className="row">
          <button type="button" className="btn btn--secondary btn--sm" onClick={async () => { const r = await saveReport({ identity: report?.identity ?? {}, sections: report?.sections ?? buildSections(bundle, undefined), attachSandbox: report?.attachSandbox ?? false }); setMsg(r.ok ? '초안을 저장했어요.' : '저장하지 못했어요.'); }}>
            초안 저장
          </button>
          <button type="button" className="btn btn--sm" disabled={!report || !requiredDone || busy} onClick={doSubmit}>
            {submitted ? '수정 제출' : '제출'}
          </button>
          <Link className="btn btn--secondary btn--sm" to="/report/print" target="_blank" rel="noreferrer">
            인쇄용 화면
          </Link>
          <a className="btn btn--secondary btn--sm" href="/api/student/export" download>
            학습 기록 내보내기(JSON)
          </a>
        </div>
      </div>
      <label className="row" style={{ gap: 6 }}>
        <input type="checkbox" checked={report?.attachSandbox ?? false} onChange={(e) => saveReport({ identity: report?.identity ?? {}, sections: report?.sections ?? buildSections(bundle, undefined), attachSandbox: e.target.checked })} /> 자유 실험 기록을 보고서에 첨부
      </label>
      {msg ? <p className="note note--info" role="status">{msg}</p> : null}
      <div className="card">
        <ReportPreview bundle={bundle} />
      </div>
      <AssetSlot id="report-cover" height={120} />
      <details className="more">
        <summary>저장되는 자료와 삭제 방법 · 다른 기기에서 이어 하기</summary>
        <div className="stack-sm">
          <p>서버에는 응답·관측 카드·모형 상태·보고서가 참여 표식과 함께 저장돼요. 이름 등 식별 정보는 보고서에만 있어요. 교사는 수업 종료 뒤 보관 기간({bundle.classSession.retentionDays}일 기본)이 지나면 기록을 정리하고, 그 전에 삭제를 요청할 수 있어요.</p>
          <p>‘내 활동 종료’를 누르면 이 기기의 기록·세션만 지워지고 서버 제출 기록은 남아요.</p>
          <div className="row">
            <button type="button" className="btn btn--secondary btn--sm" onClick={async () => setKey(await issueRecoveryKey())}>
              개인 복구 키 발급
            </button>
            {key ? (
              <span className="caption">
                복구 키: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{key}</code> — 지금만 보여요. 적어 두세요. 다른 기기에서 수업 코드와 함께 입력하면 이어 할 수 있어요.
              </span>
            ) : null}
          </div>
        </div>
      </details>
    </div>
  );
}

function Challenge() {
  useScene(STEP, 's12-challenge');
  const bundle = useSession((s) => s.bundle)!;
  const loadMonth = useSession((s) => s.loadMonth);
  const saveChallenge = useSession((s) => s.saveChallenge);
  const ch = bundle.challenge;
  const today = todayKST();
  const win = bundle.classSession.settings.observationWindow;
  const [rows, setRows] = useState<ReturnType<typeof buildRows>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(ch?.predictionDrawingDataUrl ?? null);
  const [note, setNote] = useState(ch?.predictionNote ?? '');
  const [followup, setFollowup] = useState(ch?.followupNote ?? '');
  useEffect(() => {
    const [y, m] = today.split('-').map(Number);
    const months = [{ y, m }];
    const end = addDaysISO(today, 7);
    if (end.slice(0, 7) !== today.slice(0, 7)) months.push({ y: Number(end.slice(0, 4)), m: Number(end.slice(5, 7)) });
    Promise.all(months.map((x) => loadMonth(bundle.classSession.region, x.y, x.m)))
      .then((datas) => setRows(datas.flatMap((d) => buildRows(d, win)).filter((r) => r.date > today && r.date <= end)))
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [bundle.classSession.region, loadMonth, today, win]);
  const candidates = rows.filter((r) => r.window.anyAbove);
  const due = ch && ch.candidateDate <= today;
  return (
    <div className="stack">
      <div className="card card--pale-green">
        <span className="mono">이번 주 관측 도전 (선택)</span>
        <p style={{ margin: 0 }}>04의 자료를 근거로 향후 7일 중 저녁 관측 후보 날짜를 골라 주고, ‘그 날 달은 어떤 모양일까’를 그려 예측으로 저장해요. 배지나 완료 조건과 무관해요.</p>
      </div>
      {err ? <p className="note note--error">{err}</p> : null}
      {due ? (
        <div className="card stack-sm">
          <span className="mono">예측한 날: {ch.candidateDate}</span>
          {ch.predictionDrawingDataUrl ? <img src={ch.predictionDrawingDataUrl} alt="예측한 달" style={{ width: 90, height: 90, borderRadius: '50%' }} /> : null}
          <p className="caption">{ch.predictionNote}</p>
          <div className="row">
            {(['yes', 'no'] as const).map((v) => (
              <button key={v} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={ch.observed === v} onClick={() => saveChallenge({ ...ch, observed: v, followupNote: followup })}>
                {v === 'yes' ? '실제로 봤다' : '못 봤다'}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="ch-follow">예측과 비교해 한 줄</label>
            <input id="ch-follow" className="input" value={followup} onChange={(e) => setFollowup(e.target.value)} onBlur={() => saveChallenge({ ...ch, followupNote: followup })} />
          </div>
        </div>
      ) : (
        <>
          {candidates.length === 0 ? <p className="caption">{rows.length ? `향후 7일 중 ${win.start}~${win.end}에 달이 떠 있는 날이 없어요.` : '자료를 불러오는 중…'}</p> : null}
          <div className="row">
            {candidates.map((r) => (
              <button key={r.date} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={ch?.candidateDate === r.date} onClick={() => saveChallenge({ candidateDate: r.date, predictionDrawingDataUrl: drawing, predictionNote: note, observed: null, followupNote: '' })}>
                {r.date.slice(5)} ({r.weekday}) · 월출 {fmtTime(r.moonrise)} · 월몰 {fmtTime(r.moonset)}
              </button>
            ))}
          </div>
          {ch ? (
            <div className="grid-2">
              <div className="stack-sm">
                <span className="label">{ch.candidateDate}의 달은 어떤 모양일까요? (예측 그림)</span>
                <MoonDrawCanvas value={drawing} onChange={(d) => { setDrawing(d); saveChallenge({ ...ch, predictionDrawingDataUrl: d, predictionNote: note }); }} size={180} />
              </div>
              <div className="field">
                <label htmlFor="ch-note">예측 이유 한 줄</label>
                <input id="ch-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => saveChallenge({ ...ch, predictionDrawingDataUrl: drawing, predictionNote: note })} placeholder="예: 월령이 10쯤이라 오른쪽이 반 넘게 밝을 것" />
                <span className="micro">다음 접속에서 실제로 봤는지 기록할 수 있어요. 떠 있어도 구름·건물 때문에 못 볼 수 있어요.</span>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function Step12({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's12-identity':
      return <Identity />;
    case 's12-write':
      return <Write />;
    case 's12-final':
      return <Final />;
    case 's12-submit':
      return <Submit />;
    case 's12-challenge':
      return <Challenge />;
    default:
      return null;
  }
}
