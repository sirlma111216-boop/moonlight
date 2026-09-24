import { useState } from 'react';
import { videoSlot } from '@/content/videos';
import { useSession } from '@/store/session';
import { TextQuestion } from '@/components/questions';

/**
 * 영상 자리 — 자동 재생 없음. 제목·기관·목적을 먼저 보여주고, 시청 전 예측 1문항·시청 후 비교 1문항을 붙인다.
 * youtubeId 가 없으면 어떤 영상이 들어갈 자리인지 표시한다. 영상 시청 여부는 학습 완료 판정에 쓰지 않는다.
 */
export function VideoSlot({ id, stepId, sceneId }: { id: string; stepId: string; sceneId: string }) {
  const v = videoSlot(id);
  const enabled = useSession((s) => s.bundle?.classSession.settings.videos[id] ?? false);
  const [play, setPlay] = useState(false);
  if (!v) return null;
  return (
    <section className="card stack" aria-labelledby={`${id}-title`}>
      <div>
        <span className="mono">Video · {v.provider}</span>
        <h3 id={`${id}-title`}>{v.title}</h3>
        <p className="caption">학습 목적: {v.purpose}</p>
      </div>
      <TextQuestion qid={`${id}-before`} stepId={stepId} sceneId={sceneId} prompt={`시청 전 예측: ${v.beforeQuestion}`} rows={2} />
      {v.youtubeId ? (
        enabled ? (
          play ? (
            <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <iframe
                title={v.title}
                src={`https://www.youtube-nocookie.com/embed/${v.youtubeId}?rel=0`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setPlay(true)}>
              영상 불러오기 (자동 재생 안 함)
            </button>
          )
        ) : (
          <p className="note">교사가 이 수업에서는 이 영상을 사용하지 않기로 설정했어요. 아래 요약과 공식 출처를 참고하세요.</p>
        )
      ) : (
        <div className="slot">
          <span className="mono" style={{ color: 'inherit' }}>
            영상 자리
          </span>
          <span>
            들어갈 영상: <strong>{v.title}</strong> ({v.provider})
          </span>
          <span>
            공식 소개:{' '}
            <a href={v.officialUrl} target="_blank" rel="noreferrer noopener">
              {v.officialUrl}
            </a>
          </span>
          <span>
            YouTube 후보: <code>{v.candidateUrl}</code> — 교사가 재생·학교망·임베드·자막을 확인한 뒤 <code>src/content/videos.ts</code> 의 <code>youtubeId</code> 를 채웁니다.
          </span>
        </div>
      )}
      <details className="more">
        <summary>앱이 쓴 짧은 요약과 주의</summary>
        <div>
          <p>{v.summaryKo}</p>
          <p>{v.caution}</p>
          <p>
            외부 영상이 차단되어도 이 앱의 모형 활동으로 개념을 확인할 수 있어요. 공식 출처:{' '}
            <a href={v.officialUrl} target="_blank" rel="noreferrer noopener">
              {v.provider}
            </a>
          </p>
        </div>
      </details>
      <TextQuestion qid={`${id}-after`} stepId={stepId} sceneId={sceneId} prompt={`시청(또는 요약을 읽은) 후 비교: ${v.afterQuestion}`} rows={2} />
    </section>
  );
}
