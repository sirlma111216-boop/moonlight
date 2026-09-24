import { ASSET_SLOTS } from '@/content/assets';

/**
 * 장식 삽화 자리. 파일이 있으면 그림을, 없으면 '어떤 이미지가 들어갈 자리인지'만 표시한다.
 * 순수 장식이므로 alt 는 비우고(aria-hidden), 학습 판단 근거처럼 배치하지 않는다.
 */
export function AssetSlot({ id, dark = false, height = 200 }: { id: keyof typeof ASSET_SLOTS; dark?: boolean; height?: number }) {
  const slot = ASSET_SLOTS[id];
  if (slot.src) {
    return (
      <div className="card card--media" style={{ aspectRatio: slot.aspect, maxHeight: 420 }}>
        <img src={slot.src} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`slot ${dark ? 'slot--dark' : ''}`} style={{ minHeight: height }} aria-hidden="true">
      <span className="mono" style={{ color: 'inherit' }}>
        그림 자리 (꾸밈용 · 교사용 안내)
      </span>
      <span>
        파일: <code>public/illustrations/{slot.fileName}</code>
      </span>
      <span>용도: {slot.usage}</span>
      <span>프롬프트: {slot.promptRef} · 비율 {slot.aspect}</span>
      <span className="micro" style={{ color: 'inherit', opacity: 0.8 }}>
        src/content/assets.ts 의 <code>{slot.id}</code> 항목에 경로를 채우면 표시됩니다. 없어도 학습은 진행됩니다.
      </span>
    </div>
  );
}
