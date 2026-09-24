import { useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

/**
 * 3D 장면 이름표 — 캔버스 위에 보통의 글자(DOM)로 얹고, 그림이 그려질 때마다 3D 위치를 화면 위치로 옮긴다.
 * (drei Html 은 필요할 때만 다시 그리는 장면에서 내용이 비는 경우가 있어 쓰지 않는다.)
 */
export interface LabelSpec {
  key: string;
  pos: [number, number, number];
  text: ReactNode;
  tone?: 'dark' | 'sun' | 'me' | 'mark';
}

export type LabelRefs = MutableRefObject<Record<string, HTMLSpanElement | null>>;

export function useLabelRefs(): LabelRefs {
  return useRef<Record<string, HTMLSpanElement | null>>({});
}

/** 캔버스 밖(같은 부모 안)에 두는 글자 층 */
export function LabelLayer({ labels, refs }: { labels: LabelSpec[]; refs: LabelRefs }) {
  return (
    <div className="scene-labels" aria-hidden="true">
      {labels.map((l) => (
        <span
          key={l.key}
          ref={(el) => {
            refs.current[l.key] = el;
          }}
          className={`scene-tag scene-tag--${l.tone ?? 'dark'}`}
          style={{ transform: 'translate(-9999px, -9999px)' }}
        >
          {l.text}
        </span>
      ))}
    </div>
  );
}

/** 캔버스 안에 두는 위치 계산기 */
export function LabelProjector({ labels, refs }: { labels: LabelSpec[]; refs: LabelRefs }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const v = useRef(new Vector3());
  useEffect(() => {
    invalidate();
  }, [labels, invalidate]);
  useFrame(() => {
    for (const l of labels) {
      const el = refs.current[l.key];
      if (!el) continue;
      v.current.set(l.pos[0], l.pos[1], l.pos[2]).project(camera);
      if (v.current.z > 1) {
        el.style.transform = 'translate(-9999px, -9999px)';
        continue;
      }
      // 이름표가 화면 밖으로 잘리지 않게 가장자리 안쪽으로 붙잡는다
      const hw = el.offsetWidth / 2 + 4;
      const hh = el.offsetHeight / 2 + 4;
      const x = Math.min(size.width - hw, Math.max(hw, (v.current.x * 0.5 + 0.5) * size.width));
      const y = Math.min(size.height - hh, Math.max(hh, (-v.current.y * 0.5 + 0.5) * size.height));
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  });
  return null;
}
