import { useCallback, useEffect } from 'react';
import { useSession } from '@/store/session';

/**
 * 장면 진행 기록: 진입 시 '방문함', 응답 시 '답변 저장됨'(문항 컴포넌트가 처리), 조건 충족 시 '활동 완료'.
 * 나중 단계를 눌렀다고 이전 단계가 완료되지 않는다.
 */
export function useScene(stepId: string, sceneId: string) {
  const markProgress = useSession((s) => s.markProgress);
  useEffect(() => {
    markProgress(stepId, sceneId, 'visited');
  }, [markProgress, stepId, sceneId]);
  const complete = useCallback(() => markProgress(stepId, sceneId, 'completed'), [markProgress, stepId, sceneId]);
  const answered = useCallback(() => markProgress(stepId, sceneId, 'answered'), [markProgress, stepId, sceneId]);
  return { complete, answered };
}

export function useSceneStatus(stepId: string, sceneId: string) {
  return useSession((s) => s.bundle?.progress.find((p) => p.stepId === stepId && p.sceneId === sceneId)?.status ?? 'none');
}

/** 여러 문항이 모두 응답되면 자동으로 완료 처리 */
export function useAutoComplete(stepId: string, sceneId: string, questionIds: string[], extra = true) {
  const done = useSession((s) => questionIds.every((q) => s.bundle?.responses.some((r) => r.questionId === q)));
  const markProgress = useSession((s) => s.markProgress);
  useEffect(() => {
    if (done && extra) markProgress(stepId, sceneId, 'completed');
  }, [done, extra, markProgress, stepId, sceneId]);
  return done && extra;
}
