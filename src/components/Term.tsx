import { useEffect, useId, useRef, useState } from 'react';
import { GLOSSARY } from '@/content/glossary';

/** 밑줄 용어 — 누르면 한 줄 정의(R9). 키보드로도 열고 Esc 로 닫는다. */
export function Term({ id, children }: { id: keyof typeof GLOSSARY; children?: React.ReactNode }) {
  const g = GLOSSARY[id];
  const [open, setOpen] = useState(false);
  const popId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span ref={wrapRef} style={{ position: 'relative', display: 'inline' }}>
      <button type="button" className="term" aria-expanded={open} aria-controls={popId} onClick={() => setOpen((v) => !v)}>
        {children ?? g.term}
      </button>
      {open ? (
        <span id={popId} role="tooltip" className="term__pop" style={{ left: 0 }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>{g.term}</strong>
          {g.def}
        </span>
      ) : null}
    </span>
  );
}
