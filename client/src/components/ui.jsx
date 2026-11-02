import { useEffect } from 'react';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';

const lum = (hex = '#303832') => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

// Team / competition badge: uses the logo URL if present, otherwise a coloured crest with initials
export function Crest({ item, size = 40, className = '' }) {
  const s = { width: size, height: size };
  if (item?.logo) return <img src={item.logo} alt="" style={s} className={`rounded-full bg-bg2 object-contain ${className}`} loading="lazy" />;
  const color = item?.color || '#303832';
  const label = (item?.shortName || item?.name || '?').slice(0, 4);
  return (
    <span
      style={{ ...s, background: color, color: lum(color) > 0.6 ? '#0D1010' : '#F5F6F2', fontSize: size * (label.length > 3 ? 0.26 : 0.32) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold tracking-wide ring-1 ring-white/10 ${className}`}
      aria-hidden
    >{label}</span>
  );
}

export function LiveDot({ label = 'LIVE' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-live">
      <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" /></span>
      {label}
    </span>
  );
}

export function StatusBadge({ match }) {
  const { status, clock } = match;
  if (status === 'LIVE') return <span className="inline-flex items-center gap-2"><LiveDot />{clock && <span className="text-xs font-semibold tabular-nums text-live">{clock}</span>}</span>;
  const map = { COMPLETED: ['FT', 'text-mute bg-bg2'], POSTPONED: ['PPD', 'text-amber-300 bg-amber-300/10'], CANCELLED: ['CANC', 'text-mute bg-bg2 line-through'], SCHEDULED: ['UPCOMING', 'text-lime bg-lime/10'] };
  const [t, c] = map[status] || [status, ''];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${c}`}>{t}</span>;
}

export const DemoBadge = ({ className = '' }) => (
  <span title="Seeded demonstration data — not real-world results" className={`rounded border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-200 ${className}`}>Demo data</span>
);

export function Section({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="flex items-center gap-2.5 font-display text-2xl font-bold uppercase tracking-wide sm:text-[28px]">
          {Icon && <Icon size={20} className="text-lime" />}{title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export const Skeleton = ({ rows = 3, h = 'h-20' }) => (
  <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <div key={i} className={`skeleton ${h}`} />)}</div>
);
export const Spinner = ({ className = '' }) => <Loader2 className={`animate-spin text-lime ${className}`} size={22} />;

export function Empty({ icon: Icon = Inbox, title = 'Nothing here yet', text, children }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <Icon size={28} className="text-mute" />
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-mute">{text}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-live/30 px-6 py-8 text-center">
      <AlertTriangle className="text-live" />
      <p className="text-sm text-mute">{message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

// Renders loading / error / empty states around async data
export function Async({ state, empty, skeleton, children }) {
  if (state.loading && !state.data) return skeleton || <Skeleton />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const d = state.data;
  if (!d || (Array.isArray(d) && !d.length) || (Array.isArray(d.items) && !d.items.length)) return empty || <Empty />;
  return children(d);
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6 ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-2xl font-bold uppercase">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-mute hover:bg-bg2 hover:text-ink"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ open, title = 'Are you sure?', text, confirmLabel = 'Delete', onConfirm, onClose, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-sm text-mute">{text}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} onClick={() => onChange(t)}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${value === t ? 'border-lime text-ink' : 'border-transparent text-mute hover:text-ink'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

export const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="label">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-live">{error}</span>}
  </label>
);
