import type { MediaAsset } from '@shared/types';
import { MediaKindBadge } from '@/components/SourceBadge';

/**
 * 실제 관측 사진 표시. 파일이 없으면 '교사가 자료를 준비 중'과 어떤 자료가 들어갈 자리인지 표시한다.
 * 가짜 관측 사진을 만들지 않는다.
 */
export function MediaPhoto({ asset, caption, compact = false }: { asset: MediaAsset | null | undefined; caption?: string; compact?: boolean }) {
  if (!asset || !asset.src) {
    return (
      <div className="slot" style={{ minHeight: compact ? 120 : 200 }}>
        <span className="mono" style={{ color: 'inherit' }}>
          관측 사진 자리
        </span>
        <span>
          <strong>교사가 자료를 준비 중입니다.</strong>
        </span>
        {asset ? (
          <>
            <span>
              자료 ID <code>{asset.id}</code> · {asset.title}
            </span>
            <span className="micro" style={{ color: 'inherit', opacity: 0.8 }}>
              출처·촬영 정보가 있는 실사진을 <code>public/media/…</code> 에 넣고 <code>shared/mediaManifest.ts</code> 또는 교사 콘솔에 등록합니다.
            </span>
          </>
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
          {asset.credit || asset.photographer || '출처 미기재'}
          {asset.takenAt ? ` · 촬영 ${asset.takenAt}${asset.takenTz ? ` (${asset.takenTz})` : ''}` : ' · 촬영 일시 미상'}
          {asset.region ? ` · ${asset.region}` : ''}
          {asset.processing ? ` · 처리: ${asset.processing}` : ''}
        </div>
        {caption ? <div>{caption}</div> : null}
      </figcaption>
    </figure>
  );
}
