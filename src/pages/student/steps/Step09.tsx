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
  { id: 'phase', label: '보통의 위상 변화 (어두운 부분은 햇빛을 못 받는 면)' },
  { id: 'solar', label: '일식 (달이 태양을 가림)' },
  { id: 'lunar', label: '월식 (달이 지구 그림자에 들어감)' },
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
        prompt="무엇이 가렸나요?"
        reveal={false}
        options={[
          { id: 'nothing', label: '아무것도 가리지 않았다 (빛을 못 받는 면)' },
          { id: 'moon-sun', label: '달이 태양을' },
          { id: 'earth-shadow', label: '지구 그림자가 달을' },
        ]}
      />
      <ChoiceQuestion
        qid={`${qid}-where`}
        stepId={STEP}
        sceneId="s09-classify"
        prompt="관측자는 어디에 있나요?"
        reveal={false}
        options={[
          { id: 'night', label: '지구의 밤 쪽' },
          { id: 'day', label: '지구의 낮 쪽 (달 그림자 안)' },
          { id: 'any', label: '낮이든 밤이든' },
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
          { id: 'on-earth', label: '지구 위에' },
          { id: 'on-moon', label: '달 위에' },
        ]}
      />
      <ChoiceQuestion qid={qid} stepId={STEP} sceneId="s09-classify" prompt="이 장면은?" reveal={false} options={CLASSIFY_OPTIONS.map((o) => ({ ...o, correct: o.id === answerKey }))} />
    </div>
  );
}

function Classify() {
  useScene(STEP, 's09-classify');
  useAutoComplete(STEP, 's09-classify', [...QID.q09Classify, 'q09-why']);
  return (
    <div className="stack">
      <AssetSlot id="shadow-mystery" />
      <p className="lead">
        달이 어둡게 보이는 세 장면이에요. 위상 변화와 <Term id="umbra">월식</Term>은 둘 다 달이 어두워 보이지만 <strong>원인이 달라요</strong>. 먼저 예측으로 분류해 두고, 10단계에서 모형으로 확인한 뒤 고칠 수 있어요.
      </p>
      <div className="grid-3">
        <Panel title="장면 A" assetCategory="phase" qid={QID.q09Classify[0]} answerKey="phase" />
        <Panel title="장면 B" assetCategory="solar-eclipse" qid={QID.q09Classify[1]} answerKey="solar" />
        <Panel title="장면 C" assetCategory="lunar-eclipse" qid={QID.q09Classify[2]} answerKey="lunar" />
      </div>
      <TextQuestion qid="q09-why" stepId={STEP} sceneId="s09-classify" prompt="위상 변화의 어두운 부분과 월식의 어두운 부분은 무엇이 다른가요? (예측)" rows={2} placeholder="예: 위상은 햇빛을 못 받는 면이 보이는 것이고, 월식은 …" />
      <p className="caption">사진이 없으면 ‘교사가 자료를 준비 중’ 자리가 보여요. 자리 표시만으로도 분류 예측은 할 수 있어요.</p>
    </div>
  );
}

function Pair() {
  useScene(STEP, 's09-pair');
  const rec = useSession((s) => s.getResponse('q09-pair'));
  useAutoComplete(STEP, 's09-pair', ['q09-pair'], Boolean((rec?.latest as { changed?: string } | undefined)?.changed));
  return <PairCompare qid="q09-pair" stepId={STEP} sceneId="s09-pair" topic="분류" ask="장면 C를 너는 뭐라고 분류했어? 그림자가 어디 생긴다고 봤어?" />;
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
