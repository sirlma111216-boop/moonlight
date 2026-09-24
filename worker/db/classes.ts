import type { ClassSession, ClassSettings, LessonMode } from '@shared/types';
import { STEP_IDS } from '@shared/questionIds';

export const DEFAULT_SETTINGS: ClassSettings = {
  identityFields: { name: true, grade: true, classNo: true, number: true },
  photoUploadEnabled: false,
  periodMinutes: 45,
  videos: { 'video-phases-shadows': false, 'video-solar-role': false, 'video-lunar': false },
  openSteps: [...STEP_IDS],
  observationWindow: { start: '19:00', end: '21:00' },
};

interface ClassRow {
  id: string;
  code: string;
  title: string;
  mode: string;
  region: string;
  period_start: string;
  period_end: string;
  settings_json: string;
  retention_days: number;
  teacher_id: string;
  created_at: string;
  expires_at: string | null;
  archived_at: string | null;
  ended_at: string | null;
}

export function rowToClass(r: ClassRow): ClassSession & { teacherId: string; endedAt: string | null } {
  let settings: ClassSettings = DEFAULT_SETTINGS;
  try {
    settings = { ...DEFAULT_SETTINGS, ...(JSON.parse(r.settings_json) as Partial<ClassSettings>) };
  } catch {
    /* 기본값 유지 */
  }
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    mode: r.mode as LessonMode,
    region: r.region,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    settings,
    retentionDays: r.retention_days,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    archivedAt: r.archived_at,
    teacherId: r.teacher_id,
    endedAt: r.ended_at,
  };
}

export async function getClassByCode(db: D1Database, code: string) {
  const r = await db.prepare('SELECT * FROM class_sessions WHERE code = ?').bind(code).first<ClassRow>();
  return r ? rowToClass(r) : null;
}

export async function getClassById(db: D1Database, id: string) {
  const r = await db.prepare('SELECT * FROM class_sessions WHERE id = ?').bind(id).first<ClassRow>();
  return r ? rowToClass(r) : null;
}

export async function listClassesForTeacher(db: D1Database, teacherId: string) {
  const rs = await db.prepare('SELECT * FROM class_sessions WHERE teacher_id = ? ORDER BY created_at DESC').bind(teacherId).all<ClassRow>();
  return rs.results.map(rowToClass);
}

export function sanitizeSettings(input: unknown): ClassSettings {
  const s = (input ?? {}) as Partial<ClassSettings>;
  const idf = s.identityFields ?? DEFAULT_SETTINGS.identityFields;
  const openSteps = Array.isArray(s.openSteps) ? s.openSteps.filter((x): x is string => typeof x === 'string' && (STEP_IDS as readonly string[]).includes(x)) : DEFAULT_SETTINGS.openSteps;
  const videos: Record<string, boolean> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS.videos)) videos[k] = Boolean(s.videos?.[k]);
  const win = s.observationWindow ?? DEFAULT_SETTINGS.observationWindow;
  const hhmm = (v: unknown, d: string) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : d);
  return {
    identityFields: {
      name: Boolean(idf.name),
      grade: Boolean(idf.grade),
      classNo: Boolean(idf.classNo),
      number: Boolean(idf.number),
    },
    photoUploadEnabled: Boolean(s.photoUploadEnabled),
    periodMinutes: Math.min(90, Math.max(30, Number(s.periodMinutes) || 45)),
    videos,
    openSteps,
    observationWindow: { start: hhmm(win.start, '19:00'), end: hhmm(win.end, '21:00') },
  };
}
