import type { AppEnv } from './env';

/**
 * 보관기간 자동 정리(P2). 수업 종료(ended_at) 후 retention_days 가 지난 수업의 참여자 기록을 삭제하고,
 * 만료된 세션·캐시·속도 제한 창을 정리한다. 수업 자체(코드·설정)는 남기되 학생 자료는 지운다.
 * R2 사진은 바인딩이 있을 때 접두사로 삭제한다.
 */
export async function runRetentionCleanup(env: AppEnv) {
  const now = new Date();
  const nowISO = now.toISOString();
  const expiredClasses = await env.DB.prepare(
    `SELECT id FROM class_sessions WHERE ended_at IS NOT NULL AND datetime(ended_at, '+' || retention_days || ' days') < datetime(?)`,
  )
    .bind(nowISO)
    .all<{ id: string }>();
  let participantsDeleted = 0;
  for (const cls of expiredClasses.results) {
    if (env.PHOTOS) {
      let cursor: string | undefined;
      do {
        const list = await env.PHOTOS.list({ prefix: `${cls.id}/`, cursor });
        if (list.objects.length) await env.PHOTOS.delete(list.objects.map((o) => o.key));
        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor);
    }
    const r = await env.DB.prepare('DELETE FROM participants WHERE class_id = ?').bind(cls.id).run();
    participantsDeleted += r.meta.changes;
    await env.DB.prepare('UPDATE class_sessions SET archived_at = ? WHERE id = ?').bind(nowISO, cls.id).run();
  }
  const s1 = await env.DB.prepare('DELETE FROM student_sessions WHERE expires_at < ?').bind(nowISO).run();
  const s2 = await env.DB.prepare('DELETE FROM teacher_sessions WHERE expires_at < ?').bind(nowISO).run();
  const c1 = await env.DB.prepare('DELETE FROM api_cache WHERE expires_at < ?').bind(nowISO).run();
  const r1 = await env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(Math.floor(now.getTime() / 1000) - 86_400).run();
  return {
    ranAt: nowISO,
    classesArchived: expiredClasses.results.length,
    participantsDeleted,
    sessionsDeleted: s1.meta.changes + s2.meta.changes,
    cacheDeleted: c1.meta.changes,
    rateLimitRowsDeleted: r1.meta.changes,
  };
}
