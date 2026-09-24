import { useEffect, useMemo, useState } from 'react';
import type { MonthDataResponse } from '@shared/publicdata';
import { REGIONS } from '@shared/regions';
import { kstToEpoch } from '@shared/horizon';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { AssetSlot } from '@/components/AssetSlot';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PhaseDisk } from '@/components/PhaseDisk';
import { SourceBadge } from '@/components/SourceBadge';
import { Term } from '@/components/Term';
import { buildRows, fmtTime, moonriseTrend, todayKST, type DayRow } from '@/lib/publicdata';

const STEP = 's04';

/** 04 전체가 공유하는 '현재 조회' 상태 (q04-query 응답에 저장) */
function useQuery() {
  const bundle = useSession((s) => s.bundle)!;
  const q = bundle.responses.find((r) => r.questionId === 'q04-query')?.latest as { region?: string; year?: number; month?: number } | undefined;
  const start = bundle.classSession.periodStart || todayKST();
  return {
    region: q?.region ?? bundle.classSession.region,
    year: q?.year ?? Number(start.slice(0, 4)),
    month: q?.month ?? Number(start.slice(5, 7)),
  };
}

function useMonth(): { data: MonthDataResponse | null; rows: DayRow[]; loading: boolean; error: string | null } {
  const { region, year, month } = useQuery();
  const key = `${region}:${year}-${month}`;
  const data = useSession((s) => s.monthData[key] ?? null);
  const loading = useSession((s) => s.monthLoading[key] ?? false);
  const loadMonth = useSession((s) => s.loadMonth);
  const win = useSession((s) => s.bundle!.classSession.settings.observationWindow);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!data && !loading) loadMonth(region, year, month).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [data, loading, loadMonth, region, year, month]);
  const rows = useMemo(() => (data ? buildRows(data, win) : []), [data, win]);
  return { data, rows, loading, error };
}

function SourceLine({ data }: { data: MonthDataResponse }) {
  return (
    <div className="stack-sm">
      <div className="row">
        <SourceBadge type={data.fallback ? 'app-calculation' : 'institution-forecast'} extra={data.sourceLabel} />
        <span className="micro">
          조회 {data.fetchedAt.slice(0, 16).replace('T', ' ')} · 캐시 {data.cacheHits}일 / 새 호출 {data.cacheMisses}일
        </span>
      </div>
      {data.fallback ? <p className="note note--warn">기관 자료를 쓰지 못해 <strong>앱 계산(Astronomy Engine)</strong>으로 대체했어요. 값은 실제 계산이지만 기관 예측 자료가 아니며 실제 관측 검증에는 쓰지 않아요. (이유: {data.fallbackReason})</p> : null}
      <p className="micro">{data.timezoneNote}</p>
    </div>
  );
}

function DataTable({ rows, selected, onToggle, highlight, compact }: { rows: DayRow[]; selected?: Set<string>; onToggle?: (d: string) => void; highlight?: string; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {onToggle ? <th scope="col">선택</th> : null}
            <th scope="col">날짜</th>
            <th scope="col">월령</th>
            {!compact ? <th scope="col">근사 모형</th> : null}
            <th scope="col">일몰</th>
            <th scope="col">월출</th>
            <th scope="col">월몰</th>
            <th scope="col">21시</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} aria-selected={selected?.has(r.date)} className={highlight === r.date ? 'is-highlight' : ''}>
              {onToggle ? (
                <td>
                  <input type="checkbox" checked={selected?.has(r.date) ?? false} onChange={() => onToggle(r.date)} aria-label={`${r.date} 선택`} />
                </td>
              ) : null}
              <td>
                {r.date.slice(5)} ({r.weekday})
              </td>
              <td>{r.lunarAge ?? '결측'}</td>
              {!compact ? <td>{r.approxTheta !== null ? <PhaseDisk theta={r.approxTheta} size={28} label={`월령 ${r.lunarAge} 근사 모형`} /> : '—'}</td> : null}
              <td>{fmtTime(r.sunset)}</td>
              <td>
                {fmtTime(r.moonrise)}
                {r.riseSetsNextDay ? <span className="micro"> (다음 날 짐)</span> : null}
              </td>
              <td>
                {fmtTime(r.moonset)}
                {r.setFromPrevNight ? <span className="micro"> (전날 뜬 달)</span> : null}
              </td>
              <td>{r.at21 === 'above' ? '위' : r.at21 === 'below' ? '아래' : '?'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact ? <p className="micro">‘근사 모형’은 <Term id="lunarAge" />을 이용해 만든 학습 모형 원반이에요. 사진이나 정확한 위상 각도가 아니에요. ‘(전날 뜬 달)’은 그 월몰이 전날 밤부터 이어진 달이라는 뜻이에요.</p> : null}
    </div>
  );
}

function Load() {
  const { complete } = useScene(STEP, 's04-load');
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const saveSnapshot = useSession((s) => s.saveSnapshot);
  const q = useQuery();
  const [region, setRegion] = useState(q.region);
  const [ym, setYm] = useState(`${q.year}-${String(q.month).padStart(2, '0')}`);
  const { data, rows, loading, error } = useMonth();
  useEffect(() => {
    if (data) {
      complete();
      const id = `month:${data.region}:${data.year}-${data.month}`;
      if (!bundle.snapshots.some((s) => s.id === id)) {
        saveSnapshot({
          id,
          provider: data.fallback ? 'app-astronomy' : 'kasi-riseset',
          request: { region: data.region, year: String(data.year), month: String(data.month) },
          baseTime: data.timezoneNote,
          raw: { lunarAges: data.lunarAges.map((l) => l.raw ?? null), riseSets: data.riseSets.map((r) => r.raw ?? null) },
          normalized: { lunarAges: data.lunarAges, riseSets: data.riseSets },
          isCached: data.cacheHits > 0,
          isExample: data.fallback,
          sourceUrl: data.sourceUrl,
          fetchedAt: data.fetchedAt,
        });
      }
    }
  }, [data, complete, saveSnapshot, bundle.snapshots]);
  return (
    <div className="stack">
      <AssetSlot id="evidence-desk" />
      <p className="lead">
        지역과 달을 고르면 한국천문연구원의 <Term id="lunarAge" />과 월출·월몰 자료를 가져와요. 표와 달력으로 값을 직접 읽어요.
      </p>
      <div className="row" style={{ alignItems: 'end' }}>
        <div className="field">
          <label htmlFor="q-region">지역</label>
          <select id="q-region" className="select" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.label}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="q-ym">연월</label>
          <input id="q-ym" type="month" className="input" value={ym} onChange={(e) => setYm(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const [y, m] = ym.split('-').map(Number);
            respond('q04-query', STEP, 's04-load', { region, year: y, month: m });
          }}
        >
          자료 가져오기
        </button>
      </div>
      {loading ? <p className="muted">기관 자료를 가져오는 중이에요… (처음 조회는 날짜별로 호출해 시간이 걸릴 수 있어요)</p> : null}
      {error ? <p className="note note--error">{error}</p> : null}
      {data ? (
        <>
          <SourceLine data={data} />
          <DataTable rows={rows} />
          <details className="more">
            <summary>이 자료를 어떻게 가져왔나요?</summary>
            <div>
              <ul>
                {data.adapterNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p>출처: {data.sourceUrl}</p>
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}

function ReadRow() {
  useScene(STEP, 's04-read-row');
  useAutoComplete(STEP, 's04-read-row', ['q04-row-age', 'q04-row-rise', 'q04-row-21']);
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const { rows } = useMonth();
  const obs = bundle.observations[bundle.observations.length - 1];
  const target = rows.find((r) => r.date === obs?.date) ?? rows[Math.min(14, rows.length - 1)];
  const [age, setAge] = useState('');
  const [rise, setRise] = useState('');
  const [noRise, setNoRise] = useState(false);
  const ageRec = useSession((s) => s.getResponse('q04-row-age'))?.latest as { answer?: string; correct?: boolean } | undefined;
  const riseRec = useSession((s) => s.getResponse('q04-row-rise'))?.latest as { answer?: string; correct?: boolean } | undefined;
  if (!target) return <p className="note">먼저 ‘자료 가져오기’ 장면에서 자료를 불러오세요.</p>;
  const above = target.at21;
  return (
    <div className="stack">
      <p className="lead">먼저 표에서 <strong>한 행</strong>만 읽어요. 강조된 날짜({target.date})의 값을 보고 순서대로 답하세요.</p>
      <DataTable rows={rows.filter((r) => Math.abs(r.day - target.day) <= 2)} highlight={target.date} />
      <div className="card stack">
        <div className="field">
          <label htmlFor="row-age">1) 이 날 월령은 얼마인가요? (표의 값을 그대로)</label>
          <div className="row">
            <input id="row-age" className="input" style={{ width: 140 }} inputMode="decimal" value={age} onChange={(e) => setAge(e.target.value)} placeholder="예: 12.3" />
            <button type="button" className="btn btn--sm" onClick={() => respond('q04-row-age', STEP, 's04-read-row', { answer: age, correct: target.lunarAge !== null && Math.abs(Number(age) - target.lunarAge) <= 0.5 })} disabled={!age}>
              확인
            </button>
          </div>
          {ageRec ? <p className={`note ${ageRec.correct ? 'note--ok' : 'note--warn'}`}>{ageRec.correct ? `맞아요. 이 날 월령은 ${target.lunarAge}이에요. 월령은 삭 이후 지난 날수이지, 사진이나 정확한 각도는 아니에요.` : `표의 ‘월령’ 열에서 ${target.date.slice(5)} 행을 다시 찾아보세요. 값은 ${target.lunarAge ?? '결측'}이에요.`}</p> : null}
        </div>
        <div className="field">
          <label htmlFor="row-rise">2) 이 날 달이 뜬 시각은 언제인가요?</label>
          <div className="row">
            <input id="row-rise" type="time" className="input" style={{ width: 'auto' }} value={rise} disabled={noRise} onChange={(e) => setRise(e.target.value)} />
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={noRise} onChange={(e) => setNoRise(e.target.checked)} /> 이 날은 뜨지 않음
            </label>
            <button
              type="button"
              className="btn btn--sm"
              disabled={!noRise && !rise}
              onClick={() => {
                const correct = noRise ? target.moonrise === null : typeof target.moonrise === 'string' && Math.abs(kstToEpoch(target.date, rise) - kstToEpoch(target.date, target.moonrise)) <= 5 * 60_000;
                respond('q04-row-rise', STEP, 's04-read-row', { answer: noRise ? 'none' : rise, correct });
              }}
            >
              확인
            </button>
          </div>
          {riseRec ? <p className={`note ${riseRec.correct ? 'note--ok' : 'note--warn'}`}>{riseRec.correct ? `맞아요. 월출 ${fmtTime(target.moonrise)}. 어떤 날은 달이 뜨지 않거나 자정을 넘겨 다음 날 새벽에 떠요.` : `‘월출’ 열을 다시 보세요. 이 날 월출은 ${fmtTime(target.moonrise)}이에요. 뜨는 사건이 없는 날도 있어요.`}</p> : null}
        </div>
        <ChoiceQuestion
          qid="q04-row-21"
          stepId={STEP}
          sceneId="s04-read-row"
          prompt="3) 이 날 21시에 달은 지평선 위에 있나요? (전날·다음 날 사건까지 함께 봐야 해요)"
          options={[
            { id: 'above', label: '위에 있다', correct: above === 'above', feedback: above === 'above' ? '월출 뒤이고 아직 지지 않은 시각이에요. 떠 있다고 반드시 보이는 것은 아니라는 점은 뒤에서 다뤄요.' : '21시에 달이 어디 있는지 월출·월몰을 순서대로 놓아 보세요. 전날 뜬 달이 새벽에 지는 경우도 있어요.' },
            { id: 'below', label: '아래에 있다', correct: above === 'below', feedback: above === 'below' ? '이 시각은 월몰 뒤이거나 월출 전이에요. 다음 날 새벽에 뜨는 경우도 있어요.' : '21시 이전의 마지막 사건이 월출인지 월몰인지 다시 확인해 보세요.' },
            { id: 'unknown', label: '자료로는 알 수 없다', correct: above === 'unknown', feedback: above === 'unknown' ? '이 날짜는 자료가 비어 판정하지 않았어요.' : '전날과 다음 날 행까지 보면 판정할 수 있어요. 21시 앞의 마지막 사건을 찾아보세요.' },
          ]}
        />
      </div>
    </div>
  );
}

function useSelection() {
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const sel = (bundle.responses.find((r) => r.questionId === 'q04-selection')?.latest as { dates?: string[] } | undefined)?.dates ?? [];
  const min = bundle.classSession.mode === '2' ? 3 : 4;
  const max = bundle.classSession.mode === '2' ? 3 : 6;
  return {
    selected: new Set(sel),
    min,
    max,
    toggle: (d: string) => {
      const next = new Set(sel);
      if (next.has(d)) next.delete(d);
      else if (next.size < max) next.add(d);
      respond('q04-selection', STEP, 's04-compare', { dates: [...next].sort() });
    },
  };
}

function Compare() {
  useScene(STEP, 's04-compare');
  const { rows } = useMonth();
  const { selected, min, max, toggle } = useSelection();
  const chosen = rows.filter((r) => selected.has(r.date));
  const trend = moonriseTrend(chosen);
  useAutoComplete(STEP, 's04-compare', ['q04-trend', 'q04-compare-note'], chosen.length >= min);
  return (
    <div className="stack">
      <p className="lead">
        날짜가 다른 행을 {min}~{max}개 고르세요. 달 모양(근사 모형)과 출몰 시각이 어떻게 달라지는지 <strong>선택한 실제 값</strong>에서 읽어요.
      </p>
      <DataTable rows={rows} selected={selected} onToggle={toggle} compact />
      <p className="caption">
        선택 {chosen.length}/{max} (최소 {min}개)
      </p>
      {chosen.length >= 2 ? (
        <div className="card card--stone stack-sm">
          <span className="mono">선택한 날짜</span>
          <div className="row" style={{ gap: 18 }}>
            {chosen.map((r) => (
              <div key={r.date} style={{ textAlign: 'center', fontSize: 'var(--fs-micro)' }}>
                {r.approxTheta !== null ? <PhaseDisk theta={r.approxTheta} size={56} label={`월령 ${r.lunarAge} 근사 모형`} /> : '—'}
                <div>{r.date.slice(5)}</div>
                <div>월령 {r.lunarAge ?? '결측'}</div>
                <div>월출 {fmtTime(r.moonrise)}</div>
                <div>월몰 {fmtTime(r.moonset)}</div>
              </div>
            ))}
          </div>
          <span className="micro">원반은 ‘월령을 이용한 근사 모형’ 배지가 붙은 학습 모형이에요.</span>
        </div>
      ) : null}
      {chosen.length >= min ? (
        <>
          <ChoiceQuestion
            qid="q04-trend"
            stepId={STEP}
            sceneId="s04-compare"
            prompt="선택한 날짜들에서 월출 시각은 대체로 어떻게 변하나요? (‘항상 정확히 몇 분’ 같은 규칙이 아니라 이 자료에서 읽은 경향)"
            options={[
              { id: 'later', label: '날이 갈수록 늦어진다', correct: trend === 'later', feedback: trend === 'later' ? '이 자료에서는 그래요. 하루 차이가 항상 같지는 않으니 두 날짜를 골라 실제 차이를 적어 보세요.' : '선택한 날짜들의 월출 시각을 시간순으로 다시 나열해 보세요. 사건이 없는 날은 건너뛰어요.' },
              { id: 'earlier', label: '날이 갈수록 빨라진다', correct: trend === 'earlier', feedback: trend === 'earlier' ? '이 자료에서는 그래요. 이유가 무엇일지 다음 단계의 모형에서 생각해 봐요.' : '선택한 날짜들의 월출 시각을 시간순으로 다시 나열해 보세요.' },
              { id: 'mixed', label: '일정하지 않다 / 자료로 판단하기 어렵다', correct: trend === 'mixed' || trend === 'unknown', feedback: trend === 'mixed' || trend === 'unknown' ? '자료에 빈 날이 있거나 날짜 간격이 고르지 않으면 그렇게 보일 수 있어요. 이어진 날짜를 추가로 골라 다시 비교해 보세요.' : '이 자료에서는 한 방향의 경향이 보여요. 시각을 순서대로 놓아 보세요.' },
            ]}
          />
          <TextQuestion qid="q04-compare-note" stepId={STEP} sceneId="s04-compare" prompt="두 날짜를 예로 들어, 월출 시각 차이가 얼마나 나는지 써 보세요." placeholder="예: 9/12 월출 18:40, 9/13 월출 19:15 → 약 35분 늦어짐" rows={2} />
        </>
      ) : null}
    </div>
  );
}

function Plan() {
  useScene(STEP, 's04-plan');
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const awardBadge = useSession((s) => s.awardBadge);
  const { rows } = useMonth();
  const { selected } = useSelection();
  const win = bundle.classSession.settings.observationWindow;
  const candidates = rows.filter((r) => selected.has(r.date));
  const saved = bundle.responses.find((r) => r.questionId === 'q04-plan')?.latest as { chosen?: string[]; none?: boolean; evidence?: string[]; reason?: string; correct?: boolean; validDates?: string[] } | undefined;
  const [chosen, setChosen] = useState<Set<string>>(new Set(saved?.chosen ?? []));
  const [none, setNone] = useState(saved?.none ?? false);
  const [evidence, setEvidence] = useState<Set<string>>(new Set(saved?.evidence ?? []));
  const [reason, setReason] = useState(saved?.reason ?? '');
  useAutoComplete(STEP, 's04-plan', ['q04-plan']);
  const valid = candidates.filter((r) => r.window.anyAbove).map((r) => r.date);
  const [note, setNote] = useState<string | null>(null);
  if (candidates.length === 0) return <p className="note">먼저 ‘여러 날짜 비교’에서 날짜를 골라야 해요.</p>;

  function submit() {
    const chosenArr = [...chosen];
    let correct: boolean;
    if (none) correct = valid.length === 0;
    else correct = chosenArr.length > 0 && chosenArr.every((d) => valid.includes(d));
    const evidenceOk = evidence.size >= 2 && reason.trim().length > 0;
    respond('q04-plan', STEP, 's04-plan', { chosen: chosenArr, none, evidence: [...evidence], reason, correct, validDates: valid, window: win });
    if (correct) {
      setNote(none ? '맞아요. 이번 후보 중에는 그 시간에 달이 떠 있는 날이 없어요. 다른 날짜를 더 골라 보는 것도 방법이에요.' : `조건에 맞아요. 조건을 만족하는 날은 ${valid.length}일이고 여러 날이 모두 정답이 될 수 있어요. 떠 있다고 반드시 보이는 것은 아니에요.`);
      if (evidenceOk) void awardBadge('data-interpreter');
    } else {
      setNote(none ? '이번 후보 중에 조건을 만족하는 날이 있어요. 각 날짜의 ‘21시’ 열과 월출·월몰을 다시 보세요.' : '고른 날 중 그 시간에 지평선 아래인 날이 있어요. 월출·월몰과 관측 창을 다시 맞춰 보세요. 전날 뜬 달이 새벽에 지는 경우도 잊지 마세요.');
    }
  }

  return (
    <div className="stack">
      <div className="card card--pale-blue">
        <span className="mono">미니게임 · 오늘 밤 관측 계획서</span>
        <p style={{ margin: 0 }}>
          수업 후 <strong>{win.start}~{win.end}</strong> 사이에 {bundle.classSession.region}에서 달을 찾아보려면 어떤 날짜가 후보일까요? 야간 관측 계획이라는 상황이에요. 후보가 여럿이면 모두 골라도 돼요. 없으면 ‘이번 후보에는 없음’을 고르세요.
        </p>
      </div>
      <div className="stack-sm">
        {candidates.map((r) => (
          <label key={r.date} className="choice" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={chosen.has(r.date)} disabled={none} onChange={() => { const n = new Set(chosen); n.has(r.date) ? n.delete(r.date) : n.add(r.date); setChosen(n); }} />
            <span>
              {r.date.slice(5)} ({r.weekday}) · 월령 {r.lunarAge ?? '결측'} · 일몰 {fmtTime(r.sunset)} · 월출 {fmtTime(r.moonrise)} · 월몰 {fmtTime(r.moonset)}
              {r.setFromPrevNight ? ' (전날 뜬 달)' : ''}
            </span>
          </label>
        ))}
        <label className="choice" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} />
          <span>이번 후보에는 없음</span>
        </label>
      </div>
      <div className="field">
        <span className="label">근거 카드: 판단에 쓴 자료 행을 2개 이상 붙이세요</span>
        <div className="row">
          {candidates.map((r) => (
            <button key={r.date} type="button" className="chip" aria-pressed={evidence.has(r.date)} style={evidence.has(r.date) ? { background: 'var(--c-primary)', color: '#fff' } : undefined} onClick={() => { const n = new Set(evidence); n.has(r.date) ? n.delete(r.date) : n.add(r.date); setEvidence(n); }}>
              {r.date.slice(5)} 행
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="plan-reason">이유 (어느 값이 어떻게 조건을 만족하나요?)</label>
        <textarea id="plan-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 9/13은 월출 19:15, 월몰 다음 날 05:40 이라 20시에는 떠 있다" />
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={submit} disabled={(!none && chosen.size === 0) || evidence.size < 2 || !reason.trim()}>
          계획서 제출
        </button>
        {evidence.size < 2 || !reason.trim() ? <span className="caption">근거 2개 이상과 이유가 있어야 제출할 수 있어요.</span> : null}
      </div>
      {note ? <p className={`note ${saved?.correct ? 'note--ok' : 'note--warn'}`} role="status">{note}</p> : null}
    </div>
  );
}

function Visible() {
  useScene(STEP, 's04-visible');
  useAutoComplete(STEP, 's04-visible', ['q04-visible', 'q04-visible-why']);
  return (
    <div className="stack">
      <ChoiceQuestion
        qid="q04-visible"
        stepId={STEP}
        sceneId="s04-visible"
        prompt="달이 지평선 위에 떠 있는 시간이라고 해서 반드시 볼 수 있을까요?"
        options={[
          { id: 'yes', label: '떠 있으면 항상 볼 수 있다', correct: false, feedback: '구름, 건물과 지형, 하늘의 밝기, 달의 고도가 관측을 막을 수 있어요. 자료의 ‘위’ 표시와 실제 관측 가능성을 구분해 보세요.' },
          { id: 'no', label: '아니다 — 구름·건물·지형·하늘 밝기 등에 따라 못 볼 수 있다', correct: true, feedback: '출몰 자료는 예측 정보이고 관측 보장이 아니에요. 이 앱은 날씨 자료를 쓰지 않아서 구름 상태는 알 수 없어요.' },
          { id: 'night', label: '해가 진 뒤라면 항상 볼 수 있다', correct: false, feedback: '밤이라도 구름이나 건물에 가릴 수 있고, 달이 지평선 근처에 낮게 있으면 보기 어려워요.' },
        ]}
      />
      <TextQuestion qid="q04-visible-why" stepId={STEP} sceneId="s04-visible" prompt="내가 사는 곳에서 달 관측을 방해할 수 있는 것 한 가지" rows={2} placeholder="예: 우리 집 창은 북쪽이라 남쪽 하늘의 달이 안 보인다" />
    </div>
  );
}

function Target() {
  useScene(STEP, 's04-target');
  useAutoComplete(STEP, 's04-target', ['q04-target']);
  const bundle = useSession((s) => s.bundle)!;
  const respond = useSession((s) => s.respond);
  const { rows, data } = useMonth();
  const { selected } = useSelection();
  const candidates = rows.filter((r) => selected.has(r.date));
  const saved = bundle.responses.find((r) => r.questionId === 'q04-target')?.latest as { date?: string } | undefined;
  if (candidates.length === 0) return <p className="note">먼저 ‘여러 날짜 비교’에서 날짜를 골라야 해요.</p>;
  return (
    <div className="stack">
      <p className="lead">고른 날짜 중 하나를 3D 활동의 <strong>목표 카드</strong>로 넘겨요. 이 날의 달을 우주에서 어디에 놓아야 할지 2차시에 직접 찾아요.</p>
      <div className="grid-3">
        {candidates.map((r) => (
          <button
            key={r.date}
            type="button"
            className="choice"
            aria-pressed={saved?.date === r.date}
            style={{ display: 'block' }}
            onClick={() =>
              respond('q04-target', STEP, 's04-target', {
                date: r.date,
                region: data?.region,
                lunarAge: r.lunarAge,
                approxTheta: r.approxTheta,
                moonrise: r.moonrise ?? null,
                moonset: r.moonset ?? null,
                sunset: r.sunset ?? null,
                source: data?.source,
                sourceLabel: data?.sourceLabel,
                fetchedAt: data?.fetchedAt,
              })
            }
          >
            <div className="row" style={{ alignItems: 'center' }}>
              {r.approxTheta !== null ? <PhaseDisk theta={r.approxTheta} size={60} label="월령 근사 모형" /> : null}
              <div style={{ fontSize: 'var(--fs-caption)' }}>
                <strong>{r.date}</strong>
                <div>월령 {r.lunarAge ?? '결측'}</div>
                <div>월출 {fmtTime(r.moonrise)} · 월몰 {fmtTime(r.moonset)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {saved?.date ? (
        <div className="card card--pale-green">
          <span className="mono">목표 카드</span>
          <p style={{ margin: 0 }}>
            {data?.region} {saved.date} — <SourceBadge type={data?.fallback ? 'app-calculation' : 'institution-forecast'} /> 원반은 ‘월령을 이용한 근사 모형’이에요. 2차시 07단계에서 이 자료를 우주에 놓아요.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function Step04({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's04-load':
      return <Load />;
    case 's04-read-row':
      return <ReadRow />;
    case 's04-compare':
      return <Compare />;
    case 's04-plan':
      return <Plan />;
    case 's04-visible':
      return <Visible />;
    case 's04-target':
      return <Target />;
    default:
      return null;
  }
}
