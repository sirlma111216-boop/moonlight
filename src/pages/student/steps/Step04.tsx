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

/** 04 전체가 함께 쓰는 '지금 조회한 지역·달' (q04-query 응답에 저장) */
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

function hourWords(hhmm: string) {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}시${m !== '00' ? ` ${Number(m)}분` : ''}`;
}

function SourceLine({ data }: { data: MonthDataResponse }) {
  return (
    <div className="stack-sm">
      <div className="row">
        <SourceBadge type={data.fallback ? 'app-calculation' : 'institution-forecast'} />
        <span className="micro">
          {data.region} · {data.year}년 {data.month}월 · 시각은 모두 우리나라 시각이에요
        </span>
      </div>
      {data.fallback ? (
        <p className="note note--warn">
          지금은 천문연구원 자료를 불러오지 못해서, 이 앱이 컴퓨터로 계산한 값을 대신 보여 줘요. 그래서 이름표가 ‘컴퓨터 계산’이에요. 활동은 그대로 할 수 있어요.
        </p>
      ) : null}
    </div>
  );
}

function DataTable({ rows, selected, onToggle, highlight, compact }: { rows: DayRow[]; selected?: Set<string>; onToggle?: (d: string) => void; highlight?: string; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {onToggle ? <th scope="col">고르기</th> : null}
            <th scope="col">날짜</th>
            <th scope="col">월령</th>
            {!compact ? <th scope="col">달 모양 그림</th> : null}
            <th scope="col">해 지는 시각</th>
            <th scope="col">달 뜨는 시각</th>
            <th scope="col">달 지는 시각</th>
            <th scope="col">밤 9시에 달은?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} aria-selected={selected?.has(r.date)} className={highlight === r.date ? 'is-highlight' : ''}>
              {onToggle ? (
                <td>
                  <input type="checkbox" checked={selected?.has(r.date) ?? false} onChange={() => onToggle(r.date)} aria-label={`${r.date} 고르기`} />
                </td>
              ) : null}
              <td>
                {Number(r.date.slice(5, 7))}월 {r.day}일 ({r.weekday})
              </td>
              <td>{r.lunarAge ?? '자료 없음'}</td>
              {!compact ? <td>{r.approxTheta !== null ? <PhaseDisk theta={r.approxTheta} size={28} label={`월령 ${r.lunarAge}으로 그려 본 달 모양`} /> : '—'}</td> : null}
              <td>{fmtTime(r.sunset)}</td>
              <td>
                {fmtTime(r.moonrise)}
                {r.riseSetsNextDay ? <span className="micro"> (다음 날 새벽에 짐)</span> : null}
              </td>
              <td>
                {fmtTime(r.moonset)}
                {r.setFromPrevNight ? <span className="micro"> (전날 뜬 달이 짐)</span> : null}
              </td>
              <td>{r.at21 === 'above' ? '떠 있음' : r.at21 === 'below' ? '져 있음' : '?'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!compact ? (
        <p className="micro">
          ‘달 모양 그림’은 월령으로 그려 본 그림이에요. 실제 사진은 아니에요. ‘없음’은 그날 달이 뜨거나 지지 않았다는 뜻이에요. ‘전날 뜬 달이 짐’은 전날 밤에 뜬 달이 이날 지는 것이라는 뜻이에요.
        </p>
      ) : null}
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
      <p className="lead">한국천문연구원은 날마다의 달 정보를 계산해서 누구나 볼 수 있게 알려 줘요. 이 자료로 달을 볼 날을 찾아봐요.</p>
      <div className="card card--stone stack-sm">
        <span className="mono">표에 나오는 말</span>
        <p style={{ margin: 0 }}>
          <Term id="lunarAge" />은 삭(달이 거의 안 보이는 날)에서 며칠이 지났는지를 나타낸 수예요. 월령이 0이면 달이 거의 안 보이고, 7쯤이면 상현달, 15쯤이면 보름달 무렵이에요.
        </p>
        <p style={{ margin: 0 }}>‘달 뜨는 시각’은 달이 땅 위로 올라오는 시각, ‘달 지는 시각’은 땅 아래로 내려가는 시각이에요. 해처럼 달도 날마다 뜨고 져요.</p>
      </div>
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
          <label htmlFor="q-ym">몇 년 몇 월</label>
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
      {loading ? <p className="muted">자료를 가져오는 중이에요. 처음에는 조금 걸릴 수 있어요.</p> : null}
      {error ? <p className="note note--error">{error}</p> : null}
      {data ? (
        <>
          <SourceLine data={data} />
          <DataTable rows={rows} />
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
  const dateWords = `${Number(target.date.slice(5, 7))}월 ${target.day}일`;
  return (
    <div className="stack">
      <p className="lead">
        표 전체를 한꺼번에 보면 어려워요. 먼저 <strong>한 줄</strong>만 읽어 봐요. 노랗게 칠한 {dateWords}의 줄을 보고 차례로 답하세요.
      </p>
      <DataTable rows={rows.filter((r) => Math.abs(r.day - target.day) <= 2)} highlight={target.date} />
      <div className="card stack">
        <div className="field">
          <label htmlFor="row-age">1) {dateWords}의 월령은 얼마인가요? (표에 적힌 수 그대로)</label>
          <div className="row">
            <input id="row-age" className="input" style={{ width: 140 }} inputMode="decimal" value={age} onChange={(e) => setAge(e.target.value)} placeholder="예: 12.3" />
            <button type="button" className="btn btn--sm" onClick={() => respond('q04-row-age', STEP, 's04-read-row', { answer: age, correct: target.lunarAge !== null && Math.abs(Number(age) - target.lunarAge) <= 0.5 })} disabled={!age}>
              확인
            </button>
          </div>
          {ageRec ? (
            <p className={`note ${ageRec.correct ? 'note--ok' : 'note--warn'}`}>
              {ageRec.correct ? `맞아요. 월령이 ${target.lunarAge}이면 삭에서 약 ${Math.round(target.lunarAge ?? 0)}일이 지났다는 뜻이에요.` : `‘월령’ 칸에서 ${dateWords} 줄을 다시 찾아보세요. 적힌 수는 ${target.lunarAge ?? '자료 없음'}이에요.`}
            </p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="row-rise">2) {dateWords}에 달이 뜬 시각은 언제인가요?</label>
          <div className="row">
            <input id="row-rise" type="time" className="input" style={{ width: 'auto' }} value={rise} disabled={noRise} onChange={(e) => setRise(e.target.value)} />
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={noRise} onChange={(e) => setNoRise(e.target.checked)} /> 이날은 달이 뜨지 않았다
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
          {riseRec ? (
            <p className={`note ${riseRec.correct ? 'note--ok' : 'note--warn'}`}>
              {riseRec.correct
                ? `맞아요. ${typeof target.moonrise === 'string' ? `${hourWords(target.moonrise)}에 떴어요.` : '이날은 달이 뜨지 않았어요.'} 달은 날마다 뜨는 시각이 조금씩 달라서, 어떤 날은 자정을 넘겨 다음 날 새벽에 뜨기도 해요.`
                : `‘달 뜨는 시각’ 칸을 다시 보세요. 이날은 ${typeof target.moonrise === 'string' ? `${target.moonrise}에 떴어요` : '달이 뜨지 않았어요'}.`}
            </p>
          ) : null}
        </div>
        <ChoiceQuestion
          qid="q04-row-21"
          stepId={STEP}
          sceneId="s04-read-row"
          prompt={`3) ${dateWords} 밤 9시에 달은 하늘에 떠 있을까요?`}
          options={[
            { id: 'above', label: '떠 있다', correct: above === 'above', feedback: above === 'above' ? '맞아요. 밤 9시는 달이 뜬 뒤이고 아직 지기 전이에요. 떠 있다고 꼭 보이는 것은 아닌데, 그 이야기는 뒤에서 해요.' : '달이 뜬 시각과 진 시각을 시간 순서대로 놓아 보세요. 전날 밤에 뜬 달이 이날 새벽에 지기도 해요.' },
            { id: 'below', label: '져 있다 (땅 아래에 있다)', correct: above === 'below', feedback: above === 'below' ? '맞아요. 밤 9시는 달이 진 뒤이거나 아직 뜨기 전이에요.' : '밤 9시 바로 앞에 일어난 일이 ‘달이 뜸’인지 ‘달이 짐’인지 찾아보세요.' },
            { id: 'unknown', label: '표만 보고는 알 수 없다', correct: above === 'unknown', feedback: above === 'unknown' ? '맞아요. 이날은 자료가 비어 있어서 알 수 없어요.' : '앞뒤 날짜의 줄까지 보면 알 수 있어요. 밤 9시 바로 앞에 무슨 일이 있었는지 찾아보세요.' },
          ]}
        >
          <p className="micro">도움말: 달이 뜬 시각과 진 시각을 시간 순서대로 줄 세워 보세요. 밤 9시 바로 앞에 ‘달이 뜸’이 있으면 떠 있는 거예요.</p>
        </ChoiceQuestion>
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
        서로 다른 날짜를 {min === max ? `${min}개` : `${min}~${max}개`} 골라 보세요. 날짜가 바뀌면 달 모양과 달 뜨는 시각이 어떻게 달라지는지 표의 수로 비교해요.
      </p>
      <p className="caption">며칠씩 떨어진 날짜를 고르면 차이가 더 잘 보여요.</p>
      <DataTable rows={rows} selected={selected} onToggle={toggle} compact />
      <p className="caption">
        고른 날짜 {chosen.length}개 (최소 {min}개)
      </p>
      {chosen.length >= 2 ? (
        <div className="card card--stone stack-sm">
          <span className="mono">내가 고른 날짜</span>
          <div className="row" style={{ gap: 18 }}>
            {chosen.map((r) => (
              <div key={r.date} style={{ textAlign: 'center', fontSize: 'var(--fs-micro)' }}>
                {r.approxTheta !== null ? <PhaseDisk theta={r.approxTheta} size={56} label={`월령 ${r.lunarAge}으로 그려 본 달 모양`} /> : '—'}
                <div>
                  {Number(r.date.slice(5, 7))}월 {r.day}일
                </div>
                <div>월령 {r.lunarAge ?? '자료 없음'}</div>
                <div>달 뜸 {fmtTime(r.moonrise)}</div>
                <div>달 짐 {fmtTime(r.moonset)}</div>
              </div>
            ))}
          </div>
          <span className="micro">달 모양은 월령으로 그려 본 그림이에요.</span>
        </div>
      ) : null}
      {chosen.length >= min ? (
        <>
          <ChoiceQuestion
            qid="q04-trend"
            stepId={STEP}
            sceneId="s04-compare"
            prompt="고른 날짜들을 날짜 순서로 보면, 달 뜨는 시각은 대체로 어떻게 바뀌나요?"
            options={[
              { id: 'later', label: '날이 갈수록 늦어진다', correct: trend === 'later', feedback: trend === 'later' ? '맞아요. 이 자료에서는 그래요. 하루에 늦어지는 정도가 늘 똑같지는 않으니, 아래에서 두 날짜의 차이를 직접 적어 보세요.' : '고른 날짜의 달 뜨는 시각을 날짜 순서대로 다시 적어 보세요. 달이 뜨지 않은 날은 빼고 보세요.' },
              { id: 'earlier', label: '날이 갈수록 빨라진다', correct: trend === 'earlier', feedback: trend === 'earlier' ? '이 자료에서는 그래요.' : '고른 날짜의 달 뜨는 시각을 날짜 순서대로 다시 적어 보세요.' },
              { id: 'mixed', label: '들쭉날쭉하다 / 표만 보고는 모르겠다', correct: trend === 'mixed' || trend === 'unknown', feedback: trend === 'mixed' || trend === 'unknown' ? '달이 뜨지 않은 날이 섞여 있으면 그렇게 보일 수 있어요. 이어진 날짜를 더 골라서 다시 비교해 보세요.' : '이 자료에서는 한쪽으로 바뀌는 모습이 보여요. 시각을 날짜 순서대로 줄 세워 보세요.' },
            ]}
          />
          <TextQuestion qid="q04-compare-note" stepId={STEP} sceneId="s04-compare" prompt="두 날짜를 골라, 달 뜨는 시각이 얼마나 차이 나는지 써 보세요." placeholder="예: 9월 12일은 오후 6시 40분, 9월 13일은 오후 7시 15분 → 35분쯤 늦어졌다" rows={2} />
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
  const winWords = `${hourWords(win.start)}부터 ${hourWords(win.end)}까지`;

  function submit() {
    const chosenArr = [...chosen];
    let correct: boolean;
    if (none) correct = valid.length === 0;
    else correct = chosenArr.length > 0 && chosenArr.every((d) => valid.includes(d));
    const evidenceOk = evidence.size >= 2 && reason.trim().length > 0;
    respond('q04-plan', STEP, 's04-plan', { chosen: chosenArr, none, evidence: [...evidence], reason, correct, validDates: valid, window: win });
    if (correct) {
      setNote(none ? '맞아요. 이번에 고른 날짜 중에는 그 시간에 달이 떠 있는 날이 없어요. 다른 날짜를 더 골라 보는 것도 방법이에요.' : `조건에 맞아요. 이번에 고른 날짜 중 조건에 맞는 날은 ${valid.length}일이고, 그중 어느 날을 골라도 정답이에요.`);
      if (evidenceOk) void awardBadge('data-interpreter');
    } else {
      setNote(none ? '고른 날짜 중에 그 시간에 달이 떠 있는 날이 있어요. 각 날짜의 ‘밤 9시에 달은?’ 칸과 달 뜨는·지는 시각을 다시 보세요.' : '고른 날 중에 그 시간에 달이 져 있는 날이 있어요. 달 뜨는 시각과 지는 시각을 다시 확인해 보세요. 전날 뜬 달이 새벽에 지는 경우도 있어요.');
    }
  }

  return (
    <div className="stack">
      <div className="card card--pale-blue">
        <span className="mono">미니 게임 · 오늘 밤 관측 계획서</span>
        <p style={{ margin: 0 }}>
          수업이 끝난 뒤 <strong>{winWords}</strong> 사이에 {bundle.classSession.region}에서 달을 찾아보려고 해요. 어느 날이 좋을까요? 알맞은 날이 여러 개면 모두 골라도 돼요. 하나도 없으면 ‘이번에 고른 날짜 중에는 없음’을 고르세요.
        </p>
      </div>
      <div className="stack-sm">
        {candidates.map((r) => (
          <label key={r.date} className="choice" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={chosen.has(r.date)}
              disabled={none}
              onChange={() => {
                const n = new Set(chosen);
                if (n.has(r.date)) n.delete(r.date);
                else n.add(r.date);
                setChosen(n);
              }}
            />
            <span>
              {Number(r.date.slice(5, 7))}월 {r.day}일 ({r.weekday}) · 월령 {r.lunarAge ?? '자료 없음'} · 해 짐 {fmtTime(r.sunset)} · 달 뜸 {fmtTime(r.moonrise)} · 달 짐 {fmtTime(r.moonset)}
              {r.setFromPrevNight ? ' (전날 뜬 달이 짐)' : ''}
            </span>
          </label>
        ))}
        <label className="choice" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={none} onChange={(e) => setNone(e.target.checked)} />
          <span>이번에 고른 날짜 중에는 없음</span>
        </label>
      </div>
      <div className="field">
        <span className="label">근거: 판단할 때 살펴본 날짜를 2개 이상 눌러 주세요</span>
        <div className="row">
          {candidates.map((r) => (
            <button
              key={r.date}
              type="button"
              className="chip"
              aria-pressed={evidence.has(r.date)}
              style={evidence.has(r.date) ? { background: 'var(--c-primary)', color: '#fff' } : undefined}
              onClick={() => {
                const n = new Set(evidence);
                if (n.has(r.date)) n.delete(r.date);
                else n.add(r.date);
                setEvidence(n);
              }}
            >
              {Number(r.date.slice(5, 7))}월 {r.day}일
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="plan-reason">까닭: 어느 수를 보고 그렇게 판단했나요?</label>
        <textarea id="plan-reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 9월 13일은 달이 오후 7시 15분에 떠서 다음 날 새벽에 지니까 밤 8시에는 떠 있다" />
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={submit} disabled={(!none && chosen.size === 0) || evidence.size < 2 || !reason.trim()}>
          계획서 제출
        </button>
        {evidence.size < 2 || !reason.trim() ? <span className="caption">근거 날짜 2개와 까닭을 써야 제출할 수 있어요.</span> : null}
      </div>
      {note ? (
        <p className={`note ${saved?.correct ? 'note--ok' : 'note--warn'}`} role="status">
          {note}
        </p>
      ) : null}
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
        prompt="달이 하늘에 떠 있는 시간이라면, 언제나 달을 볼 수 있을까요?"
        options={[
          { id: 'yes', label: '떠 있으면 언제나 볼 수 있다', correct: false, feedback: '구름이 끼거나, 건물이나 산에 가리거나, 달이 너무 낮게 떠 있으면 못 볼 수 있어요. 표의 ‘떠 있음’은 보인다는 약속이 아니에요.' },
          { id: 'no', label: '아니다. 구름, 건물, 산 때문에 못 볼 수도 있다', correct: true, feedback: '맞아요. 표는 달이 떠 있는지만 알려 줘요. 이 앱은 날씨 자료를 쓰지 않아서 구름이 낄지는 알 수 없어요.' },
          { id: 'night', label: '해가 진 뒤라면 언제나 볼 수 있다', correct: false, feedback: '밤이라도 구름이나 건물에 가릴 수 있고, 달이 땅 가까이 낮게 있으면 보기 어려워요.' },
        ]}
      />
      <TextQuestion qid="q04-visible-why" stepId={STEP} sceneId="s04-visible" prompt="우리 집이나 동네에서 달을 보기 어렵게 만드는 것을 하나 써 보세요." rows={2} placeholder="예: 우리 집 창문은 북쪽이라 남쪽 하늘의 달이 안 보인다" />
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
      <p className="lead">
        고른 날짜 중 하나를 <strong>목표 카드</strong>로 정해요. 2차시에 이날의 달이 우주에서 어디에 있었을지 3D 모형으로 직접 찾아볼 거예요.
      </p>
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
              {r.approxTheta !== null ? <PhaseDisk theta={r.approxTheta} size={60} label="월령으로 그려 본 달 모양" /> : null}
              <div style={{ fontSize: 'var(--fs-caption)' }}>
                <strong>
                  {Number(r.date.slice(5, 7))}월 {r.day}일
                </strong>
                <div>월령 {r.lunarAge ?? '자료 없음'}</div>
                <div>
                  달 뜸 {fmtTime(r.moonrise)} · 달 짐 {fmtTime(r.moonset)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      {saved?.date ? (
        <div className="card card--pale-green">
          <span className="mono">목표 카드</span>
          <p style={{ margin: 0 }}>
            {data?.region} {saved.date} <SourceBadge type={data?.fallback ? 'app-calculation' : 'institution-forecast'} /> 달 모양 그림은 월령으로 그려 본 것이에요. 2차시 7단계에서 이 날의 달을 우주에 놓아 봐요.
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
