import { useEffect, useState } from 'react';
import { PHYS, scanMonthForEclipses } from '@shared/eclipseMath';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { Term } from '@/components/Term';
import { ModelLab, LUNAR_KIND_KO, SOLAR_KIND_KO } from '@/three/ModelLab';
import { useLabState } from '@/lib/labState';

const STEP = 's11';

function ScanCard({ inclination, nodeLongitude, label }: { inclination: number; nodeLongitude: number; label: string }) {
  const scan = scanMonthForEclipses({ inclination, nodeLongitude }, 2);
  return (
    <div className="card" style={{ padding: 12 }}>
      <span className="mono">{label}</span>
      <p style={{ margin: 0, fontSize: 'var(--fs-caption)' }}>
        한 달 동안 궤도를 훑은 판정 — 월식: <strong>{LUNAR_KIND_KO[scan.lunar]}</strong> · 일식: <strong>{SOLAR_KIND_KO[scan.solar]}</strong>
      </p>
      <span className="micro">기울기 {inclination.toFixed(1)}° · 교선 방향 {Math.round(nodeLongitude)}°</span>
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
      <p className="lead">
        <strong>장면 A — 가상 실험:</strong> 만약 달의 <Term id="orbitPlane" />과 지구 공전 궤도면이 같다면(기울기 0°)? ‘한 달 돌려보기’를 눌러 삭과 보름에서 무슨 일이 생기는지 보세요.
      </p>
      <ModelLab mode="tilt" state={{ ...state, inclination: 0 }} onChange={(s) => setState({ ...s, inclination: 0 })} controls={{ theta: true, play: true }} badges={['기울기 0° · 가상 실험 조건']} onRendererChange={setRenderer}>
        <ScanCard inclination={0} nodeLongitude={state.nodeLongitude} label="장면 A 결과" />
      </ModelLab>
      <ChoiceQuestion
        qid="q11-a-observe"
        stepId={STEP}
        sceneId="s11-a"
        prompt="기울기가 0°일 때 한 달 동안 어떤 일이 생겼나요?"
        options={[
          { id: 'both', label: '삭에서 일식, 보름에서 월식이 매달 생긴다', correct: true, feedback: '두 궤도면이 같으면 달은 늘 태양·지구와 같은 평면에 있어서 삭·보름마다 정렬돼요. 실제 하늘에서는 그렇지 않죠. 다음 장면에서 이유를 찾아요.' },
          { id: 'none', label: '아무 식도 생기지 않는다', correct: false, feedback: '‘그림자’를 켜고 달을 0°와 180°에 놓아 보세요. 같은 평면에서는 그림자와 달이 겹쳐요.' },
          { id: 'sometimes', label: '어떤 달에는 생기고 어떤 달에는 안 생긴다', correct: false, feedback: '기울기가 0°인 이 가상 조건에서는 교선 방향과 관계없이 매달 겹쳐요. 판정 카드를 다시 보세요.' },
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
      <p className="lead">
        <strong>장면 B — 실제에 가까운 기울기(약 5.1°):</strong> 삭과 보름의 배치를 보세요. <em>위에서 보면</em> 일렬 같아도 <em>옆에서 보면</em> 달이 그림자 위나 아래를 지날 수 있어요.
      </p>
      <ModelLab mode="tilt" state={{ ...state, inclination: PHYS.realInclinationDeg }} onChange={(s) => setState({ ...s, inclination: PHYS.realInclinationDeg })} controls={{ theta: true, play: true }} badges={['기울기 5.1°', '교선 방향 고정']} onRendererChange={setRenderer}>
        <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={state.nodeLongitude} label="장면 B 결과" />
        <p className="lab__hint">‘위에서 보기’와 ‘옆에서 보기’를 번갈아 눌러 같은 보름 위치를 비교하세요.</p>
      </ModelLab>
      <ChoiceQuestion
        qid="q11-b-observe"
        stepId={STEP}
        sceneId="s11-b"
        prompt="이 조건에서 보름 위치의 달은 지구 그림자에 들어갔나요?"
        options={[
          { id: 'yes', label: '들어갔다 (월식)', correct: eclipseThisMonth, feedback: eclipseThisMonth ? '이 교선 방향에서는 정렬이 돼요. 다음 장면에서 방향을 바꾸면 어떻게 될지 보세요.' : '옆에서 보기로 확인하면 달이 그림자 위/아래를 지나요. 위에서만 보면 겹쳐 보일 수 있어요.' },
          { id: 'no', label: '지나쳤다 — 그림자 위나 아래로', correct: !eclipseThisMonth, feedback: !eclipseThisMonth ? '기울기 때문에 보름이어도 그림자를 빗나갈 수 있어요. 그렇다면 언제 정렬될까요? 다음 장면에서 두 궤도면이 만나는 방향을 바꿔 봐요.' : '이 교선 방향에서는 정렬이 돼요. 옆에서 보기로 달의 높이를 다시 확인해 보세요.' },
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
      <p className="lead">
        <strong>장면 C — 만나는 방향:</strong> 기울기는 그대로 두고, 두 궤도면이 만나는 방향(<Term id="nodeLine" />)과 태양 방향의 관계를 바꿔요. 어떤 때는 삭·보름 부근에서 정렬되고 다른 때는 빗나가요.
      </p>
      <ModelLab mode="tilt" state={{ ...state, inclination: PHYS.realInclinationDeg }} onChange={(s) => setState({ ...s, inclination: PHYS.realInclinationDeg })} controls={{ theta: true, node: true, play: true }} badges={['기울기 5.1°', '교선 방향 조절']} onRendererChange={setRenderer}>
        <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={state.nodeLongitude} label="지금 방향의 결과" />
        <div className="grid-2" style={{ gap: 8 }}>
          <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={0} label="나란할 때(0°)" />
          <ScanCard inclination={PHYS.realInclinationDeg} nodeLongitude={90} label="직각일 때(90°)" />
        </div>
      </ModelLab>
      <ChoiceQuestion
        qid="q11-c-observe"
        stepId={STEP}
        sceneId="s11-c"
        prompt="교선 방향이 태양 방향과 어떤 관계일 때 삭·보름에서 식이 생겼나요?"
        options={[
          { id: 'parallel', label: '나란할 때 (달이 교선 근처에서 삭·보름이 됨)', correct: true, feedback: '실제로는 지구가 태양을 도는 동안 태양 방향이 바뀌어서, 이런 정렬이 1년에 두 번쯤(식 계절) 찾아와요. 달의 위치만 바꿔서는 매달 같은 지점에서 식이 생기지 않아요.' },
          { id: 'perpendicular', label: '직각일 때', correct: false, feedback: '직각일 때 보름 위치의 달은 그림자보다 위나 아래에 있어요. 두 결과 카드를 비교해 보세요.' },
          { id: 'always', label: '방향과 상관없이 매달', correct: false, feedback: '기울기가 있으면 방향에 따라 달라져요. 0°와 90° 카드의 판정을 비교하세요.' },
        ]}
      />
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
      <p className="lead">두 조건의 스냅샷(장면 A와 B, 그리고 C의 두 방향)을 떠올리며 설명해요. 계산식이나 식 날짜 예측은 필요 없어요.</p>
      <TextQuestion qid="q11-explain" stepId={STEP} sceneId="s11-explain" prompt="삭과 보름은 매달 오지만 식은 매달 일어나지 않는 이유" rows={4} placeholder="예: 달의 궤도면이 약 5° 기울어 있어서 보름이어도 달이 지구 그림자 위나 아래를 지나고, 두 궤도면이 만나는 방향이 태양 쪽일 때만 …" />
      {mode === '3' ? <PairCompare qid="q11-pair" stepId={STEP} sceneId="s11-explain" topic="매달 없는 이유" ask="너는 기울기와 방향 중 어느 쪽이 더 결정적이라고 봤어?" /> : null}
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
