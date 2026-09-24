import type { SourceType } from '@shared/types';
import { SOURCE_LABEL } from '@shared/types';

const COLOR: Record<SourceType, string> = {
  'my-observation': 'chip--coral',
  'provided-observation': 'chip--green',
  'institution-forecast': 'chip--blue',
  'app-calculation': 'chip--stone',
  'learning-model': '',
};

export function SourceBadge({ type, extra }: { type: SourceType; extra?: string }) {
  return (
    <span className={`chip ${COLOR[type]}`}>
      {SOURCE_LABEL[type]}
      {extra ? ` · ${extra}` : ''}
    </span>
  );
}

export function MediaKindBadge({ kind }: { kind: 'real' | 'composite' | 'simulation' }) {
  const map = { real: ['chip--green', '실제 사진'], composite: ['chip--warn', '여러 장을 합친 사진'], simulation: ['chip--stone', '컴퓨터로 만든 그림'] } as const;
  const [cls, label] = map[kind];
  return <span className={`chip ${cls}`}>{label}</span>;
}
