import { Hono } from 'hono';
import type { MediaAsset } from '@shared/types';
import { QID, STEP_IDS, TEACHER_REVIEW_QIDS } from '@shared/questionIds';
import { manifestAssets } from '@shared/mediaManifest';
import type { HonoEnv } from '../env';
import { availableModes, loginDev, loginWithAccess, loginWithKey, logoutTeacher, requireTeacher, resolveTeacher, TEACHER_COOKIE } from '../auth/teacher';
import { DEFAULT_SETTINGS, getClassById, listClassesForTeacher, sanitizeSettings } from '../db/classes';
import { loadAttempts, loadMediaAssets, loadObservations, loadReport, loadResponses, loadSnapshots, participantStats } from '../db/student';
import { checkKasi } from '../data/month';
import { normalizeCode, nowISO, randomCode, uuid } from '../util/crypto';
import { HttpError, assertSameOrigin, clearCookieHeader, isISODate, readJson, str } from '../util/http';
import { runRetentionCleanup } from '../cleanup';

export const teacher = new Hono<HonoEnv>();

teacher.get('/auth-modes', (c) => c.json({ modes: availableModes(c.env) }));

teacher.post('/login', async (c) => {
  assertSameOrigin(c);
  const b = await readJson<{ mode?: string; key?: string }>(c);
  let ctx;
  if (b.mode === 'key') ctx = await loginWithKey(c, str(b.key, 200));
  else if (b.mode === 'access') ctx = await loginWithAccess(c);
  else if (b.mode === 'dev') ctx = await loginDev(c);
  else throw new HttpError(400, '인증 방식을 선택해 주세요.');
  return c.json(ctx);
});

teacher.get('/me', async (c) => {
  const t = await resolveTeacher(c);
  return c.json({ teacher: t });
});

teacher.use('/*', async (c, next) => {
  const p = c.req.path;
  if (p.endsWith('/auth-modes') || p.endsWith('/login') || p.endsWith('/me')) return next();
  assertSameOrigin(c);
  return requireTeacher(c, next);
});

teacher.post('/logout', async (c) => {
  await logoutTeacher(c);
  c.header('Set-Cookie', clearCookieHeader(TEACHER_COOKIE, c.req.raw));
  return c.json({ ok: true });
});

async function ownedClass(c: Parameters<typeof requireTeacher>[0], id: string) {
  const t = c.get('teacher')!;
  const cls = await getClassById(c.env.DB, id);
  if (!cls || cls.teacherId !== t.teacherId) throw new HttpError(404, '수업을 찾을 수 없습니다.');
  return cls;
}

teacher.get('/classes', async (c) => {
  const t = c.get('teacher')!;
  const list = await listClassesForTeacher(c.env.DB, t.teacherId);
  const withStats = await Promise.all(list.map(async (cls) => ({ ...cls, stats: await participantStats(c.env.DB, cls.id) })));
  return c.json(withStats);
});

teacher.post('/classes', async (c) => {
  const t = c.get('teacher')!;
  const b = await readJson<{ title?: string; mode?: string; region?: string; periodStart?: string; periodEnd?: string; settings?: unknown; retentionDays?: number }>(c);
  const title = str(b.title, 80) || '달의 비밀 수업';
  const mode = b.mode === '2' ? '2' : '3';
  const region = str(b.region, 20) || c.env.DEFAULT_REGION;
  const today = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  const periodStart = isISODate(b.periodStart) ? b.periodStart : today;
  const periodEnd = isISODate(b.periodEnd) ? b.periodEnd : periodStart;
  const settings = sanitizeSettings(b.settings ?? DEFAULT_SETTINGS);
  const retention = Math.min(365, Math.max(1, Number(b.retentionDays) || 30));
  let code = randomCode(6);
  for (let i = 0; i < 5; i++) {
    const exists = await c.env.DB.prepare('SELECT 1 FROM class_sessions WHERE code = ?').bind(code).first();
    if (!exists) break;
    code = randomCode(6);
  }
  const id = uuid();
  const now = nowISO();
  const expires = new Date(Date.now() + 180 * 86_400_000).toISOString();
  await c.env.DB.prepare(
    'INSERT INTO class_sessions (id, code, title, mode, region, period_start, period_end, settings_json, retention_days, teacher_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, code, title, mode, region, periodStart, periodEnd, JSON.stringify(settings), retention, t.teacherId, now, expires)
    .run();
  return c.json(await getClassById(c.env.DB, id));
});

teacher.get('/classes/:id', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  return c.json({ ...cls, stats: await participantStats(c.env.DB, cls.id) });
});

teacher.put('/classes/:id', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const b = await readJson<{ title?: string; mode?: string; region?: string; periodStart?: string; periodEnd?: string; settings?: unknown; retentionDays?: number }>(c);
  const title = str(b.title, 80) || cls.title;
  const mode = b.mode === '2' ? '2' : b.mode === '3' ? '3' : cls.mode;
  const region = str(b.region, 20) || cls.region;
  const periodStart = isISODate(b.periodStart) ? b.periodStart : cls.periodStart;
  const periodEnd = isISODate(b.periodEnd) ? b.periodEnd : cls.periodEnd;
  const settings = b.settings ? sanitizeSettings(b.settings) : cls.settings;
  const retention = b.retentionDays ? Math.min(365, Math.max(1, Number(b.retentionDays))) : cls.retentionDays;
  await c.env.DB.prepare('UPDATE class_sessions SET title = ?, mode = ?, region = ?, period_start = ?, period_end = ?, settings_json = ?, retention_days = ? WHERE id = ?')
    .bind(title, mode, region, periodStart, periodEnd, JSON.stringify(settings), retention, cls.id)
    .run();
  return c.json(await getClassById(c.env.DB, cls.id));
});

teacher.post('/classes/:id/regenerate-code', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const code = randomCode(6);
  await c.env.DB.prepare('UPDATE class_sessions SET code = ? WHERE id = ?').bind(code, cls.id).run();
  return c.json({ code: normalizeCode(code) });
});

/** 수업 종료: 보관 기간 카운트다운 시작 */
teacher.post('/classes/:id/end', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  await c.env.DB.prepare('UPDATE class_sessions SET ended_at = ? WHERE id = ?').bind(nowISO(), cls.id).run();
  return c.json(await getClassById(c.env.DB, cls.id));
});

teacher.delete('/classes/:id', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM class_sessions WHERE id = ?').bind(cls.id).run();
  return c.json({ ok: true });
});

/** 익명 응답 분포 — 이름·참여자 ID·개별 서술을 절대 포함하지 않는다(R4) */
teacher.get('/classes/:id/aggregate', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const db = c.env.DB;
  const total = (await participantStats(db, cls.id)).participants;

  async function distribution(qid: string, path: string) {
    const rs = await db
      .prepare(
        `SELECT json_extract(r.latest_json, ?) AS v, COUNT(*) AS n FROM responses r JOIN participants p ON p.id = r.participant_id WHERE p.class_id = ? AND r.question_id = ? GROUP BY v`,
      )
      .bind(path, cls.id, qid)
      .all<{ v: string | number | null; n: number }>();
    const out: Record<string, number> = {};
    for (const r of rs.results) out[String(r.v ?? '(없음)')] = r.n;
    return out;
  }
  async function correctness(qid: string) {
    const rs = await db
      .prepare(
        `SELECT json_extract(r.latest_json, '$.correct') AS v, COUNT(*) AS n FROM responses r JOIN participants p ON p.id = r.participant_id WHERE p.class_id = ? AND r.question_id = ? GROUP BY v`,
      )
      .bind(cls.id, qid)
      .all<{ v: number | null; n: number }>();
    let correct = 0;
    let incorrect = 0;
    for (const r of rs.results) {
      if (r.v === 1) correct += r.n;
      else incorrect += r.n;
    }
    return { correct, incorrect, answered: correct + incorrect };
  }
  const stepCompletion: Record<string, { started: number; completedAny: number; completedScenes: number }> = {};
  const prog = await db
    .prepare(
      `SELECT pr.step_id, COUNT(DISTINCT pr.participant_id) AS started, COUNT(DISTINCT CASE WHEN pr.status = 'completed' THEN pr.participant_id END) AS completed_any, SUM(CASE WHEN pr.status = 'completed' THEN 1 ELSE 0 END) AS completed_scenes
       FROM progress pr JOIN participants p ON p.id = pr.participant_id WHERE p.class_id = ? GROUP BY pr.step_id`,
    )
    .bind(cls.id)
    .all<{ step_id: string; started: number; completed_any: number; completed_scenes: number }>();
  for (const s of STEP_IDS) stepCompletion[s] = { started: 0, completedAny: 0, completedScenes: 0 };
  for (const r of prog.results) stepCompletion[r.step_id] = { started: r.started, completedAny: r.completed_any, completedScenes: r.completed_scenes };

  const reports = await db
    .prepare(`SELECT status, COUNT(*) AS n FROM reports r JOIN participants p ON p.id = r.participant_id WHERE p.class_id = ? GROUP BY status`)
    .bind(cls.id)
    .all<{ status: string; n: number }>();
  const reportCounts: Record<string, number> = {};
  for (const r of reports.results) reportCounts[r.status] = r.n;

  return c.json({
    generatedAt: nowISO(),
    participants: total,
    q01: await distribution(QID.q01Choice, '$.choice'),
    q02: Object.fromEntries(await Promise.all(QID.q02Required.map(async (q) => [q, await correctness(q)]))),
    q08: await distribution(QID.q08FirstRevisit, '$.verdict'),
    q09: Object.fromEntries(await Promise.all(QID.q09Classify.map(async (q) => [q, await distribution(q, '$.choice')]))),
    q12: await distribution(QID.q12Final, '$.choice'),
    steps: stepCompletion,
    reports: reportCounts,
  });
});

/** 생각의 변화 표(교사 권한) — 참여자별 01·08·12 응답을 나란히 */
teacher.get('/classes/:id/change-table', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const rs = await c.env.DB.prepare(
    `SELECT p.id AS pid, p.tag, r.question_id, r.first_json, r.latest_json, rep.identity_json
     FROM participants p LEFT JOIN responses r ON r.participant_id = p.id AND r.question_id IN (?, ?, ?, ?, ?, ?)
     LEFT JOIN reports rep ON rep.participant_id = p.id WHERE p.class_id = ? ORDER BY p.created_at`,
  )
    .bind(QID.q01Choice, QID.q01Reason, QID.q08FirstRevisit, QID.q12Final, QID.q01MyQuestion, 'q12-open-question', cls.id)
    .all<{ pid: string; tag: string; question_id: string | null; first_json: string | null; latest_json: string | null; identity_json: string | null }>();
  type Row = { tag: string; identity: unknown; answers: Record<string, { first: unknown; latest: unknown }> };
  const map = new Map<string, Row>();
  for (const r of rs.results) {
    const e: Row = map.get(r.pid) ?? { tag: r.tag, identity: r.identity_json ? JSON.parse(r.identity_json) : null, answers: {} };
    if (r.question_id) e.answers[r.question_id] = { first: r.first_json ? JSON.parse(r.first_json) : null, latest: r.latest_json ? JSON.parse(r.latest_json) : null };
    map.set(r.pid, e);
  }
  return c.json({ rows: [...map.values()] });
});

/** 서술 응답 개별 검토 */
teacher.get('/classes/:id/narratives', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const placeholders = TEACHER_REVIEW_QIDS.map(() => '?').join(',');
  const rs = await c.env.DB.prepare(
    `SELECT p.tag, r.question_id, r.latest_json, r.updated_at FROM responses r JOIN participants p ON p.id = r.participant_id WHERE p.class_id = ? AND r.question_id IN (${placeholders}) ORDER BY r.question_id, r.updated_at`,
  )
    .bind(cls.id, ...TEACHER_REVIEW_QIDS)
    .all<{ tag: string; question_id: string; latest_json: string; updated_at: string }>();
  return c.json({ items: rs.results.map((r) => ({ tag: r.tag, questionId: r.question_id, value: JSON.parse(r.latest_json), updatedAt: r.updated_at })) });
});

teacher.get('/classes/:id/reports', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const rs = await c.env.DB.prepare(
    `SELECT p.id AS pid, p.tag, rep.status, rep.identity_json, rep.submitted_at, rep.updated_at, rep.version FROM participants p LEFT JOIN reports rep ON rep.participant_id = p.id WHERE p.class_id = ? ORDER BY p.created_at`,
  )
    .bind(cls.id)
    .all<{ pid: string; tag: string; status: string | null; identity_json: string | null; submitted_at: string | null; updated_at: string | null; version: number | null }>();
  return c.json({
    items: rs.results.map((r) => ({ participantId: r.pid, tag: r.tag, status: r.status, identity: r.identity_json ? JSON.parse(r.identity_json) : null, submittedAt: r.submitted_at, updatedAt: r.updated_at, version: r.version })),
  });
});

async function fullRecord(db: D1Database, pid: string) {
  const [report, responses, observations, snapshots, attempts] = await Promise.all([loadReport(db, pid), loadResponses(db, pid), loadObservations(db, pid), loadSnapshots(db, pid), loadAttempts(db, pid)]);
  return { report, responses, observations, snapshots, attempts };
}

teacher.get('/classes/:id/reports/:pid', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const pid = c.req.param('pid');
  const p = await c.env.DB.prepare('SELECT tag FROM participants WHERE id = ? AND class_id = ?').bind(pid, cls.id).first<{ tag: string }>();
  if (!p) throw new HttpError(404, '참여자를 찾을 수 없습니다.');
  return c.json({ tag: p.tag, ...(await fullRecord(c.env.DB, pid)) });
});

teacher.delete('/classes/:id/reports/:pid', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const pid = c.req.param('pid');
  await c.env.DB.prepare('DELETE FROM participants WHERE id = ? AND class_id = ?').bind(pid, cls.id).run();
  return c.json({ ok: true });
});

teacher.get('/classes/:id/export', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const ps = await c.env.DB.prepare('SELECT id, tag FROM participants WHERE class_id = ?').bind(cls.id).all<{ id: string; tag: string }>();
  const records = await Promise.all(ps.results.map(async (p) => ({ tag: p.tag, ...(await fullRecord(c.env.DB, p.id)) })));
  c.header('Content-Disposition', `attachment; filename="moonlight-class-${cls.code}.json"`);
  return c.json({ exportedAt: nowISO(), classSession: cls, records });
});

// ── 관측 자료(MediaAsset) 등록 (R10) ────────────────────────────────────────────
teacher.get('/classes/:id/media', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const assets = await loadMediaAssets(c.env.DB, cls.id);
  const readyReal = assets.filter((a) => a.kind === 'real' && a.category === 'phase' && a.src);
  const readyEclipse = assets.filter((a) => a.kind === 'real' && a.category !== 'phase' && a.src);
  return c.json({
    assets,
    readiness: {
      phasePhotos: readyReal.length,
      phaseReady: readyReal.length >= 3,
      solarPhoto: readyEclipse.some((a) => a.category === 'solar-eclipse'),
      lunarPhoto: readyEclipse.some((a) => a.category === 'lunar-eclipse'),
      manifestPlaceholders: manifestAssets().filter((a) => !a.src).length,
    },
  });
});

function sanitizeAsset(b: Partial<MediaAsset>): Omit<MediaAsset, 'id' | 'origin' | 'classId' | 'createdAt'> {
  const kind = b.kind === 'composite' || b.kind === 'simulation' ? b.kind : 'real';
  const category = b.category === 'solar-eclipse' || b.category === 'lunar-eclipse' || b.category === 'other' ? b.category : 'phase';
  const src = str(b.src ?? '', 500).trim() || null;
  if (src && !(src.startsWith('/') || src.startsWith('https://'))) throw new HttpError(400, '파일 경로는 /media/... 또는 https:// 로 시작해야 합니다.');
  const sourceUrl = str(b.sourceUrl ?? '', 500).trim() || null;
  if ((sourceUrl ?? '').toLowerCase().includes('svs.gsfc.nasa.gov') && kind === 'real') {
    throw new HttpError(400, 'NASA SVS 렌더는 시뮬레이션으로만 등록할 수 있습니다.');
  }
  return {
    kind,
    category,
    title: str(b.title, 120) || '제목 없음',
    photographer: str(b.photographer, 120),
    sourceUrl,
    takenAt: b.takenUnknown ? null : str(b.takenAt ?? '', 40) || null,
    takenTz: str(b.takenTz ?? '', 40) || null,
    takenUnknown: Boolean(b.takenUnknown) || !b.takenAt,
    region: str(b.region ?? '', 80) || null,
    processing: str(b.processing ?? '', 300) || null,
    license: str(b.license, 300),
    credit: str(b.credit, 300),
    alt: str(b.alt, 300),
    useSteps: Array.isArray(b.useSteps) ? b.useSteps.filter((s): s is string => typeof s === 'string' && (STEP_IDS as readonly string[]).includes(s)) : [],
    src,
  };
}

teacher.post('/classes/:id/media', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const b = await readJson<Partial<MediaAsset>>(c);
  const a = sanitizeAsset(b);
  const id = `ta-${uuid()}`;
  await c.env.DB.prepare(
    `INSERT INTO media_assets (id, class_id, kind, category, title, photographer, source_url, taken_at, taken_tz, taken_unknown, region, processing, license, credit, alt, use_steps_json, src, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, cls.id, a.kind, a.category, a.title, a.photographer, a.sourceUrl, a.takenAt, a.takenTz, a.takenUnknown ? 1 : 0, a.region, a.processing, a.license, a.credit, a.alt, JSON.stringify(a.useSteps), a.src, nowISO())
    .run();
  return c.json({ id });
});

teacher.put('/classes/:id/media/:mid', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  const mid = c.req.param('mid');
  const b = await readJson<Partial<MediaAsset>>(c);
  const a = sanitizeAsset(b);
  const r = await c.env.DB.prepare(
    `UPDATE media_assets SET kind = ?, category = ?, title = ?, photographer = ?, source_url = ?, taken_at = ?, taken_tz = ?, taken_unknown = ?, region = ?, processing = ?, license = ?, credit = ?, alt = ?, use_steps_json = ?, src = ? WHERE id = ? AND class_id = ?`,
  )
    .bind(a.kind, a.category, a.title, a.photographer, a.sourceUrl, a.takenAt, a.takenTz, a.takenUnknown ? 1 : 0, a.region, a.processing, a.license, a.credit, a.alt, JSON.stringify(a.useSteps), a.src, mid, cls.id)
    .run();
  if (r.meta.changes === 0) throw new HttpError(404, '자료를 찾을 수 없습니다(코드 매니페스트 자료는 파일에서 수정합니다).');
  return c.json({ ok: true });
});

teacher.delete('/classes/:id/media/:mid', async (c) => {
  const cls = await ownedClass(c, c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM media_assets WHERE id = ? AND class_id = ?').bind(c.req.param('mid'), cls.id).run();
  return c.json({ ok: true });
});

// ── API 연결 상태 ─────────────────────────────────────────────────────────────
teacher.get('/api-status', async (c) => {
  const checks = await c.env.DB.prepare('SELECT provider, ok, checked_at, message, sample_json FROM api_checks').all<{ provider: string; ok: number; checked_at: string; message: string; sample_json: string | null }>();
  const cache = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM api_cache').first<{ n: number }>();
  const get = (p: string) => {
    const r = checks.results.find((x) => x.provider === p);
    return r ? { ok: Boolean(r.ok), at: r.checked_at, message: r.message, sample: r.sample_json ? JSON.parse(r.sample_json) : null } : null;
  };
  return c.json({
    kasiKeyConfigured: Boolean(c.env.KASI_SERVICE_KEY?.trim()),
    r2Configured: Boolean(c.env.PHOTOS),
    accessConfigured: Boolean(c.env.CF_ACCESS_TEAM_DOMAIN && c.env.CF_ACCESS_AUD),
    lastLunarCheck: get('kasi-lunar'),
    lastRiseSetCheck: get('kasi-riseset'),
    cacheRows: cache?.n ?? 0,
  });
});

teacher.post('/api-status/check', async (c) => {
  const results = await checkKasi(c.env);
  return c.json({ results });
});

teacher.post('/cleanup', async (c) => {
  const r = await runRetentionCleanup(c.env);
  return c.json(r);
});
