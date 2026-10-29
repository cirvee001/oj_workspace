import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export interface FocusItem {
  key: string;
  title: ReactNode;
  /** Plain name for the avatar initials. Omit for no avatar. */
  avatarName?: string;
  detail?: ReactNode;
  /** Right-hand amount or status. */
  trailing?: ReactNode;
}

interface FocusPanelProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  items: FocusItem[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  /** Details for the selected item, usually a <DetailCard>. */
  detail: ReactNode;
  emptyDetail?: ReactNode;
  emptyList?: ReactNode;
  /** Rows before "Show more". */
  pageSize?: number;
  className?: string;
}

/**
 * A split view for the page's main work: the list on the left, the selected
 * item laid out on the right like a docket. On phones the docket opens as a
 * bottom sheet.
 */
export function FocusPanel({ title, description, actions, items, selectedKey, onSelect, detail, emptyDetail, emptyList, pageSize = 10, className }: FocusPanelProps) {
  const [shown, setShown] = useState(pageSize);
  const selected = selectedKey ? items.find((i) => i.key === selectedKey) : undefined;

  /* Desktop opens the first row straight away, so the docket is never empty. */
  useEffect(() => {
    if (selected || !items.length) return;
    if (window.matchMedia?.('(min-width: 1024px)').matches) onSelect(items[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, selected?.key]);

  return (
    <section className={cn('overflow-hidden rounded-card bg-surface shadow-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
        <div className="min-w-0">
          <h2 className="text-[15px] leading-6 font-semibold text-text">{title}</h2>
          {description && <p className="mt-0.5 text-body-13 text-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <ul className="min-w-0 divide-y divide-border lg:border-r lg:border-border" aria-label="List">
          {items.length === 0 && <li className="px-6 py-10 text-center text-body-13 text-text-muted">{emptyList ?? 'Nothing here right now.'}</li>}
          {items.slice(0, shown).map((item) => {
            const on = item.key === selectedKey;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSelect(on ? null : item.key)}
                  aria-pressed={on}
                  className={cn(
                    'relative flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors md:px-6',
                    on ? 'bg-accent-wash' : 'hover:bg-surface-hover',
                    on && 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent',
                  )}
                >
                  {item.avatarName && (
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-subtle text-body-12 font-semibold text-accent-hover">
                      {initials(item.avatarName)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-14 font-semibold text-text">{item.title}</span>
                    {item.detail && <span className="block truncate text-body-12 text-text-muted">{item.detail}</span>}
                  </span>
                  {item.trailing && <span className="shrink-0 text-right text-body-13 font-semibold tabular-nums">{item.trailing}</span>}
                </button>
              </li>
            );
          })}
          {items.length > shown && (
            <li>
              <button
                type="button"
                onClick={() => setShown((n) => n + pageSize)}
                className="w-full px-6 py-3 text-body-13 font-medium text-accent hover:bg-surface-hover"
              >
                Show more ({items.length - shown} left)
              </button>
            </li>
          )}
        </ul>

        <div className="hidden min-w-0 bg-surface-sunken p-5 lg:block">
          <div className="lg:sticky lg:top-4">
            {selected ? (
              detail
            ) : (
              <div className="stitch grid min-h-48 place-items-center rounded-tile border p-6 text-center text-body-13 text-text-muted">
                {emptyDetail ?? 'Pick one on the left to see the details.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end bg-ui-950/45 lg:hidden" onClick={() => onSelect(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[85vh] w-full animate-slide-up overflow-y-auto rounded-t-card bg-surface-sunken p-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => onSelect(null)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-ctl border border-border bg-surface text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>
            {detail}
          </div>
        </div>
      )}
    </section>
  );
}

interface DetailCardProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** The big number on the card. */
  amount?: ReactNode;
  fields?: [ReactNode, ReactNode][];
  actions?: ReactNode;
  children?: ReactNode;
}

/** The selected item, set like a tailor's docket: serif title, ruled fields, actions at the foot. */
export function DetailCard({ eyebrow, title, subtitle, amount, fields, actions, children }: DetailCardProps) {
  return (
    <div className="flex h-full flex-col rounded-tile bg-surface p-5 shadow-card">
      {eyebrow && <p className="text-eyebrow text-accent">{eyebrow}</p>}
      <h3 className="mt-1.5 font-display text-[26px] leading-[30px] text-text">{title}</h3>
      {subtitle && <p className="mt-1 text-body-13 text-text-secondary">{subtitle}</p>}
      {amount !== undefined && <p className="mt-4 font-display text-[40px] leading-[42px] text-text tabular-nums">{amount}</p>}
      {fields && fields.length > 0 && (
        <dl className="stitch mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4">
          {fields.map(([label, value], i) => (
            <div key={i} className="min-w-0">
              <dt className="text-body-12 text-text-muted">{label}</dt>
              <dd className="truncate text-body-14 font-medium text-text">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children && <div className="mt-4 text-body-13 text-text-secondary">{children}</div>}
      {actions && <div className="mt-auto flex flex-wrap gap-2 pt-5">{actions}</div>}
    </div>
  );
}
