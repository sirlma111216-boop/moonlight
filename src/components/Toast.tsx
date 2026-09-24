import { useSession } from '@/store/session';

export function Toast() {
  const toast = useSession((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast.kind === 'badge' ? <span className="mono mono--dark">Badge</span> : null}
      <span>{toast.text}</span>
    </div>
  );
}
