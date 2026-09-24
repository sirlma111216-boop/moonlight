import { useState } from 'react';
import { QID } from '@shared/questionIds';
import type { ModelState } from '@shared/types';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { AssetSlot } from '@/components/AssetSlot';
import { MediaPhoto } from '@/components/MediaPhoto';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { PairCompare } from '@/components/PairCompare';
import { ModelLab, DEFAULT_STATE } from '@/three/ModelLab';
import { Q01_CHOICES } from '@/lib/report';

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
        같은 달을 서로 다른 날에 찍은 사진 세 장이에요. 달은 하나인데, 사진마다 밝게 보이는 부분이 달라요.
      </p>
      {ready.length < 3 ? <p className="note note--warn">선생님이 사진을 준비하고 있어요. 사진이 없어도 다음 장면으로 넘어갈 수 있어요.</p> : null}
      <div className="grid-3">
        {shown.map((a, i) => (
          <MediaPhoto key={a.id} asset={a} caption={`사진 ${i + 1}`} compact />
        ))}
      </div>
      <p className="caption">
        세 사진에서 밝은 부분의 크기가 어떻게 다른지 살펴보세요. 사진을 찍은 방향에 따라 달이 조금 돌아가 보일 수도 있어요.
      </p>
      <button type="button" className="btn btn--secondary" onClick={complete}>
        다 살펴봤어요
      </button>
    </div>
  );
}

function Question() {
  useScene(STEP, 's01-question');
  useAutoComplete(STEP, 's01-question', [QID.q01Choice, QID.q01Reason]);
  return (
    <div className="stack">
      <ChoiceQuestion
        qid={QID.q01Choice}
        stepId={STEP}
        sceneId="s01-question"
        prompt={<strong>같은 달인데 왜 밝게 보이는 부분이 날마다 다를까요?</strong>}
        options={Q01_CHOICES}
        reveal={false}
      />
      <TextQuestion qid={QID.q01Reason} stepId={STEP} sceneId="s01-question" prompt="그렇게 생각한 까닭을 한 문장으로 써 보세요." placeholder="예: 달이 지구 둘레를 돌면서 …" rows={2} />
      <div className="card card--pale-green">
        <span className="mono">앞으로 할 일</span>
        <p style={{ margin: 0 }}>천문연구원 자료로 날짜를 살펴보고, 달을 직접 움직여 보면서 내 생각이 맞는지 시험해 볼 거예요.</p>
      </div>
    </div>
  );
}

function MyQuestion() {
  useScene(STEP, 's01-my-question');
  useAutoComplete(STEP, 's01-my-question', [QID.q01MyQuestion]);
  return (
    <div className="stack">
      <p className="lead">달에 대해 정말 궁금한 것을 하나 적어 두세요. 답을 찾지 못해도 괜찮아요.</p>
      <TextQuestion qid={QID.q01MyQuestion} stepId={STEP} sceneId="s01-my-question" prompt="내가 궁금한 것" placeholder="예: 낮에 보이는 달은 왜 하얗게 보일까?" rows={2} helper="이 질문은 마지막 12단계 보고서에 다시 나와요." />
    </div>
  );
}

function Pair() {
  useScene(STEP, 's01-pair');
  const rec = useSession((s) => s.getResponse('q01-pair'));
  useAutoComplete(STEP, 's01-pair', ['q01-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q01-pair" stepId={STEP} sceneId="s01-pair" topic="내 첫 생각" ask="너는 왜 그걸 골랐어? 나랑 까닭이 같아?" />;
}

function Teaser() {
  const { complete } = useScene(STEP, 's01-teaser');
  const [state, setState] = useState<ModelState>({ ...DEFAULT_STATE, theta: 45 });
  return (
    <div className="stack">
      <p className="lead">맛보기예요. 달을 끌어서 지구 둘레로 살짝 옮겨 보세요. 오른쪽 창에서 달 모양이 어떻게 바뀌는지만 보면 돼요.</p>
      <p className="caption">여기서 한 것은 저장되지 않아요. 2차시에 자세히 해 볼 거예요.</p>
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
