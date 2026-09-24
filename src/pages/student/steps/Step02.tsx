import { useState } from 'react';
import { QID } from '@shared/questionIds';
import { illuminatedFraction, PHASE_LABEL_KO, PHASE_ORDER, REPRESENTATIVE_THETA, WHOLE_SURFACE_LIT_FRACTION } from '@shared/phaseMath';
import { useSession } from '@/store/session';
import { usePrefs } from '@/store/prefs';
import { useScene, useAutoComplete } from '@/components/useScene';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { PhaseDisk } from '@/components/PhaseDisk';
import { OrbitSchematic } from '@/components/OrbitSchematic';
import { Term } from '@/components/Term';
import { VideoSlot } from '@/components/VideoSlot';
import { MiniMoon } from '@/three/MiniMoon';
import { webglAvailable } from '@/three/webgl';

const STEP = 's02';

function Light() {
  useScene(STEP, 's02-light');
  const lowGraphics = usePrefs((s) => s.lowGraphics);
  const [lightOn, setLightOn] = useState(false);
  const rec = useSession((s) => s.getResponse('q02-predict-light'));
  const answered = Boolean(rec);
  useAutoComplete(STEP, 's02-light', ['q02-predict-light'], lightOn);
  const options = [
    { id: 'sun-half', label: '광원(태양) 쪽 절반', correct: true, feedback: '광원을 향한 절반이 밝아요. 달을 돌려 보며 밝은 면이 항상 광원 쪽인지 확인해 보세요.' },
    { id: 'all', label: '달 전체', correct: false, feedback: '달은 스스로 빛을 내지 않아요. 광원 반대쪽은 어둡게 남는지 달을 돌려 확인해 보세요.' },
    { id: 'earth-half', label: '지구(관찰자) 쪽 절반', correct: false, feedback: '밝은 면은 관찰자가 아니라 광원이 정해요. 광원을 켠 채 보는 방향만 바꿔 보세요.' },
    { id: 'random', label: '무작위로 여기저기', correct: false, feedback: '광원의 방향에 따라 밝은 면이 정해져요. 달을 돌려도 광원 쪽이 밝은지 확인해 보세요.' },
  ];
  return (
    <div className="stack">
      <p className="lead">
        달은 스스로 빛을 내지 않고 태양빛을 반사해요. 광원이 켜지면 달의 <strong>어느 부분</strong>이 밝아질까요? 먼저 예측한 뒤 켜 보세요.
      </p>
      <ChoiceQuestion qid="q02-predict-light" stepId={STEP} sceneId="s02-light" prompt="예측: 광원이 켜지면 밝아지는 부분은?" options={options} reveal={lightOn} disabled={lightOn} />
      <div className="row">
        <button type="button" className="btn" disabled={!answered} onClick={() => setLightOn((v) => !v)}>
          {lightOn ? '광원 끄기' : '광원 켜기'}
        </button>
        {!answered ? <span className="caption">먼저 예측을 골라야 켤 수 있어요.</span> : null}
      </div>
      {webglAvailable() ? (
        <MiniMoon lightOn={lightOn} lowGraphics={lowGraphics} />
      ) : (
        <div className="lab__view" style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
          <PhaseDisk theta={lightOn ? 90 : 0} size={180} hideName />
          <p className="lab__hint">2D 대체 화면: 광원이 오른쪽에 있을 때 오른쪽 절반이 밝아요.</p>
        </div>
      )}
      <p className="caption">달을 끌어서 돌려 보세요. 광원은 오른쪽에 고정되어 있어요. (이 장면은 05단계의 전체 모형과 같은 조명 코드를 써요.)</p>
    </div>
  );
}

function Halves() {
  useScene(STEP, 's02-halves');
  useAutoComplete(STEP, 's02-halves', ['q02-halves-check']);
  const [theta, setTheta] = useState(90);
  const k = illuminatedFraction(theta);
  return (
    <div className="stack">
      <p className="lead">
        월식 같은 예외를 빼면 구형 달의 <strong>태양 쪽 절반</strong>이 늘 밝아요. 그런데 지구에서 보이는 원반의 밝은 부분은 달라져요. 두 가지 ‘절반’을 나란히 구분해 봐요.
      </p>
      <div className="lab" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <div className="stack-sm" style={{ textAlign: 'center' }}>
          <span className="mono mono--dark">달 전체 표면 (우주에서)</span>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <OrbitSchematic theta={theta} size={220} showSightline />
          </div>
          <p style={{ margin: 0 }}>
            햇빛을 받는 비율: <strong>{Math.round(WHOLE_SURFACE_LIT_FRACTION * 100)}%</strong> (달이 어디 있든 같아요)
          </p>
        </div>
        <div className="stack-sm" style={{ textAlign: 'center' }}>
          <span className="mono mono--dark">지구에서 보이는 원반</span>
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <PhaseDisk theta={theta} size={200} hideName />
          </div>
          <p style={{ margin: 0 }}>
            원반의 밝은 비율: <strong>{Math.round(k * 100)}%</strong>
          </p>
        </div>
        <label style={{ gridColumn: '1 / -1' }}>
          달의 위치 <span className="mono mono--dark">{theta}°</span>
          <input type="range" min={0} max={359} value={theta} onChange={(e) => setTheta(Number(e.target.value))} />
        </label>
      </div>
      <ChoiceQuestion
        qid="q02-halves-check"
        stepId={STEP}
        sceneId="s02-halves"
        prompt="달이 궤도를 따라 움직일 때, 달 전체 표면에서 햇빛을 받는 비율은 어떻게 되나요?"
        options={[
          { id: 'changes', label: '위치에 따라 늘었다 줄었다 한다', correct: false, feedback: '슬라이더를 끝까지 움직이며 왼쪽 숫자를 다시 보세요. 바뀌는 것은 오른쪽 원반의 비율이에요.' },
          { id: 'same', label: '항상 절반쯤으로 같다', correct: true, feedback: '바뀌는 것은 ‘우리 쪽을 향한 밝은 부분이 얼마나 되는가’예요. 다음 장면에서 위치와 모양을 연결해 봐요.' },
          { id: 'unknown', label: '모르겠다', correct: false, feedback: '슬라이더를 움직이면서 두 숫자 중 어느 것이 변하는지 관찰해 보세요.' },
        ]}
      />
    </div>
  );
}

function Positions() {
  useScene(STEP, 's02-positions');
  useAutoComplete(STEP, 's02-positions', ['q02-order']);
  return (
    <div className="stack">
      <p className="lead">
        태양·지구·달의 위치 관계가 바뀌면 지구에서 보이는 밝은 부분이 달라져요. 이것이 <Term id="phase" />이에요. 이름보다 <strong>순서와 이유</strong>가 중요해요.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
        {PHASE_ORDER.map((p, i) => (
          <div key={p} className="card" style={{ padding: 10, textAlign: 'center' }}>
            <PhaseDisk theta={REPRESENTATIVE_THETA[p]} size={80} style={{ margin: '0 auto' }} />
            <div className="mono" style={{ marginTop: 6 }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 'var(--fs-caption)' }}>{PHASE_LABEL_KO[p]}</div>
          </div>
        ))}
      </div>
      <p className="caption">
        <Term id="newMoon" />에서 시작해 초승 → <Term id="firstQuarter" /> → 차오르는 달 → <Term id="fullMoon" /> → 기우는 달 → <Term id="lastQuarter" /> → 그믐 순서로 돌아와요. 같은 모양으로 돌아오는 데 약 29.5일이 걸려요.
      </p>
      <ChoiceQuestion
        qid="q02-order"
        stepId={STEP}
        sceneId="s02-positions"
        prompt="보름달 바로 앞 며칠 동안 보이는 달은 어떤 모양일까요?"
        options={[
          { id: 'waxing-gibbous', label: '반보다 크고 아직 차오르는 달', correct: true, feedback: '보름 앞에서는 밝은 부분이 계속 늘어나요. 보름 뒤에는 어떻게 될지도 위 그림에서 찾아보세요.' },
          { id: 'waning-gibbous', label: '반보다 크고 기우는 달', correct: false, feedback: '기우는 달은 보름 뒤에 와요. 위 그림에서 보름 앞과 뒤의 순서를 다시 따라가 보세요.' },
          { id: 'last-quarter', label: '하현달', correct: false, feedback: '하현은 보름에서 일주일쯤 뒤예요. 보름 앞의 모양은 밝은 부분이 늘어나는 중이에요.' },
          { id: 'new', label: '삭', correct: false, feedback: '삭은 보름의 반대편 위치예요. 위 순서에서 보름 바로 앞 칸을 찾아보세요.' },
        ]}
      />
      <details className="more">
        <summary>더 알아보기: 위상 주기와 공전 주기가 다른 이유</summary>
        <div>달이 지구를 한 바퀴 도는 동안 지구도 태양 주위를 조금 움직여요. 그래서 달이 다시 태양과 같은 쪽에 오려면 조금 더 돌아야 하고, 같은 모양으로 돌아오는 주기(약 29.5일)가 한 바퀴 도는 주기보다 길어요.</div>
      </details>
    </div>
  );
}

function Check() {
  useScene(STEP, 's02-check');
  useAutoComplete(STEP, 's02-check', [...QID.q02Required]);
  return (
    <div className="stack">
      <p className="lead">세 가지 확인 문항이에요. 틀려도 설명을 읽고 다시 고를 수 있어요.</p>
      <ChoiceQuestion
        qid={QID.q02Required[0]}
        stepId={STEP}
        sceneId="s02-check"
        prompt="상현달일 때 달 전체 표면 중 태양빛을 받는 부분은 대략 얼마일까요?"
        options={[
          { id: 'half', label: '절반', correct: true, feedback: '달 전체의 밝은 절반 중 우리 쪽을 향한 부분이 원반의 절반으로 보이는 거예요.' },
          { id: 'quarter', label: '4분의 1', correct: false, feedback: '4분의 1은 ‘지구에서 보이는 원반’이 아니라 달 전체를 말할 때 혼동하기 쉬운 답이에요. 02의 ‘두 가지 절반’ 화면에서 왼쪽 숫자를 다시 보세요. 전체 표면은 늘 절반이 밝아요.' },
          { id: 'all', label: '전부', correct: false, feedback: '달의 반대쪽은 태양빛을 받지 못해요. 광원을 켰을 때 어느 쪽이 어두웠는지 떠올려 보세요.' },
          { id: 'none', label: '거의 없다', correct: false, feedback: '상현달은 원반의 절반이 밝게 보여요. 달 전체로는 어느 정도가 밝을지 다시 생각해 보세요.' },
        ]}
      />
      <ChoiceQuestion
        qid={QID.q02Required[1]}
        stepId={STEP}
        sceneId="s02-check"
        prompt="낮에는 달을 볼 수 없을까요?"
        options={[
          { id: 'no', label: '볼 수 없다', correct: false, feedback: '달의 위치와 위상, 하늘의 밝기에 따라 낮에도 보일 수 있어요. 04단계에서 월출 시각이 낮인 날을 찾아보세요.' },
          { id: 'yes', label: '위치와 위상, 하늘 밝기에 따라 낮에도 보일 수 있다', correct: true, feedback: '예를 들어 상현달은 낮에 떠서 저녁 하늘에 높이 있어요. 공공데이터에서 낮에 뜨는 날을 확인해 보세요.' },
          { id: 'full-only', label: '보름달만 볼 수 있다', correct: false, feedback: '보름달은 오히려 밤에 보이고 낮에는 지평선 아래에 있어요. 어떤 위상이 낮 하늘에 있을지 위치로 따져 보세요.' },
        ]}
      />
      <ChoiceQuestion
        qid={QID.q02Required[2]}
        stepId={STEP}
        sceneId="s02-check"
        prompt="달이 지구를 한 바퀴 공전하는 기간과, 같은 모양으로 돌아오는 기간은 같을까요?"
        options={[
          { id: 'same', label: '같다', correct: false, feedback: '같은 모양으로 돌아오는 위상 주기는 약 29.5일이에요. 한 바퀴 도는 시간과 왜 다른지는 ‘더 알아보기’에서 지구의 공전과 연결해 보세요.' },
          { id: 'different', label: '같지 않다', correct: true, feedback: '위상 주기는 약 29.5일이에요. 차이가 생기는 이유를 ‘더 알아보기’에서 확인해 보세요.' },
          { id: 'unknown', label: '모르겠다', correct: false, feedback: '앞 장면의 ‘더 알아보기’를 읽고 다시 골라 보세요. 필수로 기억할 값은 위상 주기 약 29.5일이에요.' },
        ]}
      />
    </div>
  );
}

function Pair() {
  useScene(STEP, 's02-pair');
  const rec = useSession((s) => s.getResponse('q02-pair'));
  useAutoComplete(STEP, 's02-pair', ['q02-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q02-pair" stepId={STEP} sceneId="s02-pair" topic="확인 문항" ask="상현달일 때 달 전체의 밝은 부분을 너는 얼마라고 봤어? 이유가 같은가?" />;
}

function Video() {
  useScene(STEP, 's02-video');
  return (
    <div className="stack">
      <VideoSlot id="video-phases-shadows" stepId={STEP} sceneId="s02-video" />
      <TextQuestion qid="q02-video-note" stepId={STEP} sceneId="s02-video" prompt="(선택) 영상과 내 모형에서 공통으로 확인한 것 한 가지" rows={2} />
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
