import type { Context, Next } from 'hono';
import type { HonoEnv } from '../env';
import { hmacHex, randomToken, timingSafeEqual } from '../util/crypto';
import { HttpError, clientIp, cookieHeader, parseCookies } from '../util/http';
import { rateLimit } from '../util/ratelimit';

/**
 * 교사 인증 — 서버에서 토큰을 검증하는 단일 인터페이스(수정 지시 R1).
 *  - 'access': Cloudflare Access JWT(Cf-Access-Jwt-Assertion)를 팀의 공개키로 검증 (권장 운영 방식)
 *  - 'key':    TEACHER_ACCESS_KEY 비밀값을 서버에서 상수 시간 비교 → 서명된 세션 쿠키 발급 (Access 연동 전 임시)
 *  - 'dev':    로컬 개발 전용 우회. import.meta.env.DEV 로 감싸 운영 번들에서는 제거된다.
 */
export const TEACHER_COOKIE = 'ml_tsid';
const SESSION_HOURS = 12;

export type TeacherAuthMode = 'access' | 'key' | 'dev';

export interface TeacherContext {
  teacherId: string;
  mode: TeacherAuthMode;
}

export function availableModes(env: HonoEnv['Bindings']): TeacherAuthMode[] {
  const modes: TeacherAuthMode[] = [];
  if (env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD) modes.push('access');
  if (env.TEACHER_ACCESS_KEY) modes.push('key');
  if (import.meta.env.DEV && env.DEV_TEACHER_BYPASS === 'true') modes.push('dev');
  return modes;
}

async function tokenHash(secret: string, token: string) {
  return hmacHex(secret, `teacher:${token}`);
}

export async function resolveTeacher(c: Context<HonoEnv>): Promise<TeacherContext | null> {
  const cookies = parseCookies(c.req.header('cookie'));
  const token = cookies[TEACHER_COOKIE];
  if (token) {
    const h = await tokenHash(c.env.SESSION_SECRET, token);
    const row = await c.env.DB.prepare('SELECT teacher_id, auth_mode, expires_at FROM teacher_sessions WHERE token_hash = ?')
      .bind(h)
      .first<{ teacher_id: string; auth_mode: TeacherAuthMode; expires_at: string }>();
    if (row && new Date(row.expires_at).getTime() > Date.now()) return { teacherId: row.teacher_id, mode: row.auth_mode };
  }
  // Access 모드: 매 요청에 JWT 가 실려 온다
  const jwt = c.req.header('cf-access-jwt-assertion');
  if (jwt && c.env.CF_ACCESS_TEAM_DOMAIN && c.env.CF_ACCESS_AUD) {
    const claims = await verifyAccessJwt(jwt, c.env.CF_ACCESS_TEAM_DOMAIN, c.env.CF_ACCESS_AUD);
    if (claims) return { teacherId: `access:${claims.email ?? claims.sub}`, mode: 'access' };
  }
  return null;
}

export async function requireTeacher(c: Context<HonoEnv>, next: Next) {
  const t = await resolveTeacher(c);
  if (!t) throw new HttpError(401, '교사 인증이 필요합니다.', 'teacher-auth');
  c.set('teacher', t);
  await next();
}

async function createTeacherSession(c: Context<HonoEnv>, teacherId: string, mode: TeacherAuthMode) {
  const token = randomToken(32);
  const h = await tokenHash(c.env.SESSION_SECRET, token);
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_HOURS * 3_600_000);
  await c.env.DB.prepare('INSERT INTO teacher_sessions (token_hash, teacher_id, auth_mode, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(h, teacherId, mode, now.toISOString(), exp.toISOString())
    .run();
  c.header('Set-Cookie', cookieHeader(TEACHER_COOKIE, token, c.req.raw, SESSION_HOURS * 3600), { append: true });
}

/** 접근 키 로그인 (mode 'key') */
export async function loginWithKey(c: Context<HonoEnv>, key: string): Promise<TeacherContext> {
  if (!c.env.TEACHER_ACCESS_KEY) throw new HttpError(400, '접근 키 모드가 설정되지 않았습니다.', 'no-key-mode');
  await rateLimit(c.env.DB, `teacher-login:${clientIp(c.req.raw)}`, 5, 60);
  const a = await hmacHex(c.env.SESSION_SECRET, `key:${key}`);
  const b = await hmacHex(c.env.SESSION_SECRET, `key:${c.env.TEACHER_ACCESS_KEY}`);
  if (!timingSafeEqual(a, b)) throw new HttpError(401, '접근 키가 맞지 않습니다.', 'bad-key');
  const ctx: TeacherContext = { teacherId: 'key-teacher', mode: 'key' };
  await createTeacherSession(c, ctx.teacherId, ctx.mode);
  return ctx;
}

/** Access 모드: 헤더의 JWT 로 세션을 만든다 */
export async function loginWithAccess(c: Context<HonoEnv>): Promise<TeacherContext> {
  const jwt = c.req.header('cf-access-jwt-assertion');
  if (!jwt || !c.env.CF_ACCESS_TEAM_DOMAIN || !c.env.CF_ACCESS_AUD) throw new HttpError(401, 'Cloudflare Access 인증 정보가 없습니다.', 'no-access');
  const claims = await verifyAccessJwt(jwt, c.env.CF_ACCESS_TEAM_DOMAIN, c.env.CF_ACCESS_AUD);
  if (!claims) throw new HttpError(401, 'Access 토큰을 검증하지 못했습니다.', 'bad-access');
  const ctx: TeacherContext = { teacherId: `access:${claims.email ?? claims.sub}`, mode: 'access' };
  await createTeacherSession(c, ctx.teacherId, ctx.mode);
  return ctx;
}

/** 개발 전용 우회 — 운영 번들에서는 import.meta.env.DEV 가 false 로 치환되어 제거된다 */
export async function loginDev(c: Context<HonoEnv>): Promise<TeacherContext> {
  if (import.meta.env.DEV && c.env.DEV_TEACHER_BYPASS === 'true') {
    const ctx: TeacherContext = { teacherId: 'dev-teacher', mode: 'dev' };
    await createTeacherSession(c, ctx.teacherId, ctx.mode);
    return ctx;
  }
  throw new HttpError(404, '사용할 수 없는 인증 방식입니다.', 'no-dev');
}

export async function logoutTeacher(c: Context<HonoEnv>) {
  const cookies = parseCookies(c.req.header('cookie'));
  const token = cookies[TEACHER_COOKIE];
  if (token) {
    const h = await tokenHash(c.env.SESSION_SECRET, token);
    await c.env.DB.prepare('DELETE FROM teacher_sessions WHERE token_hash = ?').bind(h).run();
  }
}

// ── Cloudflare Access JWT 검증 (RS256, 팀 공개키) ─────────────────────────────

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}
let certCache: { domain: string; keys: Jwk[]; fetchedAt: number } | null = null;

async function fetchCerts(teamDomain: string): Promise<Jwk[]> {
  if (certCache && certCache.domain === teamDomain && Date.now() - certCache.fetchedAt < 3_600_000) return certCache.keys;
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs ${res.status}`);
  const data = (await res.json()) as { keys: Jwk[] };
  certCache = { domain: teamDomain, keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export async function verifyAccessJwt(jwt: string, teamDomain: string, aud: string): Promise<{ email?: string; sub: string } | null> {
  try {
    const [h, p, s] = jwt.split('.');
    if (!h || !p || !s) return null;
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))) as { kid: string; alg: string };
    if (header.alg !== 'RS256') return null;
    const keys = await fetchCerts(teamDomain);
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as { aud: string | string[]; exp: number; iss: string; email?: string; sub: string };
    const audOk = Array.isArray(claims.aud) ? claims.aud.includes(aud) : claims.aud === aud;
    if (!audOk) return null;
    if (claims.exp * 1000 < Date.now()) return null;
    if (claims.iss !== `https://${teamDomain}`) return null;
    return { email: claims.email, sub: claims.sub };
  } catch {
    return null;
  }
}
