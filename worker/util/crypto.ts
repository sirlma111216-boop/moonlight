const enc = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const a = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of a) s += b.toString(16).padStart(2, '0');
  return s;
}

function toBase64Url(a: Uint8Array): string {
  let s = '';
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return toHex(sig);
}

export async function sha256Hex(data: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(data)));
}

export function randomToken(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toBase64Url(a);
}

/** 혼동되기 쉬운 문자(0/O/1/I)를 뺀 수업 코드 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function randomCode(length = 6): string {
  const a = new Uint8Array(length);
  crypto.getRandomValues(a);
  let s = '';
  for (const b of a) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

/** 개인 복구 키: 4자 묶음 4개 (예: K7QM-3RZP-…) */
export function randomRecoveryKey(): string {
  return [randomCode(4), randomCode(4), randomCode(4), randomCode(4)].join('-');
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function participantTag(): string {
  return `달-${randomCode(4)}`;
}
