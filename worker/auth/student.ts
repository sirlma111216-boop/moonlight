import type { Context, Next } from 'hono';
import type { ClassSession } from '@shared/types';
import type { HonoEnv } from '../env';
import { getClassByCode, getClassById } from '../db/classes';
import { hmacHex, nowISO, participantTag, randomToken, uuid } from '../util/crypto';
import { HttpError, cookieHeader, parseCookies } from '../util/http';

export const STUDENT_COOKIE = 'ml_sid';
const SESSION_DAYS = 60;

export interface StudentContext {
  participantId: string;
  tag: string;
  classSession: ClassSession & { teacherId: string; endedAt: string | null };
}

export async function hashToken(secret: string, token: string) {
  return hmacHex(secret, `student:${token}`);
}

export async function resolveStudent(c: Context<HonoEnv>): Promise<StudentContext | null> {
  const cookies = parseCookies(c.req.header('cookie'));
  const token = cookies[STUDENT_COOKIE];
  if (!token) return null;
  const h = await hashToken(c.env.SESSION_SECRET, token);
  const row = await c.env.DB.prepare(
    `SELECT s.expires_at, p.id AS pid, p.tag, p.class_id FROM student_sessions s JOIN participants p ON p.id = s.participant_id WHERE s.token_hash = ?`,
  )
    .bind(h)
    .first<{ expires_at: string; pid: string; tag: string; class_id: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  const cls = await getClassById(c.env.DB, row.class_id);
  if (!cls || cls.archivedAt) return null;
  // last_seen 갱신은 부담을 줄이려고 대기 작업으로
  c.executionCtx.waitUntil(c.env.DB.prepare('UPDATE participants SET last_seen_at = ? WHERE id = ?').bind(nowISO(), row.pid).run());
  return { participantId: row.pid, tag: row.tag, classSession: cls };
}

export async function requireStudent(c: Context<HonoEnv>, next: Next) {
  const s = await resolveStudent(c);
  if (!s) throw new HttpError(401, '수업 코드로 다시 입장해 주세요.', 'no-session');
  c.set('participant', s);
  await next();
}

async function createSession(c: Context<HonoEnv>, participantId: string): Promise<string> {
  const token = randomToken(32);
  const h = await hashToken(c.env.SESSION_SECRET, token);
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await c.env.DB.prepare('INSERT INTO student_sessions (token_hash, participant_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(h, participantId, now.toISOString(), exp.toISOString())
    .run();
  c.header('Set-Cookie', cookieHeader(STUDENT_COOKIE, token, c.req.raw, SESSION_DAYS * 86_400), { append: true });
  return token;
}

/** 수업 코드로 입장 — 같은 기기의 유효한 세션이 같은 수업이면 이어 한다. */
export async function joinByCode(c: Context<HonoEnv>, code: string): Promise<StudentContext> {
  const cls = await getClassByCode(c.env.DB, code);
  if (!cls || cls.archivedAt) throw new HttpError(404, '수업 코드를 찾을 수 없어요. 교사에게 코드를 다시 확인해 주세요.', 'no-class');
  if (cls.expiresAt && new Date(cls.expiresAt).getTime() < Date.now()) throw new HttpError(410, '이 수업 코드는 만료되었어요.', 'expired');
  const existing = await resolveStudent(c);
  if (existing && existing.classSession.id === cls.id) return existing;
  const pid = uuid();
  const tag = participantTag();
  const now = nowISO();
  await c.env.DB.prepare('INSERT INTO participants (id, class_id, tag, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)').bind(pid, cls.id, tag, now, now).run();
  await createSession(c, pid);
  return { participantId: pid, tag, classSession: cls };
}

/** 개인 복구 키로 다른 기기에서 이어 하기 */
export async function recoverByKey(c: Context<HonoEnv>, code: string, key: string): Promise<StudentContext> {
  const cls = await getClassByCode(c.env.DB, code);
  if (!cls) throw new HttpError(404, '수업 코드를 찾을 수 없어요.', 'no-class');
  const h = await hmacHex(c.env.SESSION_SECRET, `recovery:${cls.id}:${key}`);
  const row = await c.env.DB.prepare('SELECT id, tag, recovery_attempts, recovery_locked_until FROM participants WHERE class_id = ? AND recovery_key_hash = ?')
    .bind(cls.id, h)
    .first<{ id: string; tag: string; recovery_attempts: number; recovery_locked_until: string | null }>();
  if (!row) throw new HttpError(404, '복구 키가 맞지 않아요.', 'bad-key');
  if (row.recovery_locked_until && new Date(row.recovery_locked_until).getTime() > Date.now()) {
    throw new HttpError(429, '복구 시도가 너무 많아 잠시 잠겼어요.', 'locked');
  }
  await c.env.DB.prepare('UPDATE participants SET recovery_attempts = 0, recovery_locked_until = NULL WHERE id = ?').bind(row.id).run();
  await createSession(c, row.id);
  return { participantId: row.id, tag: row.tag, classSession: cls };
}

export async function issueRecoveryKey(c: Context<HonoEnv>, s: StudentContext): Promise<string> {
  const { randomRecoveryKey } = await import('../util/crypto');
  const key = randomRecoveryKey();
  const h = await hmacHex(c.env.SESSION_SECRET, `recovery:${s.classSession.id}:${key}`);
  await c.env.DB.prepare('UPDATE participants SET recovery_key_hash = ? WHERE id = ?').bind(h, s.participantId).run();
  return key;
}

export async function endSession(c: Context<HonoEnv>) {
  const cookies = parseCookies(c.req.header('cookie'));
  const token = cookies[STUDENT_COOKIE];
  if (token) {
    const h = await hashToken(c.env.SESSION_SECRET, token);
    await c.env.DB.prepare('DELETE FROM student_sessions WHERE token_hash = ?').bind(h).run();
  }
}
