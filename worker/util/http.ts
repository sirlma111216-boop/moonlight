import type { Context } from 'hono';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function cookieHeader(name: string, value: string, req: Request, maxAgeSec: number): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function clearCookieHeader(name: string, req: Request): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/** 쿠키 기반 변경 요청의 CSRF 방어: 사용자 정의 헤더 + Origin/호스트 일치 */
export function assertSameOrigin(c: Context): void {
  const req = c.req.raw;
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
  if (req.headers.get('x-requested-with') !== 'moonlight') {
    throw new HttpError(403, '요청 헤더가 올바르지 않습니다.', 'csrf');
  }
  const origin = req.headers.get('origin');
  if (origin) {
    const host = new URL(req.url).host;
    let oh = '';
    try {
      oh = new URL(origin).host;
    } catch {
      throw new HttpError(403, '출처를 확인할 수 없습니다.', 'csrf');
    }
    if (oh !== host) throw new HttpError(403, '다른 출처의 요청은 처리하지 않습니다.', 'csrf');
  }
}

export async function readJson<T>(c: Context, maxBytes = 512 * 1024): Promise<T> {
  const len = Number(c.req.header('content-length') ?? '0');
  if (len > maxBytes) throw new HttpError(413, '요청 본문이 너무 큽니다.');
  const text = await c.req.text();
  if (text.length > maxBytes) throw new HttpError(413, '요청 본문이 너무 큽니다.');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'JSON 형식이 아닙니다.');
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

export function str(v: unknown, max = 2000): string {
  if (typeof v !== 'string') return '';
  return v.length > max ? v.slice(0, max) : v;
}

export function isISODate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function isHHMM(s: unknown): s is string {
  return typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);
}
