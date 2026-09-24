import type {
  BadgeRecord,
  MediaAsset,
  ModelAttempt,
  Observation,
  ObservationChallenge,
  ProgressRecord,
  PublicDataSnapshot,
  Report,
  ResponseRecord,
} from '@shared/types';
import { manifestAssets } from '@shared/mediaManifest';
import { nowISO, uuid } from '../util/crypto';

function parse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export async function loadResponses(db: D1Database, pid: string): Promise<ResponseRecord[]> {
  const rs = await db.prepare('SELECT * FROM responses WHERE participant_id = ?').bind(pid).all<Record<string, string | number>>();
  return rs.results.map((r) => ({
    questionId: String(r.question_id),
    stepId: String(r.step_id),
    sceneId: String(r.scene_id),
    first: parse(String(r.first_json), null),
    latest: parse(String(r.latest_json), null),
    hintsUsed: Number(r.hints_used),
    version: Number(r.version),
    updatedAt: String(r.updated_at),
  }));
}

export async function upsertResponse(
  db: D1Database,
  pid: string,
  input: { questionId: string; stepId: string; sceneId: string; value: unknown; hintsUsed?: number },
): Promise<ResponseRecord> {
  const now = nowISO();
  const json = JSON.stringify(input.value ?? null);
  const existing = await db
    .prepare('SELECT first_json, version, hints_used FROM responses WHERE participant_id = ? AND question_id = ?')
    .bind(pid, input.questionId)
    .first<{ first_json: string; version: number; hints_used: number }>();
  if (existing) {
    const hints = Math.max(existing.hints_used, input.hintsUsed ?? 0);
    await db
      .prepare('UPDATE responses SET latest_json = ?, version = version + 1, hints_used = ?, updated_at = ?, step_id = ?, scene_id = ? WHERE participant_id = ? AND question_id = ?')
      .bind(json, hints, now, input.stepId, input.sceneId, pid, input.questionId)
      .run();
    return {
      questionId: input.questionId,
      stepId: input.stepId,
      sceneId: input.sceneId,
      first: parse(existing.first_json, null),
      latest: input.value,
      hintsUsed: hints,
      version: existing.version + 1,
      updatedAt: now,
    };
  }
  await db
    .prepare('INSERT INTO responses (id, participant_id, step_id, scene_id, question_id, first_json, latest_json, hints_used, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)')
    .bind(uuid(), pid, input.stepId, input.sceneId, input.questionId, json, json, input.hintsUsed ?? 0, now, now)
    .run();
  return {
    questionId: input.questionId,
    stepId: input.stepId,
    sceneId: input.sceneId,
    first: input.value,
    latest: input.value,
    hintsUsed: input.hintsUsed ?? 0,
    version: 1,
    updatedAt: now,
  };
}

export async function loadProgress(db: D1Database, pid: string): Promise<ProgressRecord[]> {
  const rs = await db.prepare('SELECT step_id, scene_id, status, updated_at FROM progress WHERE participant_id = ?').bind(pid).all<Record<string, string>>();
  return rs.results.map((r) => ({ stepId: r.step_id, sceneId: r.scene_id, status: r.status as ProgressRecord['status'], updatedAt: r.updated_at }));
}

const RANK = { visited: 0, answered: 1, completed: 2 } as const;

/** 진행 상태는 뒤로 내려가지 않는다(완료 → 방문으로 되돌리지 않음). */
export async function upsertProgress(db: D1Database, pid: string, stepId: string, sceneId: string, status: ProgressRecord['status']) {
  const now = nowISO();
  const row = await db.prepare('SELECT status FROM progress WHERE participant_id = ? AND step_id = ? AND scene_id = ?').bind(pid, stepId, sceneId).first<{ status: ProgressRecord['status'] }>();
  if (row && RANK[row.status] >= RANK[status]) return;
  await db
    .prepare('INSERT INTO progress (participant_id, step_id, scene_id, status, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(participant_id, step_id, scene_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at')
    .bind(pid, stepId, sceneId, status, now)
    .run();
}

export async function loadObservations(db: D1Database, pid: string): Promise<Observation[]> {
  const rs = await db.prepare('SELECT * FROM observations WHERE participant_id = ? ORDER BY created_at').bind(pid).all<Record<string, string | number | null>>();
  return rs.results.map((r) => ({
    id: String(r.id),
    sourceType: r.source_type as Observation['sourceType'],
    mediaAssetId: (r.media_asset_id as string | null) ?? null,
    date: String(r.date),
    time: (r.time as string | null) ?? null,
    timeKnown: Boolean(r.time_known),
    region: String(r.region),
    drawingDataUrl: (r.drawing_data_url as string | null) ?? null,
    brightDescription: String(r.bright_description ?? ''),
    direction: (r.direction as string | null) ?? null,
    weather: (r.weather as string | null) ?? null,
    confidence: (r.confidence as Observation['confidence']) ?? 'mid',
    photoKey: (r.photo_key as string | null) ?? null,
    createdAt: String(r.created_at),
  }));
}

export async function saveObservation(db: D1Database, pid: string, o: Omit<Observation, 'createdAt'>): Promise<Observation> {
  const now = nowISO();
  await db
    .prepare(
      `INSERT INTO observations (id, participant_id, source_type, media_asset_id, date, time, time_known, region, drawing_data_url, bright_description, direction, weather, confidence, photo_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET source_type = excluded.source_type, media_asset_id = excluded.media_asset_id, date = excluded.date, time = excluded.time, time_known = excluded.time_known,
         region = excluded.region, drawing_data_url = excluded.drawing_data_url, bright_description = excluded.bright_description, direction = excluded.direction, weather = excluded.weather,
         confidence = excluded.confidence, photo_key = excluded.photo_key`,
    )
    .bind(
      o.id,
      pid,
      o.sourceType,
      o.mediaAssetId ?? null,
      o.date,
      o.time,
      o.timeKnown ? 1 : 0,
      o.region,
      o.drawingDataUrl ?? null,
      o.brightDescription,
      o.direction ?? null,
      o.weather ?? null,
      o.confidence,
      o.photoKey ?? null,
      now,
    )
    .run();
  return { ...o, createdAt: now };
}

export async function deleteObservation(db: D1Database, pid: string, id: string) {
  await db.prepare('DELETE FROM observations WHERE participant_id = ? AND id = ?').bind(pid, id).run();
}

export async function loadSnapshots(db: D1Database, pid: string): Promise<PublicDataSnapshot[]> {
  const rs = await db.prepare('SELECT * FROM public_data_snapshots WHERE participant_id = ? ORDER BY fetched_at').bind(pid).all<Record<string, string | number>>();
  return rs.results.map((r) => ({
    id: String(r.id),
    provider: r.provider as PublicDataSnapshot['provider'],
    request: parse(String(r.request_json), {}),
    baseTime: String(r.base_time),
    raw: parse(String(r.raw_json), null),
    normalized: parse(String(r.normalized_json), null),
    isCached: Boolean(r.is_cached),
    isExample: Boolean(r.is_example),
    sourceUrl: String(r.source_url),
    fetchedAt: String(r.fetched_at),
  }));
}

export async function saveSnapshot(db: D1Database, pid: string, s: PublicDataSnapshot) {
  await db
    .prepare(
      `INSERT INTO public_data_snapshots (id, participant_id, provider, request_json, base_time, raw_json, normalized_json, is_cached, is_example, source_url, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET request_json = excluded.request_json, base_time = excluded.base_time, raw_json = excluded.raw_json, normalized_json = excluded.normalized_json,
         is_cached = excluded.is_cached, is_example = excluded.is_example, source_url = excluded.source_url, fetched_at = excluded.fetched_at`,
    )
    .bind(s.id, pid, s.provider, JSON.stringify(s.request), s.baseTime, JSON.stringify(s.raw ?? null), JSON.stringify(s.normalized ?? null), s.isCached ? 1 : 0, s.isExample ? 1 : 0, s.sourceUrl, s.fetchedAt)
    .run();
}

export async function loadAttempts(db: D1Database, pid: string): Promise<ModelAttempt[]> {
  const rs = await db.prepare('SELECT * FROM model_attempts WHERE participant_id = ? ORDER BY created_at').bind(pid).all<Record<string, string | number | null>>();
  return rs.results.map((r) => ({
    id: String(r.id),
    stepId: String(r.step_id),
    sceneId: String(r.scene_id),
    mode: r.mode as ModelAttempt['mode'],
    targetSource: String(r.target_source),
    target: parse(String(r.target_json), null),
    state: parse(String(r.state_json), { theta: 0, inclination: 0, nodeLongitude: 0, view: 'default', showSightline: false, showLitSide: false, showShadow: false }),
    submitted: Boolean(r.submitted),
    result: parse((r.result_json as string | null) ?? null, null),
    hintsUsed: Number(r.hints_used ?? 0),
    isSandbox: Boolean(r.is_sandbox),
    createdAt: String(r.created_at),
  }));
}

export async function saveAttempt(db: D1Database, pid: string, a: Omit<ModelAttempt, 'createdAt'>): Promise<ModelAttempt> {
  const now = nowISO();
  await db
    .prepare(
      `INSERT INTO model_attempts (id, participant_id, step_id, scene_id, mode, target_source, target_json, state_json, submitted, result_json, hints_used, is_sandbox, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, submitted = excluded.submitted, result_json = excluded.result_json, hints_used = excluded.hints_used, target_json = excluded.target_json`,
    )
    .bind(a.id, pid, a.stepId, a.sceneId, a.mode, a.targetSource, JSON.stringify(a.target ?? null), JSON.stringify(a.state), a.submitted ? 1 : 0, JSON.stringify(a.result ?? null), a.hintsUsed, a.isSandbox ? 1 : 0, now)
    .run();
  return { ...a, createdAt: now };
}

export async function loadReport(db: D1Database, pid: string): Promise<Report | null> {
  const r = await db.prepare('SELECT * FROM reports WHERE participant_id = ?').bind(pid).first<Record<string, string | number | null>>();
  if (!r) return null;
  return {
    id: String(r.id),
    identity: parse(String(r.identity_json), {}),
    sections: parse(String(r.sections_json), []),
    attachSandbox: Boolean(r.attach_sandbox),
    version: Number(r.version),
    status: r.status as Report['status'],
    submittedAt: (r.submitted_at as string | null) ?? null,
    updatedAt: String(r.updated_at),
  };
}

/** 초안 저장. 버전이 다르면 충돌(409) — 조용히 덮어쓰지 않는다. */
export async function saveReport(db: D1Database, pid: string, input: { identity: unknown; sections: unknown; attachSandbox: boolean; version: number }): Promise<{ ok: true; report: Report } | { ok: false; current: Report }> {
  const now = nowISO();
  const current = await loadReport(db, pid);
  if (current && current.version !== input.version) return { ok: false, current };
  if (!current) {
    const id = uuid();
    await db
      .prepare('INSERT INTO reports (id, participant_id, identity_json, sections_json, attach_sandbox, version, status, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
      .bind(id, pid, JSON.stringify(input.identity ?? {}), JSON.stringify(input.sections ?? []), input.attachSandbox ? 1 : 0, 'draft', now)
      .run();
    return { ok: true, report: (await loadReport(db, pid))! };
  }
  await db
    .prepare('UPDATE reports SET identity_json = ?, sections_json = ?, attach_sandbox = ?, version = version + 1, updated_at = ? WHERE participant_id = ?')
    .bind(JSON.stringify(input.identity ?? {}), JSON.stringify(input.sections ?? []), input.attachSandbox ? 1 : 0, now, pid)
    .run();
  return { ok: true, report: (await loadReport(db, pid))! };
}

export async function submitReport(db: D1Database, pid: string, version: number): Promise<{ ok: true; report: Report } | { ok: false; current: Report | null }> {
  const current = await loadReport(db, pid);
  if (!current || current.version !== version) return { ok: false, current };
  const now = nowISO();
  await db.prepare('UPDATE reports SET status = ?, submitted_at = ?, version = version + 1, updated_at = ? WHERE participant_id = ?').bind('submitted', now, now, pid).run();
  return { ok: true, report: (await loadReport(db, pid))! };
}

export async function loadBadges(db: D1Database, pid: string): Promise<BadgeRecord[]> {
  const rs = await db.prepare('SELECT badge_id, awarded_at FROM badges WHERE participant_id = ?').bind(pid).all<{ badge_id: string; awarded_at: string }>();
  return rs.results.map((r) => ({ badgeId: r.badge_id as BadgeRecord['badgeId'], awardedAt: r.awarded_at }));
}

/** 최초 달성 시 한 번만 지급 */
export async function awardBadge(db: D1Database, pid: string, badgeId: string): Promise<BadgeRecord | null> {
  const now = nowISO();
  const r = await db.prepare('INSERT OR IGNORE INTO badges (participant_id, badge_id, awarded_at) VALUES (?, ?, ?)').bind(pid, badgeId, now).run();
  if (r.meta.changes === 0) return null;
  return { badgeId: badgeId as BadgeRecord['badgeId'], awardedAt: now };
}

export async function loadChallenge(db: D1Database, pid: string): Promise<ObservationChallenge | null> {
  const r = await db.prepare('SELECT * FROM observation_challenges WHERE participant_id = ?').bind(pid).first<Record<string, string | null>>();
  if (!r) return null;
  return {
    candidateDate: String(r.candidate_date),
    predictionDrawingDataUrl: r.prediction_drawing_data_url ?? null,
    predictionNote: r.prediction_note ?? '',
    observed: (r.observed as ObservationChallenge['observed']) ?? null,
    followupNote: r.followup_note ?? '',
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function saveChallenge(db: D1Database, pid: string, ch: Omit<ObservationChallenge, 'createdAt' | 'updatedAt'>) {
  const now = nowISO();
  await db
    .prepare(
      `INSERT INTO observation_challenges (participant_id, candidate_date, prediction_drawing_data_url, prediction_note, observed, followup_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(participant_id) DO UPDATE SET candidate_date = excluded.candidate_date, prediction_drawing_data_url = excluded.prediction_drawing_data_url,
         prediction_note = excluded.prediction_note, observed = excluded.observed, followup_note = excluded.followup_note, updated_at = excluded.updated_at`,
    )
    .bind(pid, ch.candidateDate, ch.predictionDrawingDataUrl, ch.predictionNote, ch.observed, ch.followupNote, now, now)
    .run();
}

export async function loadMediaAssets(db: D1Database, classId: string): Promise<MediaAsset[]> {
  const rs = await db.prepare('SELECT * FROM media_assets WHERE class_id = ? OR class_id IS NULL ORDER BY created_at').bind(classId).all<Record<string, string | number | null>>();
  const teacher: MediaAsset[] = rs.results.map((r) => ({
    id: String(r.id),
    origin: 'teacher',
    classId: (r.class_id as string | null) ?? null,
    kind: r.kind as MediaAsset['kind'],
    category: (r.category as MediaAsset['category']) ?? 'phase',
    title: String(r.title),
    photographer: String(r.photographer ?? ''),
    sourceUrl: (r.source_url as string | null) ?? null,
    takenAt: (r.taken_at as string | null) ?? null,
    takenTz: (r.taken_tz as string | null) ?? null,
    takenUnknown: Boolean(r.taken_unknown),
    region: (r.region as string | null) ?? null,
    processing: (r.processing as string | null) ?? null,
    license: String(r.license ?? ''),
    credit: String(r.credit ?? ''),
    alt: String(r.alt ?? ''),
    useSteps: parse(String(r.use_steps_json ?? '[]'), []),
    src: (r.src as string | null) ?? null,
    createdAt: String(r.created_at),
  }));
  return [...manifestAssets(), ...teacher];
}

export async function participantStats(db: D1Database, classId: string) {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM participants WHERE class_id = ?').bind(classId).first<{ n: number }>();
  return { participants: r?.n ?? 0 };
}
