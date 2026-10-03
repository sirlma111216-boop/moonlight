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

type Row = Record<string, string | number | null>;

function parse<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

/**
 * 관측·스냅숏·모형 기록의 id 는 학생 기기에서 만든다. 같은 값이 여러 학생에게서 올 수 있으므로
 * (예: 'month:서울:2026-9', 's11-a-snapshot') DB 에는 '참여자ID:기기ID' 로 저장해 서로 덮어쓰지 않게 한다.
 */
const dbId = (pid: string, id: string) => `${pid}:${id}`;
const clientId = (r: Row) => {
  const id = String(r.id);
  const prefix = `${String(r.participant_id)}:`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
};

// ── 행 → 도메인 ────────────────────────────────────────────────────────────────

const toResponse = (r: Row): ResponseRecord => ({
  questionId: String(r.question_id),
  stepId: String(r.step_id),
  sceneId: String(r.scene_id),
  first: parse(String(r.first_json), null),
  latest: parse(String(r.latest_json), null),
  hintsUsed: Number(r.hints_used),
  version: Number(r.version),
  updatedAt: String(r.updated_at),
});

const toProgress = (r: Row): ProgressRecord => ({ stepId: String(r.step_id), sceneId: String(r.scene_id), status: r.status as ProgressRecord['status'], updatedAt: String(r.updated_at) });

const toObservation = (r: Row): Observation => ({
  id: clientId(r),
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
});

const toSnapshot = (r: Row): PublicDataSnapshot => ({
  id: clientId(r),
  provider: r.provider as PublicDataSnapshot['provider'],
  request: parse(String(r.request_json), {}),
  baseTime: String(r.base_time),
  raw: parse(String(r.raw_json), null),
  normalized: parse(String(r.normalized_json), null),
  isCached: Boolean(r.is_cached),
  isExample: Boolean(r.is_example),
  sourceUrl: String(r.source_url),
  fetchedAt: String(r.fetched_at),
});

const toAttempt = (r: Row): ModelAttempt => ({
  id: clientId(r),
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
});

const toReport = (r: Row): Report => ({
  id: String(r.id),
  identity: parse(String(r.identity_json), {}),
  sections: parse(String(r.sections_json), []),
  attachSandbox: Boolean(r.attach_sandbox),
  version: Number(r.version),
  status: r.status as Report['status'],
  submittedAt: (r.submitted_at as string | null) ?? null,
  updatedAt: String(r.updated_at),
});

const toBadge = (r: Row): BadgeRecord => ({ badgeId: r.badge_id as BadgeRecord['badgeId'], awardedAt: String(r.awarded_at) });

const toChallenge = (r: Row): ObservationChallenge => ({
  candidateDate: String(r.candidate_date),
  predictionDrawingDataUrl: (r.prediction_drawing_data_url as string | null) ?? null,
  predictionNote: String(r.prediction_note ?? ''),
  observed: (r.observed as ObservationChallenge['observed']) ?? null,
  followupNote: String(r.followup_note ?? ''),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

const toMedia = (r: Row): MediaAsset => ({
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
});

// ── 조회 문 ────────────────────────────────────────────────────────────────────

const stmt = {
  responses: (db: D1Database, pid: string) => db.prepare('SELECT * FROM responses WHERE participant_id = ?').bind(pid),
  progress: (db: D1Database, pid: string) => db.prepare('SELECT step_id, scene_id, status, updated_at FROM progress WHERE participant_id = ?').bind(pid),
  observations: (db: D1Database, pid: string) => db.prepare('SELECT * FROM observations WHERE participant_id = ? ORDER BY created_at').bind(pid),
  snapshots: (db: D1Database, pid: string) => db.prepare('SELECT * FROM public_data_snapshots WHERE participant_id = ? ORDER BY fetched_at').bind(pid),
  attempts: (db: D1Database, pid: string) => db.prepare('SELECT * FROM model_attempts WHERE participant_id = ? ORDER BY created_at').bind(pid),
  report: (db: D1Database, pid: string) => db.prepare('SELECT * FROM reports WHERE participant_id = ?').bind(pid),
  badges: (db: D1Database, pid: string) => db.prepare('SELECT badge_id, awarded_at FROM badges WHERE participant_id = ?').bind(pid),
  challenge: (db: D1Database, pid: string) => db.prepare('SELECT * FROM observation_challenges WHERE participant_id = ?').bind(pid),
  media: (db: D1Database, classId: string) => db.prepare('SELECT * FROM media_assets WHERE class_id = ? OR class_id IS NULL ORDER BY created_at').bind(classId),
};

/** 학생 한 명의 전체 기록 — 9개 조회를 한 번의 묶음(batch)으로 보낸다. */
export async function loadStudentData(db: D1Database, pid: string, classId: string) {
  const [responses, progress, observations, snapshots, attempts, report, badges, challenge, media] = await db.batch<Row>([
    stmt.responses(db, pid),
    stmt.progress(db, pid),
    stmt.observations(db, pid),
    stmt.snapshots(db, pid),
    stmt.attempts(db, pid),
    stmt.report(db, pid),
    stmt.badges(db, pid),
    stmt.challenge(db, pid),
    stmt.media(db, classId),
  ]);
  return {
    responses: responses.results.map(toResponse),
    progress: progress.results.map(toProgress),
    observations: observations.results.map(toObservation),
    snapshots: snapshots.results.map(toSnapshot),
    attempts: attempts.results.map(toAttempt),
    report: report.results[0] ? toReport(report.results[0]) : null,
    badges: badges.results.map(toBadge),
    challenge: challenge.results[0] ? toChallenge(challenge.results[0]) : null,
    mediaAssets: [...manifestAssets(), ...media.results.map(toMedia)],
  };
}

/** 교사 열람용 한 명의 기록 — 한 번의 묶음 조회 */
export async function loadFullRecord(db: D1Database, pid: string) {
  const [report, responses, observations, snapshots, attempts] = await db.batch<Row>([stmt.report(db, pid), stmt.responses(db, pid), stmt.observations(db, pid), stmt.snapshots(db, pid), stmt.attempts(db, pid)]);
  return {
    report: report.results[0] ? toReport(report.results[0]) : null,
    responses: responses.results.map(toResponse),
    observations: observations.results.map(toObservation),
    snapshots: snapshots.results.map(toSnapshot),
    attempts: attempts.results.map(toAttempt),
  };
}

export async function loadReport(db: D1Database, pid: string): Promise<Report | null> {
  const r = await stmt.report(db, pid).first<Row>();
  return r ? toReport(r) : null;
}

export async function loadMediaAssets(db: D1Database, classId: string): Promise<MediaAsset[]> {
  const rs = await stmt.media(db, classId).all<Row>();
  return [...manifestAssets(), ...rs.results.map(toMedia)];
}

// ── 쓰기 ──────────────────────────────────────────────────────────────────────

/** 응답 저장 — 처음 답(first)은 보존하고 최신 답만 바꾼다. 한 문장(UPSERT … RETURNING). */
export async function upsertResponse(
  db: D1Database,
  pid: string,
  input: { questionId: string; stepId: string; sceneId: string; value: unknown; hintsUsed?: number },
): Promise<ResponseRecord> {
  const now = nowISO();
  const json = JSON.stringify(input.value ?? null);
  const row = await db
    .prepare(
      `INSERT INTO responses (id, participant_id, step_id, scene_id, question_id, first_json, latest_json, hints_used, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(participant_id, question_id) DO UPDATE SET
         latest_json = excluded.latest_json,
         version = responses.version + 1,
         hints_used = MAX(responses.hints_used, excluded.hints_used),
         updated_at = excluded.updated_at,
         step_id = excluded.step_id,
         scene_id = excluded.scene_id
       RETURNING first_json, version, hints_used`,
    )
    .bind(uuid(), pid, input.stepId, input.sceneId, input.questionId, json, json, input.hintsUsed ?? 0, now, now)
    .first<{ first_json: string; version: number; hints_used: number }>();
  return {
    questionId: input.questionId,
    stepId: input.stepId,
    sceneId: input.sceneId,
    first: parse(row?.first_json, input.value),
    latest: input.value,
    hintsUsed: row?.hints_used ?? input.hintsUsed ?? 0,
    version: row?.version ?? 1,
    updatedAt: now,
  };
}

/** 진행 상태는 뒤로 내려가지 않는다(완료 → 방문으로 되돌리지 않음). 한 문장으로 처리. */
export async function upsertProgress(db: D1Database, pid: string, stepId: string, sceneId: string, status: ProgressRecord['status']) {
  const rank = `CASE %s WHEN 'completed' THEN 2 WHEN 'answered' THEN 1 ELSE 0 END`;
  await db
    .prepare(
      `INSERT INTO progress (participant_id, step_id, scene_id, status, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(participant_id, step_id, scene_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
       WHERE ${rank.replace('%s', 'excluded.status')} > ${rank.replace('%s', 'progress.status')}`,
    )
    .bind(pid, stepId, sceneId, status, nowISO())
    .run();
}

export async function saveObservation(db: D1Database, pid: string, o: Omit<Observation, 'createdAt'>): Promise<Observation> {
  const now = nowISO();
  await db
    .prepare(
      `INSERT INTO observations (id, participant_id, source_type, media_asset_id, date, time, time_known, region, drawing_data_url, bright_description, direction, weather, confidence, photo_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET source_type = excluded.source_type, media_asset_id = excluded.media_asset_id, date = excluded.date, time = excluded.time, time_known = excluded.time_known,
         region = excluded.region, drawing_data_url = excluded.drawing_data_url, bright_description = excluded.bright_description, direction = excluded.direction, weather = excluded.weather,
         confidence = excluded.confidence, photo_key = excluded.photo_key
       WHERE observations.participant_id = excluded.participant_id`,
    )
    .bind(dbId(pid, o.id), pid, o.sourceType, o.mediaAssetId ?? null, o.date, o.time, o.timeKnown ? 1 : 0, o.region, o.drawingDataUrl ?? null, o.brightDescription, o.direction ?? null, o.weather ?? null, o.confidence, o.photoKey ?? null, now)
    .run();
  return { ...o, createdAt: now };
}

export async function deleteObservation(db: D1Database, pid: string, id: string) {
  await db.prepare('DELETE FROM observations WHERE participant_id = ? AND id = ?').bind(pid, dbId(pid, id)).run();
}

export async function saveSnapshot(db: D1Database, pid: string, s: PublicDataSnapshot) {
  await db
    .prepare(
      `INSERT INTO public_data_snapshots (id, participant_id, provider, request_json, base_time, raw_json, normalized_json, is_cached, is_example, source_url, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET request_json = excluded.request_json, base_time = excluded.base_time, raw_json = excluded.raw_json, normalized_json = excluded.normalized_json,
         is_cached = excluded.is_cached, is_example = excluded.is_example, source_url = excluded.source_url, fetched_at = excluded.fetched_at
       WHERE public_data_snapshots.participant_id = excluded.participant_id`,
    )
    .bind(dbId(pid, s.id), pid, s.provider, JSON.stringify(s.request), s.baseTime, JSON.stringify(s.raw ?? null), JSON.stringify(s.normalized ?? null), s.isCached ? 1 : 0, s.isExample ? 1 : 0, s.sourceUrl, s.fetchedAt)
    .run();
}

export async function saveAttempt(db: D1Database, pid: string, a: Omit<ModelAttempt, 'createdAt'>): Promise<ModelAttempt> {
  const now = nowISO();
  await db
    .prepare(
      `INSERT INTO model_attempts (id, participant_id, step_id, scene_id, mode, target_source, target_json, state_json, submitted, result_json, hints_used, is_sandbox, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, submitted = excluded.submitted, result_json = excluded.result_json, hints_used = excluded.hints_used, target_json = excluded.target_json
       WHERE model_attempts.participant_id = excluded.participant_id`,
    )
    .bind(dbId(pid, a.id), pid, a.stepId, a.sceneId, a.mode, a.targetSource, JSON.stringify(a.target ?? null), JSON.stringify(a.state), a.submitted ? 1 : 0, JSON.stringify(a.result ?? null), a.hintsUsed, a.isSandbox ? 1 : 0, now)
    .run();
  return { ...a, createdAt: now };
}

/** 초안 저장. 버전이 다르면 충돌 — 조용히 덮어쓰지 않는다. 버전 확인과 갱신을 한 문장으로 한다. */
export async function saveReport(
  db: D1Database,
  pid: string,
  input: { identity: unknown; sections: unknown; attachSandbox: boolean; version: number },
): Promise<{ ok: true; report: Report } | { ok: false; current: Report }> {
  const now = nowISO();
  const identity = JSON.stringify(input.identity ?? {});
  const sections = JSON.stringify(input.sections ?? []);
  const updated = await db
    .prepare('UPDATE reports SET identity_json = ?, sections_json = ?, attach_sandbox = ?, version = version + 1, updated_at = ? WHERE participant_id = ? AND version = ? RETURNING *')
    .bind(identity, sections, input.attachSandbox ? 1 : 0, now, pid, input.version)
    .first<Row>();
  if (updated) return { ok: true, report: toReport(updated) };
  const inserted = await db
    .prepare(`INSERT INTO reports (id, participant_id, identity_json, sections_json, attach_sandbox, version, status, updated_at) VALUES (?, ?, ?, ?, ?, 1, 'draft', ?) ON CONFLICT(participant_id) DO NOTHING RETURNING *`)
    .bind(uuid(), pid, identity, sections, input.attachSandbox ? 1 : 0, now)
    .first<Row>();
  if (inserted) return { ok: true, report: toReport(inserted) };
  return { ok: false, current: (await loadReport(db, pid))! };
}

export async function submitReport(db: D1Database, pid: string, version: number): Promise<{ ok: true; report: Report } | { ok: false; current: Report | null }> {
  const now = nowISO();
  const row = await db
    .prepare(`UPDATE reports SET status = 'submitted', submitted_at = ?, version = version + 1, updated_at = ? WHERE participant_id = ? AND version = ? RETURNING *`)
    .bind(now, now, pid, version)
    .first<Row>();
  if (row) return { ok: true, report: toReport(row) };
  return { ok: false, current: await loadReport(db, pid) };
}

/** 최초 달성 시 한 번만 지급 */
export async function awardBadge(db: D1Database, pid: string, badgeId: string): Promise<BadgeRecord | null> {
  const now = nowISO();
  const r = await db.prepare('INSERT OR IGNORE INTO badges (participant_id, badge_id, awarded_at) VALUES (?, ?, ?)').bind(pid, badgeId, now).run();
  if (r.meta.changes === 0) return null;
  return { badgeId: badgeId as BadgeRecord['badgeId'], awardedAt: now };
}

export async function saveChallenge(db: D1Database, pid: string, ch: Omit<ObservationChallenge, 'createdAt' | 'updatedAt'>): Promise<ObservationChallenge | null> {
  const now = nowISO();
  const row = await db
    .prepare(
      `INSERT INTO observation_challenges (participant_id, candidate_date, prediction_drawing_data_url, prediction_note, observed, followup_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(participant_id) DO UPDATE SET candidate_date = excluded.candidate_date, prediction_drawing_data_url = excluded.prediction_drawing_data_url,
         prediction_note = excluded.prediction_note, observed = excluded.observed, followup_note = excluded.followup_note, updated_at = excluded.updated_at
       RETURNING *`,
    )
    .bind(pid, ch.candidateDate, ch.predictionDrawingDataUrl, ch.predictionNote, ch.observed, ch.followupNote, now, now)
    .first<Row>();
  return row ? toChallenge(row) : null;
}

export async function participantStats(db: D1Database, classId: string) {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM participants WHERE class_id = ?').bind(classId).first<{ n: number }>();
  return { participants: r?.n ?? 0 };
}
