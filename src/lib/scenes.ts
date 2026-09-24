import type { LessonMode, ProgressRecord, StudentBundle } from '@shared/types';
import type { StepId } from '@shared/questionIds';
import { PERIODS, STEPS, scenesFor, type SceneDef, type StepDef } from '@/content/steps';

export interface SceneRef {
  step: StepDef;
  scene: SceneDef;
  index: number;
  total: number;
}

export function flatScenes(mode: LessonMode): { step: StepDef; scene: SceneDef }[] {
  const out: { step: StepDef; scene: SceneDef }[] = [];
  for (const step of STEPS) for (const scene of scenesFor(step, mode)) out.push({ step, scene });
  return out;
}

export function findScene(mode: LessonMode, stepId: string, sceneId: string): SceneRef | null {
  const step = STEPS.find((s) => s.id === stepId);
  if (!step) return null;
  const scenes = scenesFor(step, mode);
  const index = scenes.findIndex((s) => s.id === sceneId);
  if (index < 0) return null;
  return { step, scene: scenes[index], index, total: scenes.length };
}

export function firstSceneOf(mode: LessonMode, stepId: string): SceneDef | null {
  const step = STEPS.find((s) => s.id === stepId);
  return step ? (scenesFor(step, mode)[0] ?? null) : null;
}

export type NavTarget = { kind: 'scene'; stepId: string; sceneId: string } | { kind: 'period-outro'; period: number } | { kind: 'period-intro'; period: number } | { kind: 'end' };

export function nextTarget(mode: LessonMode, stepId: string, sceneId: string): NavTarget {
  const ref = findScene(mode, stepId, sceneId);
  if (!ref) return { kind: 'end' };
  const scenes = scenesFor(ref.step, mode);
  if (ref.index + 1 < scenes.length) return { kind: 'scene', stepId, sceneId: scenes[ref.index + 1].id };
  // 단계 끝: 차시의 마지막 단계면 차시 마무리로
  const period = PERIODS[mode].find((p) => p.steps.includes(stepId as StepId))!;
  const pi = period.steps.indexOf(stepId as StepId);
  if (pi + 1 < period.steps.length) {
    const ns = period.steps[pi + 1];
    return { kind: 'scene', stepId: ns, sceneId: firstSceneOf(mode, ns)!.id };
  }
  return { kind: 'period-outro', period: period.number };
}

export function prevTarget(mode: LessonMode, stepId: string, sceneId: string): NavTarget {
  const ref = findScene(mode, stepId, sceneId);
  if (!ref) return { kind: 'end' };
  const scenes = scenesFor(ref.step, mode);
  if (ref.index > 0) return { kind: 'scene', stepId, sceneId: scenes[ref.index - 1].id };
  const period = PERIODS[mode].find((p) => p.steps.includes(stepId as StepId))!;
  const pi = period.steps.indexOf(stepId as StepId);
  if (pi > 0) {
    const ps = period.steps[pi - 1];
    const pss = scenesFor(STEPS.find((s) => s.id === ps)!, mode);
    return { kind: 'scene', stepId: ps, sceneId: pss[pss.length - 1].id };
  }
  return { kind: 'period-intro', period: period.number };
}

export function sceneStatus(progress: ProgressRecord[], stepId: string, sceneId: string): ProgressRecord['status'] | 'none' {
  return progress.find((p) => p.stepId === stepId && p.sceneId === sceneId)?.status ?? 'none';
}

/** 단계 완료 = 선택이 아닌 모든 장면이 completed */
export function stepStatus(bundle: StudentBundle, step: StepDef): 'none' | 'visited' | 'partial' | 'completed' {
  const scenes = scenesFor(step, bundle.classSession.mode).filter((s) => !s.optional);
  const statuses = scenes.map((s) => sceneStatus(bundle.progress, step.id, s.id));
  if (statuses.every((s) => s === 'completed')) return 'completed';
  if (statuses.some((s) => s === 'completed' || s === 'answered')) return 'partial';
  if (statuses.some((s) => s !== 'none')) return 'visited';
  return 'none';
}

export function stepOpen(bundle: StudentBundle, stepId: string): boolean {
  return bundle.classSession.settings.openSteps.includes(stepId);
}

export function periodProgress(bundle: StudentBundle, periodNumber: number) {
  const period = PERIODS[bundle.classSession.mode].find((p) => p.number === periodNumber)!;
  return period.steps.map((sid) => ({ step: STEPS.find((s) => s.id === sid)!, status: stepStatus(bundle, STEPS.find((s) => s.id === sid)!) }));
}

/** 이어 할 위치: 완료되지 않은 첫 장면 */
export function resumeTarget(bundle: StudentBundle): { stepId: string; sceneId: string } {
  const mode = bundle.classSession.mode;
  for (const { step, scene } of flatScenes(mode)) {
    if (scene.optional) continue;
    if (!stepOpen(bundle, step.id)) continue;
    if (sceneStatus(bundle.progress, step.id, scene.id) !== 'completed') return { stepId: step.id, sceneId: scene.id };
  }
  const last = flatScenes(mode).at(-1)!;
  return { stepId: last.step.id, sceneId: last.scene.id };
}
