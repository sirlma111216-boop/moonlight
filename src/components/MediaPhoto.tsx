import type { MediaAsset } from '@shared/types';
import { MediaKindBadge } from '@/components/SourceBadge';

/**
 * 실제 관측 사진 표시. 파일이 없으면 '선생님이 준비 중'과 어떤 자료가 들어갈 자리인지(교사용 안내)를 보여준다.
 * 가짜 관측 사진을 만들지 않는다.
 */
export function MediaPhoto({ asset, caption, compact = false }: { asset: MediaAsset | null | undefined; caption?: string; compact?: boolean }) {
  if (!asset || !asset.src) {
    return (
      <div className="slot" style={{ minHeight: compact ? 120 : 200 }}>
        <span className="mono" style={{ color: 'inherit' }}>
          사진 자리
        </span>
        <span>
          <strong>선생님이 사진을 준비하고 있어요.</strong>
        </span>
        {asset ? (
          <span className="micro" style={{ color: 'inherit', opacity: 0.8 }}>
            교사용 안내: 자료 <code>{asset.id}</code>({asset.title}) 자리예요. 찍은 사람과 날짜가 알려진 실제 사진을 <code>public/media/</code>에 넣고 <code>shared/mediaManifest.ts</code> 또는 교사 화면 ‘관측 자료’에 등록하세요.
          </span>
        ) : null}
        {caption ? <span className="micro">{caption}</span> : null}
      </div>
    );
  }
  return (
    <figure className="card card--media" style={{ margin: 0 }}>
      <img src={asset.src} alt={asset.alt || asset.title} loading="lazy" style={{ width: '100%', aspectRatio: compact ? '4/3' : undefined, objectFit: 'cover' }} />
      <figcaption style={{ padding: '10px 14px', fontSize: 'var(--fs-micro)', color: 'var(--c-body-muted)' }} className="stack-sm">
        <div className="row" style={{ gap: 6 }}>
          <MediaKindBadge kind={asset.kind} />
          <span>{asset.title}</span>
        </div>
        <div>
          찍은 사람: {asset.credit || asset.photographer || '알 수 없음'}
          {asset.takenAt ? ` · 찍은 때: ${asset.takenAt}` : ' · 찍은 때: 모름'}
          {asset.region ? ` · 곳: ${asset.region}` : ''}
          {asset.processing ? ` · 손본 것: ${asset.processing}` : ''}
        </div>
        {caption ? <div>{caption}</div> : null}
      </figcaption>
    </figure>
  );
}
