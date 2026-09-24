import { QID } from '@shared/questionIds';
import { useSession } from '@/store/session';
import { useScene, useAutoComplete } from '@/components/useScene';
import { AssetSlot } from '@/components/AssetSlot';
import { ChoiceQuestion, TextQuestion } from '@/components/questions';
import { MediaPhoto } from '@/components/MediaPhoto';
import { PairCompare } from '@/components/PairCompare';
import { Term } from '@/components/Term';

const STEP = 's09';

const CLASSIFY_OPTIONS = [
  { id: 'phase', label: '보통의 달 모양 변화 (햇빛을 못 받는 쪽이 보이는 것)' },
  { id: 'solar', label: '일식 (달이 태양을 가림)' },
  { id: 'lunar', label: '월식 (달이 지구 그림자 속으로 들어감)' },
];

function Panel({ title, assetCategory, qid, answerKey }: { title: string; assetCategory: 'phase' | 'solar-eclipse' | 'lunar-eclipse'; qid: string; answerKey: 'phase' | 'solar' | 'lunar' }) {
  const assets = useSession((s) => s.bundle?.mediaAssets ?? []);
  const asset = assets.find((a) => a.kind === 'real' && a.category === assetCategory && a.src) ?? assets.find((a) => a.kind === 'real' && a.category === assetCategory) ?? null;
  return (
    <div className="card stack-sm">
      <span className="mono">{title}</span>
      <MediaPhoto asset={asset} compact />
      <ChoiceQuestion
        qid={`${qid}-what`}
        stepId={STEP}
        sceneId="s09-classify"
        prompt="무엇이 무엇을 가렸나요?"
        reveal={false}
        options={[
          { id: 'nothing', label: '아무것도 가리지 않았다 (햇빛을 못 받는 쪽이 보일 뿐)' },
          { id: 'moon-sun', label: '달이 태양을 가렸다' },
          { id: 'earth-shadow', label: '지구 그림자가 달을 가렸다' },
        ]}
      />
      <ChoiceQuestion
        qid={`${qid}-where`}
        stepId={STEP}
        sceneId="s09-classify"
        prompt="보는 사람은 지구의 어느 쪽에 있나요?"
        reveal={false}
        options={[
          { id: 'night', label: '밤인 쪽' },
          { id: 'day', label: '낮인 쪽 (달 그림자가 닿는 곳)' },
          { id: 'any', label: '낮이든 밤이든 상관없다' },
        ]}
      />
      <ChoiceQuestion
        qid={`${qid}-shadow`}
        stepId={STEP}
        sceneId="s09-classify"
        prompt="그림자는 어디에 생기나요?"
        reveal={false}
        options={[
          { id: 'none', label: '이 어두운 부분은 그림자가 아니다' },
          { id: 'on-earth', label: '지구 위에 생긴다' },
          { id: 'on-moon', label: '달 위에 생긴다' },
        ]}
      />
      <ChoiceQuestion qid={qid} stepId={STEP} sceneId="s09-classify" prompt="그래서 이 장면은?" reveal={false} options={CLASSIFY_OPTIONS.map((o) => ({ ...o, correct: o.id === answerKey }))} />
    </div>
  );
}

function Classify() {
  useScene(STEP, 's09-classify');
  useAutoComplete(STEP, 's09-classify', [...QID.q09Classify, 'q09-why']);
  return (
    <div className="stack">
      <AssetSlot id="shadow-mystery" />
      <p className="lead">여기부터는 한 걸음 더 나아가요. 달이나 태양이 어둡게 보이는 세 장면이에요.</p>
      <p>
        초승달처럼 달 모양이 바뀔 때도, <Term id="lunarEclipse" /> 때도 달의 일부가 어둡게 보여요. 하지만 어두워지는 까닭은 달라요. <Term id="solarEclipse" />은 태양이 가려지는 일이에요. 지금은 예측으로 골라 두세요. 10단계에서 모형으로 확인한 뒤 고칠 수 있어요.
      </p>
      <div className="grid-3">
        <Panel title="장면 가" assetCategory="phase" qid={QID.q09Classify[0]} answerKey="phase" />
        <Panel title="장면 나" assetCategory="solar-eclipse" qid={QID.q09Classify[1]} answerKey="solar" />
        <Panel title="장면 다" assetCategory="lunar-eclipse" qid={QID.q09Classify[2]} answerKey="lunar" />
      </div>
      <TextQuestion qid="q09-why" stepId={STEP} sceneId="s09-classify" prompt="예측: 초승달의 어두운 부분과 월식 때 어두운 부분은 무엇이 다를까요?" rows={2} placeholder="예: 초승달은 햇빛을 못 받는 쪽이 보이는 것이고, 월식은 …" />
      <p className="caption">사진이 아직 없으면 ‘선생님이 사진을 준비하고 있어요’라고 나와요. 사진이 없어도 예측은 할 수 있어요.</p>
    </div>
  );
}

function Pair() {
  useScene(STEP, 's09-pair');
  const rec = useSession((s) => s.getResponse('q09-pair'));
  useAutoComplete(STEP, 's09-pair', ['q09-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q09-pair" stepId={STEP} sceneId="s09-pair" topic="세 장면 나누기" ask="장면 다를 너는 뭐라고 골랐어? 그림자가 어디에 생긴다고 봤어?" />;
}

export default function Step09({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case 's09-classify':
      return <Classify />;
    case 's09-pair':
      return <Pair />;
    default:
      return null;
  }
}
