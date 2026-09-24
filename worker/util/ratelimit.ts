import { HttpError } from './http';

/**
 * D1 기반 고정 창 속도 제한. 정밀하지 않지만 코드 추측·복구 키 추측·API 남용을 늦추기에 충분하다.
 */
export async function rateLimit(db: D1Database, bucket: string, limit: number, windowSec: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSec);
  const row = await db.prepare('SELECT window_start, count FROM rate_limits WHERE bucket = ?').bind(bucket).first<{ window_start: number; count: number }>();
  if (!row || row.window_start !== windowStart) {
    await db
      .prepare('INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1) ON CONFLICT(bucket) DO UPDATE SET window_start = excluded.window_start, count = 1')
      .bind(bucket, windowStart)
      .run();
    return;
  }
  if (row.count >= limit) {
    throw new HttpError(429, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 'rate-limited');
  }
  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE bucket = ?').bind(bucket).run();
}
