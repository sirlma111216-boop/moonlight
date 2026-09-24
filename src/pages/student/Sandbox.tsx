import { useState } from 'react';
import { Link } from 'react-router';
import type { ModelMode } from '@shared/types';
import { useSession } from '@/store/session';
import { ModelLab } from '@/three/ModelLab';
import { useLabState, newAttemptId } from '@/lib/labState';
import { positionNo } from '@/lib/words';

/**
 * 자유 실험(샌드박스, R3-4). 열 때마다 '예측 → 조작 → 관찰 기록' 카드가 붙고,
 * 기록은 보고서에 '자유 실험 기록'으로 선택 첨부된다. 실제 날짜 모드와 섞이지 않는다.
 */
export default function Sandbox() {
  const [state, setState] = useLabState('sandbox', { inclination: 0, nodeLongitude: 0, showShadow: true });
  const [mode, setMode] = useState<ModelMode>('sandbox');
  const [predict, setPredict] = useState('');
  const [observe, setObserve] = useState('');
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const saveAttempt = useSession((s) => s.saveAttempt);
  const attempts = useSession((s) => s.bundle?.attempts.filter((a) => a.isSandbox) ?? []);
  const [saved, setSaved] = useState(false);

  function record() {
    saveAttempt({
      id: newAttemptId('sandbox'),
      stepId: 'sandbox',
      sceneId: 'sandbox',
      mode: 'sandbox',
      targetSource: 'self',
      target: null,
      state,
      submitted: true,
      result: { predict, observe, renderer, labMode: mode },
      hintsUsed: 0,
      isSandbox: true,
    });
    setSaved(true);
    setPredict('');
    setObserve('');
  }

  return (
    <main id="main" className="scene stack" style={{ paddingTop: 24 }}>
      <div className="row row--between">
        <div>
          <span className="mono">마음대로 해 보기</span>
          <h2 style={{ marginBottom: 4 }}>자유 실험</h2>
          <p className="caption" style={{ margin: 0 }}>
            여기서는 마음대로 해 봐도 돼요. 수업 활동에서 만든 모형은 바뀌지 않아요. 적은 기록은 원하면 보고서에 붙일 수 있어요. 자유 실험에서는 빈 곳을 끌어 보는 자리도 마음대로 돌릴 수 있어요.
          </p>
        </div>
        <Link className="btn btn--secondary" to="/learn">
          수업 활동으로 돌아가기
        </Link>
      </div>
      <div className="row">
        {(['sandbox', 'phase', 'eclipse-lunar', 'eclipse-solar', 'tilt'] as ModelMode[]).map((m) => (
          <button key={m} type="button" className={`btn btn--sm ${mode === m ? '' : 'btn--secondary'}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
            {{ sandbox: '모두 켜기', phase: '달 모양만', 'eclipse-lunar': '월식', 'eclipse-solar': '일식', tilt: '길 기울이기' }[m]}
          </button>
        ))}
      </div>
      <ModelLab mode={mode} state={state} onChange={setState} controls={{ theta: true, inclination: true, node: true, observer: mode === 'eclipse-solar' || mode === 'sandbox', play: true }} badges={['자유 실험 중']} sandboxLink={false} freeCamera onRendererChange={setRenderer}>
        <div className="card stack-sm" style={{ padding: 12 }}>
          <span className="mono">예측하기 → 해 보기 → 본 것 적기</span>
          <div className="field">
            <label htmlFor="sb-predict">예측: 무엇을 바꾸면 어떻게 될까요?</label>
            <input id="sb-predict" className="input" value={predict} onChange={(e) => setPredict(e.target.value)} placeholder="예: 달의 길이 기울지 않으면 보름달마다 월식이 일어날 것이다" />
          </div>
          <div className="field">
            <label htmlFor="sb-observe">본 것: 실제로 어떻게 되었나요?</label>
            <input id="sb-observe" className="input" value={observe} onChange={(e) => setObserve(e.target.value)} placeholder="예: 정말 그랬다 / 주황색 선의 방향에 따라 달랐다" />
          </div>
          <button type="button" className="btn btn--sm" onClick={record} disabled={!predict.trim() || !observe.trim()}>
            이 상태와 기록 저장
          </button>
          {saved ? <p className="micro" style={{ margin: 0 }}>자유 실험 기록으로 저장했어요 ({attempts.length}개).</p> : null}
        </div>
      </ModelLab>
      {attempts.length ? (
        <section className="card stack-sm">
          <span className="mono">내 자유 실험 기록</span>
          {attempts.slice(-6).reverse().map((a) => {
            const r = a.result as { predict?: string; observe?: string };
            return (
              <div key={a.id} style={{ borderTop: '1px solid var(--c-hairline)', paddingTop: 6, fontSize: 'var(--fs-caption)' }}>
                <span className="mono">{a.createdAt.slice(0, 16).replace('T', ' ')}</span> · 달 {positionNo(a.state.theta)}번 자리{a.state.inclination > 0.05 ? ' · 길 약 5도 기울임' : ''}
                <div>예측: {r.predict}</div>
                <div>본 것: {r.observe}</div>
              </div>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
