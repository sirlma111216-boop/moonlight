import { useState } from 'react';
import { QID } from '@shared/questionIds';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { AssetSlot } from '@/components/AssetSlot';
import { MediaPhoto } from '@/components/MediaPhoto';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { ModelLab } from '@/three/ModelLab';
import { DEFAULT_STATE } from '@/three/ModelLab';
import type { ModelState } from '@shared/types';

const STEP = 's01';

function Photos() {
  const { complete } = useScene(STEP, 's01-photos');
  const assets = useSession((s) => s.bundle?.mediaAssets ?? []);
  const real = assets.filter((a) => a.kind === 'real' && a.category === 'phase');
  const ready = real.filter((a) => a.src);
  const shown = ready.length >= 3 ? ready.slice(0, 3) : [...ready, ...real.filter((a) => !a.src)].slice(0, 3);
  return (
    <div className="stack">
      <AssetSlot id="intro-observation" />
      <p className="lead">
        어느 저녁, 같은 달을 찍은 사진 세 장이 책상 위에 놓였어요. 다른 것은 <strong>날짜</strong>뿐이에요.
      </p>
      {ready.length < 3 ? <p className="note note--warn">교사가 자료를 준비 중입니다. 실제 관측 사진이 채워지기 전에도 다음 장면으로 진행할 수 있어요. 앱은 가짜 관측 사진을 만들지 않아요.</p> : null}
      <div className="grid-3">
        {shown.map((a, i) => (
          <MediaPhoto key={a.id} asset={a} caption={`사진 ${i + 1}`} compact />
        ))}
      </div>
      <p className="caption">사진은 출처가 있는 실제 관측 자료예요. 밝게 보이는 부분의 크기와 위치가 어떻게 다른지 살펴보세요. 사진의 회전이나 촬영 장치에 따라 좌우가 달라 보일 수 있어요.</p>
      <button type="button" className="btn btn--secondary" onClick={complete}>
        살펴봤어요
      </button>
    </div>
  );
}

const OPTIONS = [
  { id: 'a', label: '지구 그림자가 매일 달을 다르게 가려서' },
  { id: 'b', label: '달에서 빛나는 부분이 매일 바뀌어서' },
  { id: 'c', label: '태양빛을 받는 부분 중 지구에서 보이는 부분이 달라져서' },
  { id: 'd', label: '아직 모르겠다' },
];

function Question() {
  useScene(STEP, 's01-question');
  useAutoComplete(STEP, 's01-question', [QID.q01Choice, QID.q01Reason]);
  return (
    <div className="stack">
      <ChoiceQuestion qid={QID.q01Choice} stepId={STEP} sceneId="s01-question" prompt={<strong>같은 달인데 왜 밝게 보이는 부분이 달라질까?</strong>} options={OPTIONS} reveal={false} />
      <TextQuestion qid={QID.q01Reason} stepId={STEP} sceneId="s01-question" prompt="그렇게 생각한 이유를 한 문장으로" placeholder="예: 달이 지구 주위를 돌면서 …" rows={2} />
      <div className="card card--pale-green">
        <span className="mono">예고</span>
        <p style={{ margin: 0 }}>공공데이터로 날짜를 추적하고, 달을 직접 움직여 네 설명을 시험해 보자.</p>
      </div>
    </div>
  );
}

function MyQuestion() {
  useScene(STEP, 's01-my-question');
  useAutoComplete(STEP, 's01-my-question', [QID.q01MyQuestion]);
  return (
    <div className="stack">
      <p className="lead">달에 대해 내가 정말 궁금한 것 한 가지를 적어 두세요. 답을 찾지 않아도 괜찮아요.</p>
      <TextQuestion qid={QID.q01MyQuestion} stepId={STEP} sceneId="s01-my-question" prompt="내 질문" placeholder="예: 낮에 보이는 달은 왜 하얗게 보일까?" rows={2} helper="이 질문은 12단계 보고서의 ‘아직 궁금한 점’ 옆에 다시 나타나요." />
    </div>
  );
}

function Pair() {
  useScene(STEP, 's01-pair');
  const rec = useSession((s) => s.getResponse('q01-pair'));
  useAutoComplete(STEP, 's01-pair', ['q01-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q01-pair" stepId={STEP} sceneId="s01-pair" topic="첫 생각" ask="너는 왜 그렇게 골랐어? 근거가 같은가?" />;
}

function Teaser() {
  const { complete } = useScene(STEP, 's01-teaser');
  const [state, setState] = useState<ModelState>({ ...DEFAULT_STATE, theta: 45 });
  return (
    <div className="stack">
      <p className="lead">10초만 달을 살짝 움직여 보세요. 오른쪽 창에서 달의 모양이 어떻게 바뀌는지만 보면 돼요.</p>
      <p className="caption">이 조작은 저장되지 않고 학습 기록에도 들어가지 않아요. 2차시에 제대로 다뤄요.</p>
      <ModelLab mode="phase" state={state} onChange={setState} controls={{ theta: true }} sandboxLink={false} height={340} />
      <button type="button" className="btn btn--secondary" onClick={complete}>
        움직여 봤어요
      </button>
    </div>
  );
}

export default function Step01({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's01-photos':
      return <Photos />;
    case 's01-question':
      return <Question />;
    case 's01-my-question':
      return <MyQuestion />;
    case 's01-pair':
      return <Pair />;
    case 's01-teaser':
      return <Teaser />;
    default:
      return null;
  }
}
