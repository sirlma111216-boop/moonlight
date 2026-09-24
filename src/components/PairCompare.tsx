import { useSession } from '@/store/session';

/**
 * '짝과 비교하기' 카드(R4). 다른 학생의 기록을 보여주지 않고 대화를 유도한다.
 * 짝에게 물어볼 질문 한 가지 + '내 생각이 바뀌었는가' 한 줄 기록.
 */
export function PairCompare({ qid, stepId, sceneId, ask, topic }: { qid: string; stepId: string; sceneId: string; ask: string; topic: string }) {
  const rec = useSession((s) => s.getResponse(qid));
  const respond = useSession((s) => s.respond);
  const v = (rec?.latest as { changed?: string; note?: string } | undefined) ?? {};
  function update(patch: Partial<{ changed: string; note: string }>) {
    respond(qid, stepId, sceneId, { ...v, ...patch });
  }
  return (
    <section className="card card--stone stack" aria-labelledby={`${qid}-h`}>
      <div>
        <span className="mono">Pair talk</span>
        <h3 id={`${qid}-h`}>짝과 비교하기 — {topic}</h3>
        <p>
          짝에게 물어보세요: <strong>“{ask}”</strong>
        </p>
        <p className="caption">앱은 다른 친구의 기록을 보여주지 않아요. 직접 이야기 나눈 뒤 아래에 한 줄만 남기세요.</p>
      </div>
      <div className="field">
        <span className="label">짝의 생각을 듣고 내 생각이 바뀌었나요?</span>
        <div className="row" role="radiogroup" aria-label="생각의 변화">
          {[
            ['no', '그대로다'],
            ['some', '조금 바뀌었다'],
            ['yes', '바뀌었다'],
          ].map(([k, label]) => (
            <button key={k} type="button" className="choice" style={{ width: 'auto' }} role="radio" aria-checked={v.changed === k} onClick={() => update({ changed: k })}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${qid}-note`}>한 줄 기록 (무엇이 같았고 무엇이 달랐나요?)</label>
        <input id={`${qid}-note`} className="input" defaultValue={v.note ?? ''} onBlur={(e) => update({ note: e.target.value })} placeholder="예: 짝은 ②를 골랐는데 근거가 달랐다." />
      </div>
    </section>
  );
}
