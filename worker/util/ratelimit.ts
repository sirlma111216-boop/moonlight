import { HttpError } from './http';

/**
 * 학교에서는 한 반이 같은 인터넷 주소(IP)를 함께 쓰므로, 입장·자료 조회 한도는 한 반이 동시에 들어와도 넉넉하게 잡는다.
 * D1 기반 고정 창 속도 제한. 정밀하지 않지만 코드 추측·복구 키 추측·API 남용을 늦추기에 충분하다.
 * 읽기와 쓰기를 한 문장(UPSERT … RETURNING)으로 처리해 요청당 DB 왕복을 1회로 줄인다.
 */
export async function rateLimit(db: D1Database, bucket: string, limit: number, windowSec: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(bucket) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END,
         window_start = excluded.window_start
       RETURNING count`,
    )
    .bind(bucket, windowStart)
    .first<{ count: number }>();
  if ((row?.count ?? 1) > limit) {
    throw new HttpError(429, '한꺼번에 요청이 많이 들어왔어요. 1분쯤 기다렸다가 다시 해 보세요.', 'rate-limited');
  }
}
