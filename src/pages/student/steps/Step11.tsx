import { useEffect, useState } from 'react';
import { PHYS, scanMonthForEclipses } from '@shared/eclipseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { ModelLab, LUNAR_SHORT, SOLAR_SHORT } from '@/three/ModelLab';
import { useLabState } from '@/lib/labState';
import { TEXTBOOK_NAMES_ORBIT } from '@/content/glossary';

const STEP = 's11';

function ScanCard({ inclination, nodeLongitude, label }: { inclination: number; nodeLongitude: number; label: string }) {
  const scan = scanMonthForEclipses({ inclination, nodeLongitude }, 2);
  return (
    <div className="card" style={{ padding: 12 }}>
      <span className="mono">{label}</span>
      <p style={{ margin: 0, fontSize: 'var(--fs-caption)' }}>
        달이 한 바퀴 도는 동안 — 월식: <strong>{LUNAR_SHORT[scan.lunar]}</strong> · 일식: <strong>{SOLAR_SHORT[scan.solar]}</strong>
      </p>
    </div>
  );
}

function SceneA() {
  useScene(STEP, 's11-a');
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s11-a', { theta: 0, inclination: 0, nodeLongitude: 0, showShadow: true, view: 'side' });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  useAutoComplete(STEP, 's11-a', ['q11-a-observe']);
  const rec = useSession((s) => s.getResponse('q11-a-observe'));
  useEffect(() => {
    if (rec) saveAttempt({ id: 's11-a-snapshot', stepId: STEP, sceneId: 's11-a', mode: 'tilt', targetSource: 'app:tilt-0', target: { inclination: 0 }, state, submitted: true, result: { scan: scanMonthForEclipses({ inclination: 0, nodeLongitude: state.nodeLongitude }, 2), renderer }, hintsUsed: 0, isSandbox: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(rec)]);
  return (
    <div className="stack">
      <p className="lead">삭과 보름달은 매달 오는데, 일식과 월식은 왜 매달 일어나지 않을까요? 먼저 상상 실험을 해 봐요.</p>
      <div className="card card--stone stack-sm">
        <span className="mono">훌라후프로 생각해 보기</span>
        <p style={{ margin: 0 }}>
          지구는 태양 둘레를 돌아요. 이 길을 아주 큰 <strong>판</strong>이라고 생각해 보세요. 달이 지구 둘레를 도는 길은 그 판 위에 놓인 <strong>훌라후프</strong>예요.
        </p>
        <p style={{ margin: 0 }}>만약 훌라후프가 판 위에 납작하게 딱 붙어 있다면 어떻게 될까요?</p>
      </div>
      <p className="caption">‘한 달 동안 돌려 보기’를 누르고, 1번 자리(삭)와 5번 자리(보름달)에서 무슨 일이 생기는지 보세요. 지금은 옆에서 보고 있어요.</p>
      <ModelLab mode="tilt" modeLabel="상상 실험: 기울지 않은 길" state={{ ...state, inclination: 0 }} onChange={(s) => setState({ ...s, inclination: 0 })} controls={{ theta: true, play: true }} marks onRendererChange={setRenderer}>
        <ScanCard inclination={0} nodeLongitude={state.nodeLongitude} label="기울지 않았을 때" />
      </ModelLab>
      <ChoiceQuestion
        qid="q11-a-observe"
        stepId={STEP}
        sceneId="s11-a"
        prompt="달의 길이 기울지 않았다면, 한 달 동안 어떤 일이 생겼나요?"
        options={[
          { id: 'both', label: '1번 자리에서 일식, 5번 자리에서 월식이 매달 일어난다', correct: true, feedback: '맞아요. 길이 기울지 않으면 태양, 지구, 달이 삭과 보름달마다 꼭 한 줄이 돼요. 하지만 실제로는 그렇지 않죠. 다음 장면에서 까닭을 찾아봐요.' },
          { id: 'none', label: '아무 일도 일어나지 않는다', correct: false, feedback: '‘그림자 보기’를 켜고 달을 1번과 5번 자리에 놓아 보세요. 달과 그림자가 겹치나요?' },
          { id: 'sometimes', label: '어떤 달에는 일어나고 어떤 달에는 안 일어난다', correct: false, feedback: '결과 카드를 다시 보세요. 길이 기울지 않은 이 상상 실험에서는 매달 겹쳐요.' },
        ]}
      />
    </div>
  );
}

function SceneB() {
  useScene(STEP, 's11-b');
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s11-b', { theta: 180, inclination: PHYS.realInclinationDeg, nodeLongitude: 90, showShadow: true, view: 'side' });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  const scan = scanMonthForEclipses({ inclination: PHYS.realInclinationDeg, nodeLongitude: state.nodeLongitude }, 2);
  const eclipseThisMonth = scan.lunar !== 'none';
  useAutoComplete(STEP, 's11-b', ['q11-b-observe']);
  const rec = useSession((s) => s.getResponse('q11-b-observe'));
  useEffect(() => {
    if (rec) saveAttempt({ id: 's11-b-snapshot', stepId: STEP, sceneId: 's11-b', mode: 'tilt', targetSource: 'app:tilt-real', target: { inclination: PHYS.realInclinationDeg }, state, submitted: true, result: { scan, renderer }, hintsUsed: 0, isSandbox: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(rec)]);
  return (
    <div className="stack">
      <p className="lead">실제로는 달의 훌라후프가 큰 판에서 <strong>약 5도</strong> 기울어 있어요.</p>
      <p>
        그래서 달은 한 바퀴 도는 동안 판보다 조금 위로 갔다가, 조금 아래로 내려가요. ‘바로 위에서 보기’로 보면 태양, 지구, 달이 한 줄인 것 같아도, ‘옆에서 보기’로 보면 달이 지구 그림자보다 위나 아래로 지나갈 수 있어요.
      </p>
      <ModelLab mode="tilt" modeLabel="실제처럼 약 5도 기운 길" state={{ ...state, inclination: PHYS.realInclinationDeg }} onChange={(s) => setState({ ...s, inclination: PHYS.realInclinationDeg })} controls={{ theta: true, play: true }} marks onRendererChange={setRenderer}>
        <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={state.nodeLongitude} label="약 5도 기울었을 때" />
        <p className="lab__hint">‘바로 위에서 보기’와 ‘옆에서 보기’를 번갈아 누르며 5번 자리의 달을 비교하세요.</p>
      </ModelLab>
      <ChoiceQuestion
        qid="q11-b-observe"
        stepId={STEP}
        sceneId="s11-b"
        prompt="이번에는 5번 자리(보름달)의 달이 지구 그림자 속에 들어갔나요?"
        options={[
          { id: 'yes', label: '들어갔다 (월식)', correct: eclipseThisMonth, feedback: eclipseThisMonth ? '이번에는 들어갔어요. 다음 장면에서 기울어진 방향을 바꾸면 어떻게 되는지 보세요.' : '‘옆에서 보기’로 확인해 보세요. 달이 그림자보다 위나 아래로 지나가요. 위에서만 보면 겹쳐 보일 수 있어요.' },
          { id: 'no', label: '비껴갔다 (그림자보다 위나 아래로 지나갔다)', correct: !eclipseThisMonth, feedback: !eclipseThisMonth ? '맞아요. 길이 기울어 있어서 보름달이어도 그림자를 비껴갈 수 있어요. 그렇다면 언제 한 줄이 될까요? 다음 장면에서 알아봐요.' : '이번에는 들어갔어요. 옆에서 보기로 달의 높이를 다시 확인해 보세요.' },
        ]}
      />
    </div>
  );
}

function SceneC() {
  useScene(STEP, 's11-c');
  const saveAttempt = useSession((s) => s.saveAttempt);
  const [state, setState] = useLabState('s11-c', { theta: 180, inclination: PHYS.realInclinationDeg, nodeLongitude: 90, showShadow: true, view: 'default' });
  const [renderer, setRenderer] = useState<'3d' | '2d'>('3d');
  useAutoComplete(STEP, 's11-c', ['q11-c-observe']);
  const rec = useSession((s) => s.getResponse('q11-c-observe'));
  useEffect(() => {
    if (rec) saveAttempt({ id: 's11-c-snapshot', stepId: STEP, sceneId: 's11-c', mode: 'tilt', targetSource: 'app:tilt-node', target: { inclination: PHYS.realInclinationDeg }, state, submitted: true, result: { scan: scanMonthForEclipses({ inclination: PHYS.realInclinationDeg, nodeLongitude: state.nodeLongitude }, 2), renderer }, hintsUsed: 0, isSandbox: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(rec)]);
  return (
    <div className="stack">
      <p className="lead">기울어진 훌라후프는 큰 판을 두 군데에서 뚫고 지나가요.</p>
      <p>
        이 두 곳을 잇는 선을 <strong>주황색 선</strong>으로 그렸어요. 달이 이 선 위에 있을 때만 달이 판과 같은 높이에 있어요. 주황색 선을 돌려서 태양 쪽을 향하게도 해 보고, 태양과 엇갈리게도 해 보세요. 언제 일식과 월식이 일어나나요?
      </p>
      <ModelLab mode="tilt" modeLabel="기울어진 방향 바꾸기" state={{ ...state, inclination: PHYS.realInclinationDeg }} onChange={(s) => setState({ ...s, inclination: PHYS.realInclinationDeg })} controls={{ theta: true, node: true, play: true }} marks onRendererChange={setRenderer}>
        <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={state.nodeLongitude} label="지금 방향" />
        <div className="grid-2" style={{ gap: 8 }}>
          <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={0} label="주황색 선이 태양 쪽을 향할 때" />
          <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={90} label="주황색 선이 태양과 엇갈릴 때" />
        </div>
      </ModelLab>
      <ChoiceQuestion
        qid="q11-c-observe"
        stepId={STEP}
        sceneId="s11-c"
        prompt="주황색 선이 어떤 방향일 때 삭과 보름달에 일식과 월식이 일어났나요?"
        options={[
          { id: 'parallel', label: '주황색 선이 태양 쪽을 향할 때', correct: true, feedback: '맞아요. 실제로는 지구가 1년 동안 태양 둘레를 돌면서 태양이 있는 방향이 바뀌어요. 그래서 주황색 선이 태양 쪽을 향하는 때가 1년에 두 번쯤 찾아오고, 그 무렵에만 일식과 월식이 일어나요.' },
          { id: 'perpendicular', label: '주황색 선이 태양과 엇갈릴 때', correct: false, feedback: '엇갈릴 때는 보름달 자리의 달이 그림자보다 위나 아래에 있어요. 두 결과 카드를 비교해 보세요.' },
          { id: 'always', label: '방향과 상관없이 매달', correct: false, feedback: '길이 기울어 있으면 방향에 따라 달라져요. 두 결과 카드를 비교해 보세요.' },
        ]}
      />
      <details className="more">
        <summary>더 알아보기: 과학책에서 쓰는 이름</summary>
        <div>{TEXTBOOK_NAMES_ORBIT}</div>
      </details>
    </div>
  );
}

function Explain() {
  useScene(STEP, 's11-explain');
  const bundle = useSession((s) => s.bundle)!;
  const awardBadge = useSession((s) => s.awardBadge);
  const mode = bundle.classSession.mode;
  const rec = useSession((s) => s.getResponse('q11-pair'));
  const pairDone = mode === '2' || Boolean((rec?.latest as { changed?: string } | undefined)?.changed);
  const explained = Boolean((useSession((s) => s.getResponse('q11-explain'))?.latest as { text?: string } | undefined)?.text?.trim());
  useAutoComplete(STEP, 's11-explain', ['q11-explain'], pairDone);
  const solarDone = bundle.attempts.some((a) => a.stepId === 's10' && a.sceneId === 's10-solar' && a.submitted);
  const lunarDone = bundle.attempts.some((a) => a.stepId === 's10' && a.sceneId === 's10-lunar' && a.submitted);
  useEffect(() => {
    if (explained && solarDone && lunarDone) void awardBadge('shadow-tracker');
  }, [explained, solarDone, lunarDone, awardBadge]);
  return (
    <div className="stack">
      <p className="lead">앞의 실험을 떠올리며 설명해요. 계산은 필요 없어요.</p>
      <TextQuestion
        qid="q11-explain"
        stepId={STEP}
        sceneId="s11-explain"
        prompt="삭과 보름달은 매달 오는데, 일식과 월식은 왜 매달 일어나지 않을까요?"
        rows={4}
        placeholder="예: 달이 도는 길이 약 5도 기울어 있어서, 보름달일 때도 달이 지구 그림자보다 위나 아래로 지나갈 때가 많기 때문이다. …"
      />
      {mode === '3' ? <PairCompare qid="q11-pair" stepId={STEP} sceneId="s11-explain" topic="매달 일어나지 않는 까닭" ask="너는 ‘길이 기울어 있다’와 ‘기울어진 방향’ 중 무엇이 더 중요하다고 생각해?" /> : null}
    </div>
  );
}

export default function Step11({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's11-a':
      return <SceneA />;
    case 's11-b':
      return <SceneB />;
    case 's11-c':
      return <SceneC />;
    case 's11-explain':
      return <Explain />;
    default:
      return null;
  }
}
