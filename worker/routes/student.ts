import { Hono } from 'hono';
import type { ModelAttempt, Observation, PublicDataSnapshot, StudentBundle } from '@shared/types';
import type { HonoEnv } from '../env';
import { endSession, issueRecoveryKey, joinByCode, recoverByKey, requireStudent, resolveStudent } from '../auth/student';
import {
  awardBadge,
  deleteObservation,
  loadAttempts,
  loadBadges,
  loadChallenge,
  loadMediaAssets,
  loadObservations,
  loadProgress,
  loadReport,
  loadResponses,
  loadSnapshots,
  saveAttempt,
  saveChallenge,
  saveObservation,
  saveReport,
  saveSnapshot,
  submitReport,
  upsertProgress,
  upsertResponse,
} from '../db/student';
import { normalizeCode, uuid } from '../util/crypto';
import { HttpError, assertSameOrigin, clientIp, isISODate, isHHMM, readJson, str } from '../util/http';
import { rateLimit } from '../util/ratelimit';

export const student = new Hono<HonoEnv>();

const BADGES = new Set(['data-interpreter', 'moon-restorer', 'shadow-tracker', 'manual-complete']);

async function bundle(c: Parameters<typeof requireStudent>[0], s: NonNullable<HonoEnv['Variables']['participant']>): Promise<StudentBundle> {
  const db = c.env.DB;
  const pid = s.participantId;
  const [responses, progress, observations, snapshots, attempts, report, badges, challenge, mediaAssets] = await Promise.all([
    loadResponses(db, pid),
    loadProgress(db, pid),
    loadObservations(db, pid),
    loadSnapshots(db, pid),
    loadAttempts(db, pid),
    loadReport(db, pid),
    loadBadges(db, pid),
    loadChallenge(db, pid),
    loadMediaAssets(db, s.classSession.id),
  ]);
  const { teacherId: _t, endedAt: _e, ...classSession } = s.classSession;
  return {
    participant: { id: pid, tag: s.tag, classId: s.classSession.id, createdAt: '' },
    classSession,
    responses,
    progress,
    observations,
    snapshots,
    attempts,
    report,
    badges,
    challenge,
    mediaAssets,
  };
}

student.post('/join', async (c) => {
  assertSameOrigin(c);
  await rateLimit(c.env.DB, `join:${clientIp(c.req.raw)}`, 20, 60);
  const body = await readJson<{ code?: string }>(c);
  const code = normalizeCode(str(body.code ?? '', 12));
  if (code.length < 4) throw new HttpError(400, '수업 코드를 입력해 주세요.');
  const s = await joinByCode(c, code);
  return c.json(await bundle(c, s));
});

student.post('/recover', async (c) => {
  assertSameOrigin(c);
  await rateLimit(c.env.DB, `recover:${clientIp(c.req.raw)}`, 5, 300);
  const body = await readJson<{ code?: string; key?: string }>(c);
  const code = normalizeCode(str(body.code ?? '', 12));
  const key = str(body.key ?? '', 40).toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!code || !key) throw new HttpError(400, '수업 코드와 복구 키를 입력해 주세요.');
  const s = await recoverByKey(c, code, key);
  return c.json(await bundle(c, s));
});

student.get('/me', async (c) => {
  const s = await resolveStudent(c);
  if (!s) return c.json({ session: null });
  return c.json(await bundle(c, s));
});

student.use('/*', async (c, next) => {
  if (c.req.path.endsWith('/join') || c.req.path.endsWith('/recover') || c.req.path.endsWith('/me')) return next();
  assertSameOrigin(c);
  return requireStudent(c, next);
});

student.post('/leave', async (c) => {
  await endSession(c);
  const { clearCookieHeader } = await import('../util/http');
  const { STUDENT_COOKIE } = await import('../auth/student');
  c.header('Set-Cookie', clearCookieHeader(STUDENT_COOKIE, c.req.raw));
  return c.json({ ok: true });
});

student.post('/recovery-key', async (c) => {
  const s = c.get('participant')!;
  const key = await issueRecoveryKey(c, s);
  return c.json({ key });
});

student.post('/progress', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<{ stepId?: string; sceneId?: string; status?: string }>(c);
  const stepId = str(b.stepId, 16);
  const sceneId = str(b.sceneId, 64);
  const status = b.status;
  if (!stepId || !sceneId || (status !== 'visited' && status !== 'answered' && status !== 'completed')) throw new HttpError(400, '진행 정보가 올바르지 않습니다.');
  await upsertProgress(c.env.DB, s.participantId, stepId, sceneId, status);
  return c.json({ ok: true });
});

student.post('/responses', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<{ questionId?: string; stepId?: string; sceneId?: string; value?: unknown; hintsUsed?: number }>(c, 256 * 1024);
  const questionId = str(b.questionId, 64);
  const stepId = str(b.stepId, 16);
  const sceneId = str(b.sceneId, 64);
  if (!questionId || !stepId || !sceneId) throw new HttpError(400, '문항 정보가 올바르지 않습니다.');
  const rec = await upsertResponse(c.env.DB, s.participantId, { questionId, stepId, sceneId, value: b.value, hintsUsed: Number(b.hintsUsed) || 0 });
  return c.json(rec);
});

student.post('/observations', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<Partial<Observation>>(c, 1024 * 1024);
  // 날짜 미상('')은 허용한다(제공 자료의 촬영일을 모르는 경우). 임의의 날짜를 채우지 않는다.
  if (b.date !== '' && !isISODate(b.date)) throw new HttpError(400, '날짜가 올바르지 않습니다.');
  const timeKnown = Boolean(b.timeKnown) && isHHMM(b.time);
  const sourceType = b.sourceType === 'provided-observation' ? 'provided-observation' : 'my-observation';
  const photoAllowed = s.classSession.settings.photoUploadEnabled;
  const drawing = typeof b.drawingDataUrl === 'string' && b.drawingDataUrl.startsWith('data:image/png;base64,') && b.drawingDataUrl.length < 400_000 ? b.drawingDataUrl : null;
  const obs = await saveObservation(c.env.DB, s.participantId, {
    id: typeof b.id === 'string' && b.id.length <= 40 ? b.id : uuid(),
    sourceType,
    mediaAssetId: sourceType === 'provided-observation' ? str(b.mediaAssetId ?? '', 80) || null : null,
    date: b.date,
    time: timeKnown ? (b.time as string) : null,
    timeKnown,
    region: str(b.region, 40) || s.classSession.region,
    drawingDataUrl: drawing,
    brightDescription: str(b.brightDescription, 1000),
    direction: str(b.direction ?? '', 60) || null,
    weather: str(b.weather ?? '', 200) || null,
    confidence: b.confidence === 'low' || b.confidence === 'high' ? b.confidence : 'mid',
    photoKey: photoAllowed && typeof b.photoKey === 'string' ? str(b.photoKey, 120) : null,
  });
  return c.json(obs);
});

student.delete('/observations/:id', async (c) => {
  const s = c.get('participant')!;
  await deleteObservation(c.env.DB, s.participantId, c.req.param('id'));
  return c.json({ ok: true });
});

student.post('/snapshots', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<Partial<PublicDataSnapshot>>(c, 1024 * 1024);
  const provider = b.provider;
  if (provider !== 'kasi-lunar-age' && provider !== 'kasi-riseset' && provider !== 'app-astronomy') throw new HttpError(400, '자료 제공처가 올바르지 않습니다.');
  const snap: PublicDataSnapshot = {
    id: typeof b.id === 'string' && b.id.length <= 60 ? b.id : uuid(),
    provider,
    request: (b.request && typeof b.request === 'object' ? b.request : {}) as Record<string, string>,
    baseTime: str(b.baseTime, 60),
    raw: b.raw ?? null,
    normalized: b.normalized ?? null,
    isCached: Boolean(b.isCached),
    isExample: Boolean(b.isExample),
    sourceUrl: str(b.sourceUrl, 400),
    fetchedAt: str(b.fetchedAt, 40) || new Date().toISOString(),
  };
  await saveSnapshot(c.env.DB, s.participantId, snap);
  return c.json(snap);
});

student.post('/attempts', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<Partial<ModelAttempt>>(c, 256 * 1024);
  const modes = ['phase', 'eclipse-solar', 'eclipse-lunar', 'tilt', 'sandbox'];
  if (!b.mode || !modes.includes(b.mode)) throw new HttpError(400, '모형 모드가 올바르지 않습니다.');
  if (!b.state || typeof b.state !== 'object') throw new HttpError(400, '모형 상태가 없습니다.');
  const st = b.state;
  const rec = await saveAttempt(c.env.DB, s.participantId, {
    id: typeof b.id === 'string' && b.id.length <= 60 ? b.id : uuid(),
    stepId: str(b.stepId, 16),
    sceneId: str(b.sceneId, 64),
    mode: b.mode,
    targetSource: str(b.targetSource, 120),
    target: b.target ?? null,
    state: {
      theta: Number(st.theta) || 0,
      inclination: Number(st.inclination) || 0,
      nodeLongitude: Number(st.nodeLongitude) || 0,
      view: st.view === 'top' || st.view === 'side' ? st.view : 'default',
      showSightline: Boolean(st.showSightline),
      showLitSide: Boolean(st.showLitSide),
      showShadow: Boolean(st.showShadow),
      observer: st.observer && typeof st.observer === 'object' ? { lat: Number(st.observer.lat) || 0, lon: Number(st.observer.lon) || 0 } : null,
    },
    submitted: Boolean(b.submitted),
    result: b.result ?? null,
    hintsUsed: Number(b.hintsUsed) || 0,
    isSandbox: b.mode === 'sandbox' || Boolean(b.isSandbox),
  });
  return c.json(rec);
});

student.put('/report', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<{ identity?: unknown; sections?: unknown; attachSandbox?: boolean; version?: number }>(c, 512 * 1024);
  const fields = s.classSession.settings.identityFields;
  const idIn = (b.identity ?? {}) as Record<string, unknown>;
  const identity: Record<string, string> = {};
  if (fields.name) identity.name = str(idIn.name, 40);
  if (fields.grade) identity.grade = str(idIn.grade, 10);
  if (fields.classNo) identity.classNo = str(idIn.classNo, 10);
  if (fields.number) identity.number = str(idIn.number, 10);
  const r = await saveReport(c.env.DB, s.participantId, { identity, sections: Array.isArray(b.sections) ? b.sections : [], attachSandbox: Boolean(b.attachSandbox), version: Number(b.version) || 0 });
  if (!r.ok) return c.json({ conflict: true, current: r.current }, 409);
  return c.json(r.report);
});

student.post('/report/submit', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<{ version?: number }>(c);
  const r = await submitReport(c.env.DB, s.participantId, Number(b.version) || 0);
  if (!r.ok) return c.json({ conflict: true, current: r.current }, 409);
  return c.json(r.report);
});

student.post('/badges', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<{ badgeId?: string }>(c);
  if (!b.badgeId || !BADGES.has(b.badgeId)) throw new HttpError(400, '배지가 올바르지 않습니다.');
  const rec = await awardBadge(c.env.DB, s.participantId, b.badgeId);
  return c.json({ awarded: rec });
});

student.put('/challenge', async (c) => {
  const s = c.get('participant')!;
  const b = await readJson<{ candidateDate?: string; predictionDrawingDataUrl?: string | null; predictionNote?: string; observed?: string | null; followupNote?: string }>(c, 512 * 1024);
  if (!isISODate(b.candidateDate)) throw new HttpError(400, '날짜가 올바르지 않습니다.');
  const drawing = typeof b.predictionDrawingDataUrl === 'string' && b.predictionDrawingDataUrl.startsWith('data:image/png;base64,') && b.predictionDrawingDataUrl.length < 400_000 ? b.predictionDrawingDataUrl : null;
  await saveChallenge(c.env.DB, s.participantId, {
    candidateDate: b.candidateDate,
    predictionDrawingDataUrl: drawing,
    predictionNote: str(b.predictionNote, 500),
    observed: b.observed === 'yes' || b.observed === 'no' ? b.observed : null,
    followupNote: str(b.followupNote, 500),
  });
  return c.json(await loadChallenge(c.env.DB, s.participantId));
});

/** 구조화된 학습 기록 내보내기 */
student.get('/export', async (c) => {
  const s = c.get('participant')!;
  const data = await bundle(c, s);
  c.header('Content-Disposition', `attachment; filename="moonlight-record-${s.tag}.json"`);
  return c.json({ exportedAt: new Date().toISOString(), app: c.env.APP_NAME, ...data });
});

// ── P2: 사진 업로드 (R2 바인딩과 수업 설정이 모두 켜져 있을 때만) ───────────────
student.post('/photo', async (c) => {
  const s = c.get('participant')!;
  if (!s.classSession.settings.photoUploadEnabled) throw new HttpError(404, '이 수업은 사진 업로드를 사용하지 않아요.', 'photo-off');
  if (!c.env.PHOTOS) throw new HttpError(503, '사진 저장소(R2)가 설정되지 않았어요. 교사에게 알려 주세요.', 'no-r2');
  const buf = await c.req.arrayBuffer();
  if (buf.byteLength > 5 * 1024 * 1024) throw new HttpError(413, '사진은 5MB 이하만 올릴 수 있어요.');
  const { sniffImage, stripToSafeImage } = await import('../data/image');
  const kind = sniffImage(new Uint8Array(buf));
  if (!kind) throw new HttpError(415, 'JPEG 또는 PNG 사진만 올릴 수 있어요.');
  const safe = stripToSafeImage(new Uint8Array(buf), kind);
  const key = `${s.classSession.id}/${s.participantId}/${uuid()}.${kind}`;
  await c.env.PHOTOS.put(key, safe, { httpMetadata: { contentType: kind === 'jpeg' ? 'image/jpeg' : 'image/png' } });
  return c.json({ key });
});

student.get('/photo/:key{.+}', async (c) => {
  const s = c.get('participant')!;
  if (!c.env.PHOTOS) throw new HttpError(404, '사진 저장소가 없습니다.');
  const key = c.req.param('key');
  if (!key.startsWith(`${s.classSession.id}/${s.participantId}/`)) throw new HttpError(403, '접근할 수 없는 사진입니다.');
  const obj = await c.env.PHOTOS.get(key);
  if (!obj) throw new HttpError(404, '사진이 없습니다.');
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream', 'cache-control': 'private, max-age=300' } });
});
