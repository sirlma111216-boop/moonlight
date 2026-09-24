import type { ClassSession, ClassSettings, MediaAsset } from '@shared/types';
import { api } from '@/lib/api';

export type TeacherClass = ClassSession & { teacherId: string; endedAt: string | null; stats?: { participants: number } };

export const teacherApi = {
  authModes: () => api<{ modes: string[] }>('/api/teacher/auth-modes'),
  me: () => api<{ teacher: { teacherId: string; mode: string } | null }>('/api/teacher/me'),
  login: (body: { mode: string; key?: string }) => api<{ teacherId: string; mode: string }>('/api/teacher/login', { method: 'POST', body }),
  logout: () => api('/api/teacher/logout', { method: 'POST', body: {} }),
  classes: () => api<TeacherClass[]>('/api/teacher/classes'),
  createClass: (body: Partial<{ title: string; mode: string; region: string; periodStart: string; periodEnd: string; settings: ClassSettings; retentionDays: number }>) => api<TeacherClass>('/api/teacher/classes', { method: 'POST', body }),
  getClass: (id: string) => api<TeacherClass>(`/api/teacher/classes/${id}`),
  updateClass: (id: string, body: Partial<{ title: string; mode: string; region: string; periodStart: string; periodEnd: string; settings: ClassSettings; retentionDays: number }>) => api<TeacherClass>(`/api/teacher/classes/${id}`, { method: 'PUT', body }),
  regenerateCode: (id: string) => api<{ code: string }>(`/api/teacher/classes/${id}/regenerate-code`, { method: 'POST', body: {} }),
  endClass: (id: string) => api<TeacherClass>(`/api/teacher/classes/${id}/end`, { method: 'POST', body: {} }),
  deleteClass: (id: string) => api(`/api/teacher/classes/${id}`, { method: 'DELETE' }),
  aggregate: (id: string) => api<AggregateResponse>(`/api/teacher/classes/${id}/aggregate`),
  changeTable: (id: string) => api<{ rows: { tag: string; identity: { name?: string } | null; answers: Record<string, { first: unknown; latest: unknown }> }[] }>(`/api/teacher/classes/${id}/change-table`),
  narratives: (id: string) => api<{ items: { tag: string; questionId: string; value: unknown; updatedAt: string }[] }>(`/api/teacher/classes/${id}/narratives`),
  reports: (id: string) => api<{ items: { participantId: string; tag: string; status: string | null; identity: { name?: string; grade?: string; classNo?: string; number?: string } | null; submittedAt: string | null; updatedAt: string | null; version: number | null }[] }>(`/api/teacher/classes/${id}/reports`),
  report: (id: string, pid: string) => api<Record<string, unknown>>(`/api/teacher/classes/${id}/reports/${pid}`),
  deleteReport: (id: string, pid: string) => api(`/api/teacher/classes/${id}/reports/${pid}`, { method: 'DELETE' }),
  media: (id: string) => api<{ assets: MediaAsset[]; readiness: { phasePhotos: number; phaseReady: boolean; solarPhoto: boolean; lunarPhoto: boolean; manifestPlaceholders: number } }>(`/api/teacher/classes/${id}/media`),
  addMedia: (id: string, body: Partial<MediaAsset>) => api<{ id: string }>(`/api/teacher/classes/${id}/media`, { method: 'POST', body }),
  updateMedia: (id: string, mid: string, body: Partial<MediaAsset>) => api(`/api/teacher/classes/${id}/media/${mid}`, { method: 'PUT', body }),
  deleteMedia: (id: string, mid: string) => api(`/api/teacher/classes/${id}/media/${mid}`, { method: 'DELETE' }),
  apiStatus: () => api<ApiStatusResponse>('/api/teacher/api-status'),
  apiCheck: () => api<{ results: { provider: string; ok: boolean; message: string; sample?: unknown }[] }>('/api/teacher/api-status/check', { method: 'POST', body: {} }),
  cleanup: () => api<Record<string, number | string>>('/api/teacher/cleanup', { method: 'POST', body: {} }),
};

export interface AggregateResponse {
  generatedAt: string;
  participants: number;
  q01: Record<string, number>;
  q02: Record<string, { correct: number; incorrect: number; answered: number }>;
  q08: Record<string, number>;
  q09: Record<string, Record<string, number>>;
  q12: Record<string, number>;
  steps: Record<string, { started: number; completedAny: number; completedScenes: number }>;
  reports: Record<string, number>;
}

export interface ApiStatusResponse {
  kasiKeyConfigured: boolean;
  r2Configured: boolean;
  accessConfigured: boolean;
  lastLunarCheck: { ok: boolean; at: string; message: string; sample: unknown } | null;
  lastRiseSetCheck: { ok: boolean; at: string; message: string; sample: unknown } | null;
  cacheRows: number;
}
