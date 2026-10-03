import { useCallback, useEffect, useRef, useState } from 'react';
import type { ModelState } from '@shared/types';
import { DEFAULT_STATE } from '@/three/ModelLab';

/**
 * 장면별 모형 작업 상태를 기기에 보관한다(제출 전 임시). 자유 실험(sandbox)은 별도 키를 써서
 * 수업 활동의 모형 상태를 덮어쓰지 않는다(R11).
 *
 * 달을 끌거나 '한 달 동안 돌려 보기'를 하면 상태가 초당 수십 번 바뀐다. 그때마다 기기에 쓰지 않고
 * 0.4초 동안 모아서 한 번만 쓰며, 화면을 떠날 때 마지막 상태를 반영한다.
 */
export function useLabState(key: string, initial: Partial<ModelState> = {}): [ModelState, (s: ModelState) => void, () => void] {
  const storageKey = `ml:lab:${key}`;
  const initialRef = useRef(initial);
  const [state, setState] = useState<ModelState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...DEFAULT_STATE, ...initialRef.current, ...(JSON.parse(raw) as ModelState) };
    } catch {
      /* noop */
    }
    return { ...DEFAULT_STATE, ...initialRef.current };
  });
  const latest = useRef(state);
  const timer = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(latest.current));
    } catch {
      /* noop */
    }
  }, [storageKey]);

  const update = useCallback(
    (s: ModelState) => {
      latest.current = s;
      setState(s);
      if (timer.current === null) timer.current = window.setTimeout(flush, 400);
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (timer.current !== null) flush();
    },
    [flush],
  );

  const reset = useCallback(() => update({ ...DEFAULT_STATE, ...initialRef.current }), [update]);
  return [state, update, reset];
}

export function newAttemptId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
