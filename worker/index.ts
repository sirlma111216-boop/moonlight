import { Hono } from 'hono';
import type { AppEnv, HonoEnv } from './env';
import { student } from './routes/student';
import { teacher } from './routes/teacher';
import { publicdata } from './routes/publicdata';
import { HttpError } from './util/http';
import { runRetentionCleanup } from './cleanup';

const app = new Hono<HonoEnv>();

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Cache-Control', 'no-store');
});

app.get('/api/health', (c) => c.json({ ok: true, app: c.env.APP_NAME, environment: c.env.ENVIRONMENT, time: new Date().toISOString() }));

app.get('/api/config', (c) =>
  c.json({
    appName: c.env.APP_NAME,
    defaultRegion: c.env.DEFAULT_REGION,
    kasiConfigured: Boolean(c.env.KASI_SERVICE_KEY?.trim()),
    photosConfigured: Boolean(c.env.PHOTOS),
  }),
);

app.route('/api/student', student);
app.route('/api/teacher', teacher);
app.route('/api/publicdata', publicdata);

app.notFound((c) => c.json({ error: '없는 API 경로입니다.' }, 404));

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, code: err.code ?? null }, err.status as 400);
  console.error('unhandled', err);
  return c.json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: AppEnv, ctx: ExecutionContext) {
    ctx.waitUntil(runRetentionCleanup(env));
  },
} satisfies ExportedHandler<AppEnv>;
