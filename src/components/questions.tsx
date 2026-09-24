import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/store/session';

export interface ChoiceOption {
  id: string;
  label: string;
  correct?: boolean;
  /** 이 선택지를 골랐을 때의 피드백(다음에 시험해 볼 것을 제안하는 문체) */
  feedback?: string;
}

/**
 * 선택형 문항. 응답은 { choice, correct } 로 저장된다(교사 집계가 correct 를 읽는다).
 * reveal=false 면 정답을 공개하지 않고 '내 생각 보관함'에 저장만 한다(01).
 */
export function ChoiceQuestion({
  qid,
  stepId,
  sceneId,
  prompt,
  options,
  reveal = true,
  onAnswered,
  children,
  disabled,
}: {
  qid: string;
  stepId: string;
  sceneId: string;
  prompt: React.ReactNode;
  options: ChoiceOption[];
  reveal?: boolean;
  onAnswered?: (opt: ChoiceOption) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const rec = useSession((s) => s.getResponse(qid));
  const respond = useSession((s) => s.respond);
  const latest = rec?.latest as { choice?: string } | undefined;
  const first = rec?.first as { choice?: string } | undefined;
  const chosen = options.find((o) => o.id === latest?.choice);
  const [retrying, setRetrying] = useState(false);

  function pick(o: ChoiceOption) {
    if (disabled) return;
    setRetrying(false);
    respond(qid, stepId, sceneId, { choice: o.id, correct: o.correct ?? null });
    onAnswered?.(o);
  }
  const showResult = reveal && chosen && !retrying;
  return (
    <div className="stack-sm" role="group" aria-label={typeof prompt === 'string' ? prompt : undefined}>
      <p style={{ marginBottom: 4 }}>{prompt}</p>
      <div className="choice-list">
        {options.map((o, i) => (
          <button key={o.id} type="button" className="choice" aria-pressed={chosen?.id === o.id} onClick={() => pick(o)} disabled={disabled || (showResult && chosen.correct === true)}>
            <span className="choice__mark">{['①', '②', '③', '④', '⑤', '⑥'][i]}</span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      {chosen && !reveal ? <p className="note note--info">내 생각 보관함에 저장했어요. 정답은 지금 공개하지 않아요. 나중에 이 생각을 다시 꺼내 볼 거예요.</p> : null}
      {showResult ? (
        <div className={`feedback ${chosen.correct ? '' : 'feedback--retry'}`} role="status">
          <p style={{ marginBottom: chosen.correct ? 0 : 8 }}>
            <strong>{chosen.correct ? '그렇게 볼 수 있어요.' : '다시 살펴볼까요?'}</strong> {chosen.feedback}
          </p>
          {!chosen.correct ? (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setRetrying(true)}>
              다시 골라 보기
            </button>
          ) : null}
          {first?.choice && first.choice !== chosen.id ? <p className="micro" style={{ marginTop: 8 }}>처음 고른 답도 보관되어 있어요.</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/** 서술형 문항 — 입력이 멈추면 자동 저장. 응답은 { text } */
export function TextQuestion({
  qid,
  stepId,
  sceneId,
  prompt,
  placeholder,
  rows = 3,
  helper,
  disabled,
  onSaved,
}: {
  qid: string;
  stepId: string;
  sceneId: string;
  prompt: React.ReactNode;
  placeholder?: string;
  rows?: number;
  helper?: string;
  disabled?: boolean;
  onSaved?: (text: string) => void;
}) {
  const rec = useSession((s) => s.getResponse(qid));
  const respond = useSession((s) => s.respond);
  const saved = (rec?.latest as { text?: string } | undefined)?.text ?? '';
  const [text, setText] = useState(saved);
  const timer = useRef<number | null>(null);
  const lastSaved = useRef(saved);
  useEffect(() => {
    if (saved !== lastSaved.current && saved !== text) {
      setText(saved);
      lastSaved.current = saved;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);
  function commit(v: string) {
    if (v === lastSaved.current) return;
    lastSaved.current = v;
    respond(qid, stepId, sceneId, { text: v });
    onSaved?.(v);
  }
  return (
    <div className="field">
      <label htmlFor={qid}>{prompt}</label>
      <textarea
        id={qid}
        className="textarea"
        rows={rows}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => commit(e.target.value), 900);
        }}
        onBlur={(e) => {
          if (timer.current) window.clearTimeout(timer.current);
          commit(e.target.value);
        }}
      />
      {helper ? <span className="micro">{helper}</span> : null}
    </div>
  );
}

/** 단계별 힌트 — 사용해도 불이익 없음. 사용 횟수만 기록 */
export function Hints({ hints, level, onNext, dark }: { hints: string[]; level: number; onNext: () => void; dark?: boolean }) {
  return (
    <div className={dark ? 'stack-sm' : 'card card--pale-blue stack-sm'} style={dark ? { color: '#fff' } : undefined}>
      {hints.slice(0, level).map((h, i) => (
        <p key={i} style={{ margin: 0, fontSize: 'var(--fs-caption)' }}>
          <span className="mono" style={dark ? { color: 'rgba(255,255,255,.7)' } : undefined}>
            힌트 {i + 1}
          </span>{' '}
          {h}
        </p>
      ))}
      {level < hints.length ? (
        <button type="button" className={`btn btn--sm ${dark ? 'btn--outline-dark' : 'btn--secondary'}`} onClick={onNext}>
          힌트 {level + 1}단계 보기 {level === 0 ? '(써도 불이익 없어요)' : ''}
        </button>
      ) : null}
    </div>
  );
}

export function useHints(count: number) {
  const [level, setLevel] = useState(0);
  return { level, next: () => setLevel((l) => Math.min(count, l + 1)), reset: () => setLevel(0) };
}
