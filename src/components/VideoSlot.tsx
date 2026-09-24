import { useState } from 'react';
import { videoSlot } from '@/content/videos';
import { useSession } from '@/store/session';
import { TextQuestion } from '@/components/questions';

/**
 * 영상 자리 — 자동 재생 없음. 제목·만든 곳·보는 까닭을 먼저 보여주고, 보기 전 예측 1문항·본 뒤 비교 1문항을 붙인다.
 * youtubeId 가 없으면 어떤 영상이 들어갈 자리인지 표시한다. 영상을 봤는지는 완료 조건에 쓰지 않는다.
 */
export function VideoSlot({ id, stepId, sceneId }: { id: string; stepId: string; sceneId: string }) {
  const v = videoSlot(id);
  const enabled = useSession((s) => s.bundle?.classSession.settings.videos[id] ?? false);
  const [play, setPlay] = useState(false);
  if (!v) return null;
  return (
    <section className="card stack" aria-labelledby={`${id}-title`}>
      <div>
        <span className="mono">영상 · {v.provider}</span>
        <h3 id={`${id}-title`}>{v.title}</h3>
        <p className="caption">왜 보나요? {v.purpose}</p>
        <p className="micro">영어로 된 영상이에요. 자막이 있는지는 선생님이 알려 줄 거예요.</p>
      </div>
      <TextQuestion qid={`${id}-before`} stepId={stepId} sceneId={sceneId} prompt={`보기 전에 예측하기: ${v.beforeQuestion}`} rows={2} />
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
              영상 열기 (저절로 재생되지 않아요)
            </button>
          )
        ) : (
          <p className="note">이번 수업에서는 이 영상을 보지 않아요. 아래 요약을 읽어 보세요.</p>
        )
      ) : (
        <div className="slot">
          <span className="mono" style={{ color: 'inherit' }}>
            영상 자리
          </span>
          <span>
            들어갈 영상: <strong>{v.title}</strong> ({v.provider})
          </span>
          <span className="micro" style={{ color: 'inherit', opacity: 0.85 }}>
            교사용 안내: 공식 소개 {v.officialUrl} · 후보 {v.candidateUrl} — 재생·학교망·자막을 확인한 뒤 <code>src/content/videos.ts</code>의 <code>youtubeId</code>를 채우세요.
          </span>
        </div>
      )}
      <details className="more">
        <summary>짧은 요약 읽기</summary>
        <div>
          <p>{v.summaryKo}</p>
          <p>
            영상이 열리지 않아도 괜찮아요. 모형으로 해 본 활동만으로 충분히 알 수 있어요. 영상을 만든 곳:{' '}
            <a href={v.officialUrl} target="_blank" rel="noreferrer noopener">
              {v.provider}
            </a>
          </p>
        </div>
      </details>
      <TextQuestion qid={`${id}-after`} stepId={stepId} sceneId={sceneId} prompt={`본 뒤에 비교하기 (요약만 읽었어도 돼요): ${v.afterQuestion}`} rows={2} />
    </section>
  );
}
