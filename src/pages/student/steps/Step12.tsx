import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { ReportSection } from '@shared/types';
import { QID } from '@shared/questionIds';
import { addDaysISO } from '@shared/horizon';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { MoonDrawCanvas } from '@/components/MoonDrawCanvas';
import { ReportPreview } from '@/components/ReportPreview';
import { AssetSlot } from '@/components/AssetSlot';
import { buildSections, Q01_OPTIONS, SECTION_DEFS } from '@/lib/report';
import { buildRows, fmtTime, todayKST } from '@/lib/publicdata';

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
    setMsg(r.ok ? '저장했어요.' : '저장하지 못했어요. 다시 해 보세요.');
    if (r.ok) setEditing(false);
  }
  if (!anyField) return <p className="note note--info">이번 수업의 보고서에는 이름을 적지 않아요. 다음으로 넘어가세요.</p>;
  return (
    <div className="stack">
      <p className="lead">보고서에 적을 내 정보예요. 이 앱에서 이름을 적는 곳은 여기뿐이에요.</p>
      <p className="caption">선생님이 정한 칸만 보여요. 전화번호, 생일, 주소는 적지 않아요.</p>
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
            고치기
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
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const requiredCount = sections.filter((s) => s.required).length;
  return (
    <div className="stack">
      <p className="lead">보고서의 꼭 쓸 항목 {requiredCount}개에는 앞 단계에서 내가 쓴 답이 이미 들어와 있어요.</p>
      <p>
        항목마다 <strong>그대로 두기</strong>나 <strong>한 문장 고치기</strong> 중 하나를 고르세요. 앱이 대신 문장을 지어 넣지는 않아요. 나머지 항목은 쓰고 싶을 때만 열어서 써요.
      </p>
      {conflict ? (
        <div className="note note--error">
          다른 기기에서 먼저 저장한 보고서가 있어요. 내 글을 덮어쓰지 않고 멈췄어요.{' '}
          <button type="button" className="btn btn--sm" onClick={() => bootstrap()}>
            먼저 저장된 보고서 불러오기
          </button>
        </div>
      ) : null}
      {sections.map((s) => {
        const def = SECTION_DEFS.find((d) => d.id === s.id)!;
        const body = (
          <div className="stack-sm">
            <p className="micro" style={{ margin: 0 }}>
              {def.hint}
            </p>
            {s.imported ? (
              <div className="note" style={{ whiteSpace: 'pre-wrap' }}>
                {s.imported}
              </div>
            ) : (
              <p className="caption">불러올 답이 없어요. 그 단계로 돌아가 채우거나, 여기에 직접 써도 돼요.</p>
            )}
            <div className="row">
              <button type="button" className={`btn btn--sm ${s.kept ? '' : 'btn--secondary'}`} aria-pressed={s.kept} disabled={!s.imported} onClick={() => schedule(sections.map((x) => (x.id === s.id ? { ...x, kept: true, text: x.imported } : x)))}>
                그대로 두기
              </button>
              <button type="button" className={`btn btn--sm ${!s.kept && s.text !== s.imported ? '' : 'btn--secondary'}`} onClick={() => schedule(sections.map((x) => (x.id === s.id ? { ...x, kept: false } : x)))}>
                한 문장 고치기
              </button>
              {decided(s) ? <span className="chip chip--green">정했어요</span> : null}
            </div>
            {!s.kept ? <textarea className="textarea" value={s.text} onChange={(e) => schedule(sections.map((x) => (x.id === s.id ? { ...x, text: e.target.value, kept: false } : x)))} rows={3} aria-label={`${def.title} 고치기`} /> : null}
          </div>
        );
        return s.required ? (
          <section key={s.id} className="card stack-sm">
            <h3 style={{ fontSize: 'var(--fs-body-lg)', margin: 0 }}>
              {def.title} <span className="chip chip--stone">꼭 쓰기</span>
            </h3>
            {body}
          </section>
        ) : (
          <details key={s.id} className="more">
            <summary>{def.title} (쓰고 싶을 때)</summary>
            <div>{body}</div>
          </details>
        );
      })}
      <div className="row">
        <button type="button" className="btn" onClick={() => persist(sections)}>
          임시 저장
        </button>
        <span className="caption">{savedAt ? `저장했어요 (${savedAt})` : '글을 쓰다 멈추면 저절로 저장돼요.'}</span>
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
      <p className="lead">처음에 풀었던 문제와 비슷한 문제를, 다른 달로 물어볼게요.</p>
      <ChoiceQuestion
        qid={QID.q12Final}
        stepId={STEP}
        sceneId="s12-final"
        prompt="새벽 동쪽 하늘에, 왼쪽만 가늘게 밝은 그믐달이 보여요. 왜 이렇게 보일까요?"
        options={[
          { id: 'a', label: '지구 그림자가 달의 대부분을 가려서', correct: false, feedback: '지구 그림자가 달에 닿는 것은 보름달 자리의 월식이에요. 그믐달은 8번 자리, 태양과 거의 같은 쪽에 있어요.' },
          { id: 'b', label: '달에서 빛나는 부분이 줄어들어서', correct: false, feedback: '햇빛은 언제나 달의 절반을 비춰요. 바뀌는 것은 그 밝은 절반이 지구에서 얼마나 보이느냐예요.' },
          { id: 'c', label: '햇빛을 받는 절반 중에서 지구에서 보이는 부분이 아주 조금이라서', correct: true, feedback: '맞아요. 8번 자리의 달은 햇빛을 받는 쪽이 거의 지구 반대편을 향해요. 그래서 밝은 부분이 가장자리만 조금 보여요.' },
          { id: 'd', label: '아직 모르겠다', correct: false, feedback: '8단계의 첫 번째 미션과 6단계에서 달을 옮겨 본 것을 떠올려 보세요.' },
        ]}
      />
      <TextQuestion qid="q12-final-reason" stepId={STEP} sceneId="s12-final" prompt="까닭을 한 문장으로 써 보세요. (모형에서 본 것을 근거로)" rows={2} />
      {final?.choice ? (
        <div className="card card--stone stack-sm">
          <span className="mono">내 생각은 이렇게 바뀌었어요</span>
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">1단계 첫 생각</th>
                <td>{first?.choice ? Q01_OPTIONS[first.choice] : '—'}</td>
              </tr>
              <tr>
                <th scope="row">8단계 다시 보기</th>
                <td>{revisit?.verdict ? `${revisit.verdict === 'keep' ? '그대로 둠' : '고침'} → ${Q01_OPTIONS[revisit.newChoice ?? first?.choice ?? ''] ?? '—'}` : '—'}</td>
              </tr>
              <tr>
                <th scope="row">지금</th>
                <td>{Q01_OPTIONS[final.choice]}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      <TextQuestion qid="q12-open-question" stepId={STEP} sceneId="s12-final" prompt="아직 궁금한 점" rows={2} helper="1단계에서 쓴 ‘내가 궁금한 것’이 보고서에서 이 옆에 다시 나와요." />
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
    if (!confirm(submitted ? '고친 내용으로 다시 제출할까요?' : '보고서를 제출할까요? 제출한 뒤에도 고쳐서 다시 제출할 수 있어요.')) return;
    setBusy(true);
    const r = await submitReport();
    setBusy(false);
    if (r.ok) {
      setMsg(submitted ? '다시 제출했어요.' : '제출했어요.');
      void awardBadge('manual-complete');
    } else setMsg(r.conflict ? '다른 기기에서 바뀐 보고서가 있어서 그것을 불러왔어요. 확인한 뒤 다시 제출해 주세요.' : '제출하지 못했어요. 다시 해 보세요.');
  }
  return (
    <div className="stack">
      <div className="row row--between">
        <div className="row">
          <span className={`chip ${submitted ? 'chip--green' : 'chip--stone'}`}>{submitted ? '제출했어요' : report ? '임시 저장만 했어요' : '아직 저장한 보고서가 없어요'}</span>
          {!requiredDone ? <span className="caption">‘꼭 쓰기’ 항목을 모두 정하면 제출할 수 있어요.</span> : null}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={async () => {
              const r = await saveReport({ identity: report?.identity ?? {}, sections: report?.sections ?? buildSections(bundle, undefined), attachSandbox: report?.attachSandbox ?? false });
              setMsg(r.ok ? '임시 저장했어요.' : '저장하지 못했어요.');
            }}
          >
            임시 저장
          </button>
          <button type="button" className="btn btn--sm" disabled={!report || !requiredDone || busy} onClick={doSubmit}>
            {submitted ? '고쳐서 다시 제출' : '제출하기'}
          </button>
          <Link className="btn btn--secondary btn--sm" to="/report/print" target="_blank" rel="noreferrer">
            인쇄하기
          </Link>
          <a className="btn btn--secondary btn--sm" href="/api/student/export" download>
            내 기록 파일로 받기
          </a>
        </div>
      </div>
      <label className="row" style={{ gap: 6 }}>
        <input type="checkbox" checked={report?.attachSandbox ?? false} onChange={(e) => saveReport({ identity: report?.identity ?? {}, sections: report?.sections ?? buildSections(bundle, undefined), attachSandbox: e.target.checked })} /> 자유 실험에서 적은 기록도 보고서에 붙이기
      </label>
      {msg ? (
        <p className="note note--info" role="status">
          {msg}
        </p>
      ) : null}
      <div className="card">
        <ReportPreview bundle={bundle} />
      </div>
      <AssetSlot id="report-cover" height={120} />
      <details className="more">
        <summary>내 기록은 어디에 저장되나요? 다른 기기에서 이어 하려면?</summary>
        <div className="stack-sm">
          <p>내 답, 관측 카드, 모형, 보고서는 학교 수업용 저장 공간에 참여 표식({bundle.participant.tag})과 함께 저장돼요. 이름은 보고서에만 적혀요.</p>
          <p>수업이 끝나고 {bundle.classSession.retentionDays}일이 지나면 선생님이 정한 대로 기록이 지워져요. 그 전에 지우고 싶으면 선생님께 말씀드리세요.</p>
          <p>‘내 활동 끝내기’를 누르면 이 기기에 남은 기록만 지워져요. 제출한 보고서는 그대로 남아요.</p>
          <p>다른 기기에서 이어 하고 싶다면 아래에서 <strong>복구 키</strong>를 받아 두세요. 복구 키는 내 기록을 다시 여는 열쇠 번호예요.</p>
          <div className="row">
            <button type="button" className="btn btn--secondary btn--sm" onClick={async () => setKey(await issueRecoveryKey())}>
              복구 키 받기
            </button>
            {key ? (
              <span className="caption">
                내 복구 키: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>{key}</code> — 지금 한 번만 보여 줘요. 공책에 적어 두세요. 다른 기기에서 수업 코드와 이 번호를 넣으면 이어 할 수 있어요.
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
        <span className="mono">이번 주 달 보기 도전 (하고 싶을 때만)</span>
        <p style={{ margin: 0 }}>앞으로 7일 중 저녁에 달이 떠 있는 날을 골라 줄게요. 그날 달이 어떤 모양일지 그려서 예측해 두세요. 배지나 점수와는 관계없어요.</p>
      </div>
      {err ? <p className="note note--error">{err}</p> : null}
      {due ? (
        <div className="card stack-sm">
          <span className="mono">예측한 날: {ch.candidateDate}</span>
          {ch.predictionDrawingDataUrl ? <img src={ch.predictionDrawingDataUrl} alt="내가 예측한 달" style={{ width: 90, height: 90, borderRadius: '50%' }} /> : null}
          <p className="caption">{ch.predictionNote}</p>
          <div className="row">
            {(['yes', 'no'] as const).map((v) => (
              <button key={v} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={ch.observed === v} onClick={() => saveChallenge({ ...ch, observed: v, followupNote: followup })}>
                {v === 'yes' ? '실제로 봤어요' : '못 봤어요'}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="ch-follow">예측과 비교해서 한 줄</label>
            <input id="ch-follow" className="input" value={followup} onChange={(e) => setFollowup(e.target.value)} onBlur={() => saveChallenge({ ...ch, followupNote: followup })} />
          </div>
        </div>
      ) : (
        <>
          {candidates.length === 0 ? <p className="caption">{rows.length ? '앞으로 7일 중 저녁에 달이 떠 있는 날이 없어요.' : '자료를 불러오는 중이에요…'}</p> : null}
          <div className="row">
            {candidates.map((r) => (
              <button key={r.date} type="button" className="choice" style={{ width: 'auto' }} aria-pressed={ch?.candidateDate === r.date} onClick={() => saveChallenge({ candidateDate: r.date, predictionDrawingDataUrl: drawing, predictionNote: note, observed: null, followupNote: '' })}>
                {Number(r.date.slice(5, 7))}월 {r.day}일 ({r.weekday}) · 달 뜸 {fmtTime(r.moonrise)} · 달 짐 {fmtTime(r.moonset)}
              </button>
            ))}
          </div>
          {ch ? (
            <div className="grid-2">
              <div className="stack-sm">
                <span className="label">{ch.candidateDate}의 달은 어떤 모양일까요? 그려서 예측해 보세요.</span>
                <MoonDrawCanvas
                  value={drawing}
                  onChange={(d) => {
                    setDrawing(d);
                    saveChallenge({ ...ch, predictionDrawingDataUrl: d, predictionNote: note });
                  }}
                  size={180}
                />
              </div>
              <div className="field">
                <label htmlFor="ch-note">왜 그렇게 예측했는지 한 줄</label>
                <input id="ch-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => saveChallenge({ ...ch, predictionDrawingDataUrl: drawing, predictionNote: note })} placeholder="예: 월령이 10쯤이라 오른쪽이 반보다 크게 밝을 것 같다" />
                <span className="micro">다음에 접속하면 실제로 봤는지 적을 수 있어요. 달이 떠 있어도 구름이나 건물 때문에 못 볼 수 있어요.</span>
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
