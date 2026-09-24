import { useState } from 'react';
import { QID } from '@shared/questionIds';
import { normalizeDeg, PHASE_LABEL_KO, PHASE_ORDER, REPRESENTATIVE_THETA } from '@shared/phaseMath';
import { useSession } from '@/store/session';
import { usePrefs } from '@/store/prefs';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { PhaseDisk } from '@/components/PhaseDisk';
import { OrbitSchematic } from '@/components/OrbitSchematic';
import { Term } from '@/components/Term';
import { VideoSlot } from '@/components/VideoSlot';
import { MiniMoon, MiniMoonFlat } from '@/three/MiniMoon';
import { webglAvailable } from '@/three/webgl';
import { brightSideWords, litWordsAt, positionNo } from '@/lib/words';

const STEP = 's02';

/** 전등이 있는 쪽(화면 기준 4방향) */
function quadrant(angle: number) {
  return Math.round(normalizeDeg(angle) / 90) % 4;
}
const LAMP_BUTTONS: { label: string; angle: number }[] = [
  { label: '오른쪽', angle: 0 },
  { label: '위쪽', angle: 90 },
  { label: '왼쪽', angle: 180 },
  { label: '아래쪽', angle: 270 },
];

function Light() {
  useScene(STEP, 's02-light');
  const lowGraphics = usePrefs((s) => s.lowGraphics);
  const [lightOn, setLightOn] = useState(false);
  const [lampAngle, setLampAngle] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const predicted = Boolean(useSession((s) => s.getResponse('q02-predict-light')));
  const moved = visited.size >= 3;
  useAutoComplete(STEP, 's02-light', ['q02-predict-light', 'q02-lamp-check']);

  function moveLamp(a: number) {
    setLampAngle(a);
    if (lightOn) setVisited((v) => new Set(v).add(quadrant(a)));
  }
  function toggle() {
    const on = !lightOn;
    setLightOn(on);
    if (on) setVisited((v) => new Set(v).add(quadrant(lampAngle)));
  }

  return (
    <div className="stack">
      <p className="lead">
        달은 스스로 빛을 내지 못해요. 햇빛을 받아서 되비추기 때문에 밝게 보여요. 이 장면에서는 <strong>전등</strong>이 태양 역할을 해요.
      </p>
      <p>
        우리는 지금 달을 <strong>바로 위에서 내려다보고</strong> 있어요. 전등을 켜면 달의 어느 쪽이 밝아질까요? 먼저 예측해 보고, 그다음 전등을 켜 보세요.
      </p>
      <ChoiceQuestion
        qid="q02-predict-light"
        stepId={STEP}
        sceneId="s02-light"
        prompt="예측: 전등을 켜면 달의 어느 쪽이 밝아질까요?"
        reveal={lightOn}
        options={[
          { id: 'lamp-half', label: '전등을 향한 쪽 절반', correct: true, feedback: '맞아요. 이제 전등을 여러 곳으로 옮겨 보면서 늘 그런지 확인해 보세요.' },
          { id: 'all', label: '달 전체', correct: false, feedback: '달에서 전등 반대쪽을 보세요. 빛이 닿지 않는 쪽은 어둡게 남아 있어요. 전등을 옮겨 가며 다시 확인해 보세요.' },
          { id: 'far-half', label: '전등 반대쪽 절반', correct: false, feedback: '밝아진 쪽이 전등 쪽인지 반대쪽인지 다시 보세요. 전등을 다른 곳으로 옮겨도 확인해 보세요.' },
          { id: 'unknown', label: '잘 모르겠다', correct: false, feedback: '괜찮아요. 전등을 여러 곳으로 옮겨 보면서 어느 쪽이 밝아지는지 직접 보세요.' },
        ]}
      />
      <div className="row">
        <button type="button" className="btn" disabled={!predicted} onClick={toggle}>
          {lightOn ? '전등 끄기' : '전등 켜기'}
        </button>
        {!predicted ? <span className="caption">먼저 예측을 골라야 전등을 켤 수 있어요.</span> : null}
      </div>
      {webglAvailable() ? (
        <MiniMoon lightOn={lightOn} lampAngle={lampAngle} onLampAngle={moveLamp} lowGraphics={lowGraphics} />
      ) : (
        <div className="lab__view" style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
          <MiniMoonFlat lightOn={lightOn} lampAngle={lampAngle} />
        </div>
      )}
      <div className="row" role="group" aria-label="전등 옮기기">
        <span className="caption">전등 옮기기:</span>
        {LAMP_BUTTONS.map((b) => (
          <button key={b.label} type="button" className="btn btn--secondary btn--sm" aria-pressed={quadrant(lampAngle) === quadrant(b.angle)} onClick={() => moveLamp(b.angle)}>
            {b.label}
          </button>
        ))}
        <span className="caption">전등(노란 공)을 직접 끌어서 옮겨도 돼요.</span>
      </div>
      {lightOn && !moved ? <p className="caption">전등을 켠 채로 서로 다른 세 곳 이상에 옮겨 보세요. ({visited.size}/3)</p> : null}
      {!lightOn && predicted ? <p className="caption">전등이 꺼져 있으면 달이 거의 보이지 않아요. 달이 스스로 빛을 내지 않기 때문이에요.</p> : null}
      {moved ? (
        <ChoiceQuestion
          qid="q02-lamp-check"
          stepId={STEP}
          sceneId="s02-light"
          prompt="전등을 여러 곳으로 옮겨 보았어요. 밝아진 곳은 늘 어디였나요?"
          options={[
            { id: 'lamp-half', label: '늘 전등을 향한 쪽 절반', correct: true, feedback: '맞아요. 달은 언제나 태양을 향한 쪽 절반이 밝아요. 지금은 위에서 내려다봐서 그 밝은 절반이 다 보였어요. 다음 장면에서는 지구에 있는 내가 보면 어떻게 보이는지 알아봐요.' },
            { id: 'right', label: '늘 오른쪽 절반', correct: false, feedback: '전등을 왼쪽으로 옮겨 보세요. 밝은 쪽도 따라서 왼쪽으로 옮겨 가요.' },
            { id: 'random', label: '옮길 때마다 제멋대로 달랐다', correct: false, feedback: '전등의 자리와 밝은 쪽을 함께 보세요. 전등을 어디에 두든 밝은 쪽이 전등을 향하고 있어요.' },
          ]}
        />
      ) : null}
    </div>
  );
}

function Halves() {
  useScene(STEP, 's02-halves');
  useAutoComplete(STEP, 's02-halves', ['q02-halves-check']);
  const [theta, setTheta] = useState(90);
  return (
    <div className="stack">
      <p className="lead">이번에는 지구와, 지구에 서 있는 ‘나’도 함께 놓아요.</p>
      <p>
        달은 언제나 태양을 향한 쪽 절반이 밝아요. 앞 장면에서는 위에서 내려다봐서 그 절반이 다 보였어요. 하지만 지구에 있는 나는 달을 옆에서 바라봐요. 그래서 밝은 절반 중에서 <strong>나를 향한 부분만</strong> 보여요.
      </p>
      <div className="lab" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <div className="stack-sm" style={{ textAlign: 'center' }}>
          <span className="mono mono--dark">우주 위에서 내려다본 모습</span>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <OrbitSchematic theta={theta} size={260} showSightline interactive={{ onTheta: setTheta }} />
          </div>
          <p style={{ margin: 0 }}>달 전체에서 햇빛 받는 곳: 언제나 절반</p>
        </div>
        <div className="stack-sm" style={{ textAlign: 'center' }}>
          <span className="mono mono--dark">지구에 있는 내가 본 달</span>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <PhaseDisk theta={theta} size={200} hideName />
          </div>
          <p style={{ margin: 0 }}>
            나에게는 <strong>{litWordsAt(theta)}</strong> {brightSideWords(theta) !== '전체가 밝아요' && brightSideWords(theta) !== '밝은 쪽이 거의 안 보여요' ? `(${brightSideWords(theta)})` : ''}
          </p>
        </div>
        <label style={{ gridColumn: '1 / -1' }}>
          달 옮기기 <span className="mono mono--dark">지금 {positionNo(theta)}번 자리</span>
          <input type="range" min={0} max={359} value={theta} onChange={(e) => setTheta(Number(e.target.value))} aria-valuetext={`${positionNo(theta)}번 자리`} />
        </label>
      </div>
      <p className="caption">왼쪽 그림의 달을 끌거나 막대를 밀어서 1번부터 8번 자리까지 옮겨 보세요. 초록 점선은 나와 달을 잇는 눈길이에요.</p>
      <ChoiceQuestion
        qid="q02-halves-check"
        stepId={STEP}
        sceneId="s02-halves"
        prompt="달을 여러 자리로 옮겨 보았나요? 달 전체에서 햇빛을 받는 곳은 어떻게 되었나요?"
        options={[
          { id: 'changes', label: '자리에 따라 늘었다 줄었다 했다', correct: false, feedback: '왼쪽 아래 문장을 다시 보세요. 바뀐 것은 오른쪽, ‘나에게 보이는 밝은 부분’이에요.' },
          { id: 'same', label: '언제나 절반이었다', correct: true, feedback: '맞아요. 햇빛은 언제나 달의 절반을 비춰요. 바뀌는 것은 그 밝은 절반 중 나를 향한 부분이 얼마나 되느냐예요.' },
          { id: 'unknown', label: '잘 모르겠다', correct: false, feedback: '막대를 끝까지 밀면서 왼쪽 아래 문장과 오른쪽 달 모양 중 어느 것이 바뀌는지 보세요.' },
        ]}
      />
    </div>
  );
}

const ORDER_NOTE: Record<string, string> = {
  new: '거의 안 보여요',
  'waxing-crescent': '오른쪽이 가늘게',
  'first-quarter': '오른쪽 반',
  'waxing-gibbous': '오른쪽이 반보다 크게',
  full: '동그랗게 다',
  'waning-gibbous': '왼쪽이 반보다 크게',
  'last-quarter': '왼쪽 반',
  'waning-crescent': '왼쪽이 가늘게',
};

function Positions() {
  useScene(STEP, 's02-positions');
  useAutoComplete(STEP, 's02-positions', ['q02-order']);
  return (
    <div className="stack">
      <p className="lead">
        지구에서 본 달의 모양을 <Term id="phase" />이라고 해요. 초승달, 반달, 보름달이 모두 달의 위상이에요.
      </p>
      <p>
        달은 약 한 달에 한 번 지구 둘레를 돌아요. 이렇게 도는 것을 <Term id="revolution" />이라고 해요. 달이 1번 자리부터 8번 자리까지 차례로 옮겨 가면, 지구에서 보이는 모양도 아래 순서로 바뀌어요.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
        {PHASE_ORDER.map((p, i) => (
          <div key={p} className="card" style={{ padding: 10, textAlign: 'center' }}>
            <div className="mono">{i + 1}번 자리</div>
            <PhaseDisk theta={REPRESENTATIVE_THETA[p]} size={80} style={{ margin: '6px auto' }} />
            <div style={{ fontSize: 'var(--fs-caption)' }}>{PHASE_LABEL_KO[p]}</div>
            <div className="micro">{ORDER_NOTE[p]}</div>
          </div>
        ))}
      </div>
      <p className="caption">
        1번 자리의 달은 <Term id="newMoon" />이라고 불러요. 달이 태양과 같은 쪽에 있어서 거의 보이지 않아요. 5번 자리의 달이 <Term id="fullMoon" />이에요. 같은 모양으로 다시 돌아오기까지 약 29.5일, 거의 한 달이 걸려요.
      </p>
      <ChoiceQuestion
        qid="q02-order"
        stepId={STEP}
        sceneId="s02-positions"
        prompt="보름달이 되기 며칠 전에는 달이 어떤 모양일까요?"
        options={[
          { id: 'waxing-gibbous', label: '반보다 크고, 점점 커지는 중인 달', correct: true, feedback: '맞아요. 보름달 전에는 밝은 부분이 점점 커져요. 보름달 뒤에는 어떻게 될지도 위 그림에서 찾아보세요.' },
          { id: 'waning-gibbous', label: '반보다 크고, 점점 작아지는 중인 달', correct: false, feedback: '점점 작아지는 달은 보름달 뒤에 와요. 위 그림에서 5번 자리 앞(4번)과 뒤(6번)를 비교해 보세요.' },
          { id: 'last-quarter', label: '하현달 (왼쪽 반달)', correct: false, feedback: '하현달은 7번 자리, 보름달에서 일주일쯤 뒤예요. 보름달 바로 앞은 4번 자리예요.' },
          { id: 'new', label: '삭 (거의 안 보이는 달)', correct: false, feedback: '삭은 1번 자리, 보름달의 반대편이에요. 보름달 바로 앞은 4번 자리예요.' },
        ]}
      />
      <details className="more">
        <summary>더 알아보기: 한 바퀴 도는 시간과 같은 모양으로 돌아오는 시간이 왜 다를까?</summary>
        <div>
          달이 지구 둘레를 한 바퀴 도는 데는 약 27일이 걸려요. 그런데 그동안 지구도 태양 둘레를 조금 움직여요. 그래서 달이 다시 태양과 같은 쪽으로 오려면 조금 더 돌아야 해요. 그래서 같은 모양의 달이 다시 보일 때까지는 약 29.5일이 걸려요.
        </div>
      </details>
    </div>
  );
}

function Check() {
  useScene(STEP, 's02-check');
  useAutoComplete(STEP, 's02-check', [...QID.q02Required]);
  return (
    <div className="stack">
      <p className="lead">확인 문제 세 개예요. 틀려도 설명을 읽고 다시 고를 수 있어요.</p>
      <ChoiceQuestion
        qid={QID.q02Required[0]}
        stepId={STEP}
        sceneId="s02-check"
        prompt="상현달일 때, 달 전체에서 햇빛을 받고 있는 부분은 얼마쯤일까요?"
        options={[
          { id: 'half', label: '절반', correct: true, feedback: '맞아요. 햇빛은 언제나 달의 절반을 비춰요. 상현달일 때는 그 밝은 절반 중 반만 지구 쪽을 향해서 반달로 보여요.' },
          { id: 'quarter', label: '4분의 1', correct: false, feedback: '지구에서 반달로 보이니까 4분의 1이라고 생각하기 쉬워요. 하지만 앞 장면에서 달을 어디로 옮겨도 ‘달 전체에서 햇빛 받는 곳’은 언제나 절반이었어요.' },
          { id: 'all', label: '전부', correct: false, feedback: '달에서 태양 반대쪽은 햇빛을 받지 못해요. 전등 장면에서 전등 반대쪽이 어두웠던 것을 떠올려 보세요.' },
          { id: 'none', label: '거의 없다', correct: false, feedback: '상현달은 반달로 보일 만큼 밝아요. 달 전체로 보면 햇빛을 받는 부분이 얼마나 될지 다시 생각해 보세요.' },
        ]}
      />
      <ChoiceQuestion
        qid={QID.q02Required[1]}
        stepId={STEP}
        sceneId="s02-check"
        prompt="낮에는 달을 볼 수 없을까요?"
        options={[
          { id: 'no', label: '볼 수 없다', correct: false, feedback: '달이 하늘에 떠 있고 너무 밝은 태양 가까이만 아니라면 낮에도 보여요. 4단계 자료에서 낮에 뜨는 날을 찾아보세요.' },
          { id: 'yes', label: '달이 하늘에 떠 있으면 낮에도 보일 수 있다', correct: true, feedback: '맞아요. 예를 들어 상현달은 낮에 떠서 저녁 하늘에 높이 있어요. 4단계 자료에서 낮에 뜨는 날을 찾아보세요.' },
          { id: 'full-only', label: '보름달만 볼 수 있다', correct: false, feedback: '보름달은 해가 질 무렵 떠서 밤새 보이고, 낮에는 오히려 져 있어요. 다른 모양의 달은 낮 하늘에 떠 있기도 해요.' },
        ]}
      />
      <ChoiceQuestion
        qid={QID.q02Required[2]}
        stepId={STEP}
        sceneId="s02-check"
        prompt="달이 지구 둘레를 한 바퀴 도는 데 걸리는 시간과, 같은 모양의 달이 다시 보일 때까지 걸리는 시간은 같을까요?"
        options={[
          { id: 'same', label: '같다', correct: false, feedback: '같은 모양의 달이 다시 보일 때까지는 약 29.5일이 걸려요. 앞 장면의 ‘더 알아보기’를 읽으면 왜 조금 더 걸리는지 알 수 있어요.' },
          { id: 'different', label: '같지 않다', correct: true, feedback: '맞아요. 같은 모양으로 돌아오는 데는 약 29.5일이 걸려요. 지구도 그동안 태양 둘레를 움직이기 때문이에요.' },
          { id: 'unknown', label: '모르겠다', correct: false, feedback: '앞 장면의 ‘더 알아보기’를 읽고 다시 골라 보세요. 꼭 기억할 것은 약 29.5일이에요.' },
        ]}
      />
    </div>
  );
}

function Pair() {
  useScene(STEP, 's02-pair');
  const rec = useSession((s) => s.getResponse('q02-pair'));
  useAutoComplete(STEP, 's02-pair', ['q02-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q02-pair" stepId={STEP} sceneId="s02-pair" topic="확인 문제" ask="상현달일 때 달 전체에서 햇빛 받는 부분을 너는 얼마라고 했어? 왜?" />;
}

function Video() {
  useScene(STEP, 's02-video');
  return (
    <div className="stack">
      <VideoSlot id="video-phases-shadows" stepId={STEP} sceneId="s02-video" />
      <TextQuestion qid="q02-video-note" stepId={STEP} sceneId="s02-video" prompt="(골라서 하기) 영상과 내가 해 본 모형에서 똑같이 확인한 것 한 가지" rows={2} />
    </div>
  );
}

export default function Step02({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's02-light':
      return <Light />;
    case 's02-halves':
      return <Halves />;
    case 's02-positions':
      return <Positions />;
    case 's02-check':
      return <Check />;
    case 's02-pair':
      return <Pair />;
    case 's02-video':
      return <Video />;
    default:
      return null;
  }
}
