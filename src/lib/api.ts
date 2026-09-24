export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string | null = null,
    public body: unknown = null,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; raw?: BodyInit; headers?: Record<string, string> } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const headers: Record<string, string> = { 'x-requested-with': 'moonlight', ...(init.headers ?? {}) };
  let body: BodyInit | undefined;
  if (init.raw !== undefined) body = init.raw;
  else if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없어요.', 'network');
  }
  if (!res.ok) {
    let data: { error?: string; code?: string } | null = null;
    try {
      data = (await res.json()) as { error?: string; code?: string };
    } catch {
      /* 본문 없음 */
    }
    throw new ApiError(res.status, data?.error ?? `요청 실패 (${res.status})`, data?.code ?? null, data);
  }
  return (await res.json()) as T;
}
