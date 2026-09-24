import { create } from 'zustand';

export type FontSize = 'normal' | 'large' | 'xlarge';

interface Prefs {
  fontSize: FontSize;
  reduceMotion: boolean;
  lowGraphics: boolean;
  setFontSize(f: FontSize): void;
  setReduceMotion(v: boolean): void;
  setLowGraphics(v: boolean): void;
}

function load(): Partial<Prefs> {
  try {
    const raw = localStorage.getItem('ml:prefs');
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
  } catch {
    return {};
  }
}

function apply(p: { fontSize: FontSize; reduceMotion: boolean }) {
  document.documentElement.dataset.font = p.fontSize;
  document.documentElement.dataset.motion = p.reduceMotion ? 'reduce' : 'normal';
}

function persist(p: Pick<Prefs, 'fontSize' | 'reduceMotion' | 'lowGraphics'>) {
  try {
    localStorage.setItem('ml:prefs', JSON.stringify(p));
  } catch {
    /* 사설 창 등 */
  }
  apply(p);
}

const initial = load();
const prefersReduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const usePrefs = create<Prefs>((set, get) => ({
  fontSize: initial.fontSize ?? 'normal',
  reduceMotion: initial.reduceMotion ?? Boolean(prefersReduce),
  lowGraphics: initial.lowGraphics ?? false,
  setFontSize(fontSize) {
    set({ fontSize });
    persist({ ...get(), fontSize });
  },
  setReduceMotion(reduceMotion) {
    set({ reduceMotion });
    persist({ ...get(), reduceMotion });
  },
  setLowGraphics(lowGraphics) {
    set({ lowGraphics });
    persist({ ...get(), lowGraphics });
  },
}));

if (typeof document !== 'undefined') apply(usePrefs.getState());
