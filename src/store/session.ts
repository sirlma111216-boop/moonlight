import { create } from 'zustand';
import type {
  BadgeRecord,
  ModelAttempt,
  Observation,
  ObservationChallenge,
  ProgressRecord,
  ProgressStatus,
  PublicDataSnapshot,
  Report,
  ResponseRecord,
  SaveState,
  StudentBundle,
} from '@shared/types';
import type { MonthDataResponse } from '@shared/publicdata';
import { api, ApiError } from '@/lib/api';

/**
 * 학생 학습 기록 저장소.
 *  - 모든 변경은 화면에 즉시 반영(낙관적)하고 저장 큐를 통해 서버에 보낸다.
 *  - 저장 중/저장됨/연결 끊김/다시 시도 상태를 구분한다(원문 10절).
 *  - 마지막 번들을 localStorage 에 미러링해 새로고침·일시적 연결 끊김 뒤에도 이어 볼 수 있다.
 */

type Job = { key: string; run: () => Promise<void>; attempts: number };

interface SessionStore {
  status: 'loading' | 'anonymous' | 'joined';
  bundle: StudentBundle | null;
  save: SaveState;
  lastError: string | null;
  monthData: Record<string, MonthDataResponse>;
  monthLoading: Record<string, boolean>;
  toast: { text: string; kind: 'badge' | 'info' } | null;

  bootstrap(): Promise<void>;
  join(code: string): Promise<void>;
  recover(code: string, key: string): Promise<void>;
  leave(): Promise<void>;
  retrySaves(): void;
  showToast(text: string, kind?: 'badge' | 'info'): void;

  getResponse(questionId: string): ResponseRecord | undefined;
  respond(questionId: string, stepId: string, sceneId: string, value: unknown, hintsUsed?: number): void;
  markProgress(stepId: string, sceneId: string, status: ProgressStatus): void;
  saveObservation(obs: Omit<Observation, 'createdAt'>): Promise<void>;
  deleteObservation(id: string): Promise<void>;
  saveSnapshot(snap: PublicDataSnapshot): void;
  saveAttempt(a: Omit<ModelAttempt, 'createdAt'>): void;
  saveReport(input: { identity: Report['identity']; sections: Report['sections']; attachSandbox: boolean }): Promise<{ ok: boolean; conflict?: Report | null }>;
  submitReport(): Promise<{ ok: boolean; conflict?: Report | null }>;
  awardBadge(badgeId: BadgeRecord['badgeId']): Promise<void>;
  saveChallenge(ch: Omit<ObservationChallenge, 'createdAt' | 'updatedAt'>): Promise<void>;
  issueRecoveryKey(): Promise<string>;
  loadMonth(region: string, year: number, month: number): Promise<MonthDataResponse>;
}

const MIRROR_KEY = 'ml:bundle';

function mirror(bundle: StudentBundle | null) {
  try {
    if (bundle) localStorage.setItem(MIRROR_KEY, JSON.stringify(bundle));
    else localStorage.removeItem(MIRROR_KEY);
  } catch {
    /* 저장 공간 부족 등 */
  }
}
function readMirror(): StudentBundle | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    return raw ? (JSON.parse(raw) as StudentBundle) : null;
  } catch {
    return null;
  }
}

const RANK: Record<ProgressStatus, number> = { visited: 0, answered: 1, completed: 2 };

let queue: Job[] = [];
let running = false;

export const useSession = create<SessionStore>((set, get) => {
  function patchBundle(fn: (b: StudentBundle) => StudentBundle) {
    const b = get().bundle;
    if (!b) return;
    const nb = fn(b);
    set({ bundle: nb });
    mirror(nb);
  }

  async function drain() {
    if (running) return;
    running = true;
    while (queue.length) {
      const job = queue[0];
      set({ save: { ...get().save, status: 'saving', pending: queue.length } });
      try {
        await job.run();
        queue.shift();
        set({ save: { status: queue.length ? 'saving' : 'saved', lastSavedAt: new Date().toISOString(), pending: queue.length }, lastError: null });
      } catch (e) {
        job.attempts++;
        const offline = e instanceof ApiError && e.status === 0;
        if (e instanceof ApiError && e.status === 401) {
          queue = [];
          set({ status: 'anonymous', bundle: null, save: { status: 'error', lastSavedAt: get().save.lastSavedAt, pending: 0 }, lastError: '세션이 끝났어요. 수업 코드로 다시 입장해 주세요.' });
          break;
        }
        if (job.attempts >= 4 || (!offline && e instanceof ApiError && e.status >= 400 && e.status < 500)) {
          // 서버가 거부한 요청은 큐에서 빼고 사용자에게 알린다
          queue.shift();
          set({ save: { ...get().save, status: 'error', pending: queue.length }, lastError: e instanceof Error ? e.message : String(e) });
          continue;
        }
        set({ save: { ...get().save, status: offline ? 'offline' : 'error', pending: queue.length }, lastError: e instanceof Error ? e.message : String(e) });
        running = false;
        // 재시도는 지수 대기 뒤
        setTimeout(() => drain(), Math.min(30_000, 1500 * 2 ** job.attempts));
        return;
      }
    }
    running = false;
  }

  function enqueue(key: string, run: () => Promise<void>) {
    // 같은 키의 미실행 작업은 마지막 것으로 합친다(예: 같은 문항 연속 입력)
    queue = queue.filter((j, i) => !(j.key === key && i > 0));
    queue.push({ key, run, attempts: 0 });
    void drain();
  }

  return {
    status: 'loading',
    bundle: null,
    save: { status: 'idle', lastSavedAt: null, pending: 0 },
    lastError: null,
    monthData: {},
    monthLoading: {},
    toast: null,

    async bootstrap() {
      try {
        const data = await api<StudentBundle | { session: null }>('/api/student/me');
        if ('session' in data && data.session === null) {
          set({ status: 'anonymous', bundle: null });
          mirror(null);
          return;
        }
        const b = data as StudentBundle;
        set({ status: 'joined', bundle: b, save: { status: 'saved', lastSavedAt: null, pending: 0 } });
        mirror(b);
      } catch (e) {
        const m = readMirror();
        if (m && e instanceof ApiError && e.status === 0) {
          set({ status: 'joined', bundle: m, save: { status: 'offline', lastSavedAt: null, pending: 0 }, lastError: '연결이 끊겨 마지막 저장본을 보여줘요.' });
        } else {
          set({ status: 'anonymous', bundle: null });
        }
      }
    },

    async join(code) {
      const b = await api<StudentBundle>('/api/student/join', { method: 'POST', body: { code } });
      set({ status: 'joined', bundle: b, save: { status: 'saved', lastSavedAt: null, pending: 0 }, lastError: null });
      mirror(b);
    },

    async recover(code, key) {
      const b = await api<StudentBundle>('/api/student/recover', { method: 'POST', body: { code, key } });
      set({ status: 'joined', bundle: b, save: { status: 'saved', lastSavedAt: null, pending: 0 }, lastError: null });
      mirror(b);
    },

    async leave() {
      try {
        await api('/api/student/leave', { method: 'POST', body: {} });
      } catch {
        /* 오프라인이어도 로컬은 정리 */
      }
      queue = [];
      mirror(null);
      try {
        localStorage.removeItem('ml:draft');
      } catch {
        /* noop */
      }
      set({ status: 'anonymous', bundle: null, monthData: {}, save: { status: 'idle', lastSavedAt: null, pending: 0 } });
    },

    retrySaves() {
      for (const j of queue) j.attempts = 0;
      void drain();
    },

    showToast(text, kind = 'info') {
      set({ toast: { text, kind } });
      setTimeout(() => set((s) => (s.toast?.text === text ? { toast: null } : {})), 4200);
    },

    getResponse(questionId) {
      return get().bundle?.responses.find((r) => r.questionId === questionId);
    },

    respond(questionId, stepId, sceneId, value, hintsUsed = 0) {
      const now = new Date().toISOString();
      patchBundle((b) => {
        const idx = b.responses.findIndex((r) => r.questionId === questionId);
        const responses = [...b.responses];
        if (idx >= 0) {
          const prev = responses[idx];
          responses[idx] = { ...prev, latest: value, hintsUsed: Math.max(prev.hintsUsed, hintsUsed), version: prev.version + 1, updatedAt: now };
        } else {
          responses.push({ questionId, stepId, sceneId, first: value, latest: value, hintsUsed, version: 1, updatedAt: now });
        }
        return { ...b, responses };
      });
      get().markProgress(stepId, sceneId, 'answered');
      enqueue(`resp:${questionId}`, async () => {
        const rec = await api<ResponseRecord>('/api/student/responses', { method: 'POST', body: { questionId, stepId, sceneId, value, hintsUsed } });
        patchBundle((b) => ({ ...b, responses: b.responses.map((r) => (r.questionId === questionId ? { ...rec, latest: r.latest, version: Math.max(r.version, rec.version) } : r)) }));
      });
    },

    markProgress(stepId, sceneId, status) {
      const b = get().bundle;
      if (!b) return;
      const existing = b.progress.find((p) => p.stepId === stepId && p.sceneId === sceneId);
      if (existing && RANK[existing.status] >= RANK[status]) return;
      const now = new Date().toISOString();
      patchBundle((bb) => {
        const progress: ProgressRecord[] = bb.progress.filter((p) => !(p.stepId === stepId && p.sceneId === sceneId));
        progress.push({ stepId, sceneId, status, updatedAt: now });
        return { ...bb, progress };
      });
      enqueue(`prog:${stepId}:${sceneId}`, () => api('/api/student/progress', { method: 'POST', body: { stepId, sceneId, status } }).then(() => undefined));
    },

    async saveObservation(obs) {
      patchBundle((b) => {
        const list = b.observations.filter((o) => o.id !== obs.id);
        list.push({ ...obs, createdAt: new Date().toISOString() });
        return { ...b, observations: list };
      });
      enqueue(`obs:${obs.id}`, async () => {
        const saved = await api<Observation>('/api/student/observations', { method: 'POST', body: obs });
        patchBundle((b) => ({ ...b, observations: b.observations.map((o) => (o.id === saved.id ? saved : o)) }));
      });
    },

    async deleteObservation(id) {
      patchBundle((b) => ({ ...b, observations: b.observations.filter((o) => o.id !== id) }));
      enqueue(`obsdel:${id}`, () => api(`/api/student/observations/${id}`, { method: 'DELETE' }).then(() => undefined));
    },

    saveSnapshot(snap) {
      patchBundle((b) => ({ ...b, snapshots: [...b.snapshots.filter((s) => s.id !== snap.id), snap] }));
      enqueue(`snap:${snap.id}`, () => api('/api/student/snapshots', { method: 'POST', body: snap }).then(() => undefined));
    },

    saveAttempt(a) {
      patchBundle((b) => ({ ...b, attempts: [...b.attempts.filter((x) => x.id !== a.id), { ...a, createdAt: new Date().toISOString() }] }));
      enqueue(`att:${a.id}`, () => api('/api/student/attempts', { method: 'POST', body: a }).then(() => undefined));
    },

    async saveReport(input) {
      const b = get().bundle;
      if (!b) return { ok: false };
      const version = b.report?.version ?? 0;
      set({ save: { ...get().save, status: 'saving' } });
      try {
        const r = await api<Report>('/api/student/report', { method: 'PUT', body: { ...input, version } });
        patchBundle((bb) => ({ ...bb, report: r }));
        set({ save: { status: 'saved', lastSavedAt: new Date().toISOString(), pending: queue.length } });
        return { ok: true };
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const cur = (e.body as { current?: Report })?.current ?? null;
          set({ save: { ...get().save, status: 'error' }, lastError: '다른 곳에서 저장한 보고서 버전이 있어요. 내용을 확인한 뒤 다시 저장해 주세요.' });
          return { ok: false, conflict: cur };
        }
        set({ save: { ...get().save, status: e instanceof ApiError && e.status === 0 ? 'offline' : 'error' }, lastError: e instanceof Error ? e.message : String(e) });
        return { ok: false };
      }
    },

    async submitReport() {
      const b = get().bundle;
      if (!b?.report) return { ok: false };
      try {
        const r = await api<Report>('/api/student/report/submit', { method: 'POST', body: { version: b.report.version } });
        patchBundle((bb) => ({ ...bb, report: r }));
        return { ok: true };
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const cur = (e.body as { current?: Report })?.current ?? null;
          if (cur) patchBundle((bb) => ({ ...bb, report: cur }));
          return { ok: false, conflict: cur };
        }
        set({ lastError: e instanceof Error ? e.message : String(e) });
        return { ok: false };
      }
    },

    async awardBadge(badgeId) {
      const b = get().bundle;
      if (!b || b.badges.some((x) => x.badgeId === badgeId)) return;
      try {
        const r = await api<{ awarded: BadgeRecord | null }>('/api/student/badges', { method: 'POST', body: { badgeId } });
        if (r.awarded) {
          patchBundle((bb) => ({ ...bb, badges: [...bb.badges, r.awarded!] }));
          const { BADGES } = await import('@/content/badges');
          get().showToast(`배지 획득: ${BADGES[badgeId].title}`, 'badge');
        }
      } catch {
        /* 배지는 학습 진행에 영향 없음 */
      }
    },

    async saveChallenge(ch) {
      patchBundle((b) => ({ ...b, challenge: { ...ch, createdAt: b.challenge?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() } }));
      enqueue('challenge', () => api('/api/student/challenge', { method: 'PUT', body: ch }).then(() => undefined));
    },

    async issueRecoveryKey() {
      const r = await api<{ key: string }>('/api/student/recovery-key', { method: 'POST', body: {} });
      return r.key;
    },

    async loadMonth(region, year, month) {
      const key = `${region}:${year}-${month}`;
      const cached = get().monthData[key];
      if (cached) return cached;
      set((s) => ({ monthLoading: { ...s.monthLoading, [key]: true } }));
      try {
        const data = await api<MonthDataResponse>(`/api/publicdata/month?region=${encodeURIComponent(region)}&year=${year}&month=${month}`);
        set((s) => ({ monthData: { ...s.monthData, [key]: data } }));
        return data;
      } finally {
        set((s) => ({ monthLoading: { ...s.monthLoading, [key]: false } }));
      }
    },
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useSession.getState().retrySaves());
}
