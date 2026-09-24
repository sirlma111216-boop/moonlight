import { useCallback, useState } from 'react';
import type { ModelState } from '@shared/types';
import { DEFAULT_STATE } from '@/three/ModelLab';

/**
 * 장면별 모형 작업 상태를 기기에 보관한다(제출 전 임시). 자유 실험(sandbox)은 별도 키를 써서
 * 실제 날짜 모드의 상태를 덮어쓰지 않는다(R11).
 */
export function useLabState(key: string, initial: Partial<ModelState> = {}): [ModelState, (s: ModelState) => void, () => void] {
  const storageKey = `ml:lab:${key}`;
  const [state, setState] = useState<ModelState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...DEFAULT_STATE, ...initial, ...(JSON.parse(raw) as ModelState) };
    } catch {
      /* noop */
    }
    return { ...DEFAULT_STATE, ...initial };
  });
  const update = useCallback(
    (s: ModelState) => {
      setState(s);
      try {
        localStorage.setItem(storageKey, JSON.stringify(s));
      } catch {
        /* noop */
      }
    },
    [storageKey],
  );
  const reset = useCallback(() => update({ ...DEFAULT_STATE, ...initial }), [update, initial]);
  return [state, update, reset];
}

export function newAttemptId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
