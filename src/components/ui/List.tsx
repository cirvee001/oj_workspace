/**
 * List-style building blocks: card lists, key/value detail panes, work queues,
 * avatars and progress bars.
 */
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { Icon, type IconName } from './Icon';

/* ---------------- card lists ---------------- */

/** A list of rows in a card. Pass `bare` when it already sits inside a card. */
export function List({ children, bare, className }: { children: ReactNode; bare?: boolean; className?: string }) {
  return (
    <ul className={cn('divide-y divide-border', !bare && 'overflow-hidden rounded-card bg-surface shadow-card', className)}>{children}</ul>
  );
}

interface ListItemProps {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  /** Show a chevron to signal it opens something. Defaults to true when clickable. */
  chevron?: boolean;
  className?: string;
}

export function ListItem({ title, description, leading, trailing, onClick, chevron, className }: ListItemProps) {
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-body-14 font-semibold text-text">{title}</div>
        {description && <div className="mt-0.5 truncate text-body-13 text-text-secondary">{description}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-3 text-right">{trailing}</div>}
      {onClick && (chevron ?? true) && <ChevronRight size={16} className="shrink-0 text-text-muted" aria-hidden="true" />}
    </>
  );
  const cls = cn('flex w-full items-center gap-3 px-4 py-3.5 text-left md:px-5', className);
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={cn(cls, 'transition-colors hover:bg-surface-hover')}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

/** A right-aligned figure with a caption under it, for a row's trailing slot. */
export function Figure({ value, caption, tone }: { value: ReactNode; caption?: ReactNode; tone?: 'danger' | 'success' }) {
  return (
    <div className="text-right">
      <div
        className={cn(
          'text-body-14 font-semibold tabular-nums',
          tone === 'danger' ? 'text-danger-text' : tone === 'success' ? 'text-success-text' : 'text-text',
        )}
      >
        {value}
      </div>
      {caption && <div className="mt-0.5 text-body-12 text-text-muted">{caption}</div>}
    </div>
  );
}

const AVATAR_SIZE = { sm: 'size-8 text-[11px]', md: 'size-9 text-body-12', lg: 'size-12 text-body-15' } as const;

export function Avatar({ name, size = 'md', className }: { name: string; size?: keyof typeof AVATAR_SIZE; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-accent-subtle font-semibold text-accent-hover', AVATAR_SIZE[size], className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** Round tinted icon chip, for list leading slots. */
export function IconChip({ icon, tone = 'neutral', className }: { icon: IconName; tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'success'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-sunken text-text-secondary',
    accent: 'bg-accent-subtle text-accent',
    warning: 'bg-warning-fill text-warning-ink',
    danger: 'bg-danger-fill text-danger-ink',
    success: 'bg-success-fill text-success-ink',
  };
  return (
    <span className={cn('grid size-9 shrink-0 place-items-center rounded-tile', tones[tone], className)}>
      <Icon name={icon} size={16} />
    </span>
  );
}

/* ---------------- key/value ---------------- */

/** A detail pane of label/value rows. */
export function KeyValueList({ children, columns = 1, className }: { children: ReactNode; columns?: 1 | 2; className?: string }) {
  return <dl className={cn(columns === 2 ? 'grid grid-cols-1 gap-x-8 md:grid-cols-2' : 'block', className)}>{children}</dl>;
}

interface KeyValueProps {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  /** The bottom line of a summary: bold, with a stronger rule above. */
  total?: boolean;
  /** Colour the value. */
  tone?: 'danger' | 'success' | 'warning';
}

export function KeyValue({ label, children, hint, total, tone }: KeyValueProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,45%)_minmax(0,55%)] items-baseline gap-4 py-2.5',
        total ? 'mt-1 border-t-2 border-text pt-3' : 'stitch border-b last:border-b-0',
      )}
    >
      <dt className={cn('text-body-13', total ? 'font-semibold text-text' : 'text-text-muted')}>{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-right text-body-14 tabular-nums',
          total ? 'font-display text-[22px] leading-7' : 'text-text',
          tone === 'danger' && 'text-danger-text',
          tone === 'success' && 'text-success-text',
          tone === 'warning' && 'text-warning-text',
        )}
      >
        {children}
        {hint && <span className="mt-0.5 block text-body-12 font-normal text-text-muted">{hint}</span>}
      </dd>
    </div>
  );
}

/* ---------------- work queue ---------------- */

export function Queue({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn('flex flex-col divide-y divide-border', className)}>{children}</ul>;
}

interface QueueItemProps {
  icon: IconName;
  title: ReactNode;
  description?: ReactNode;
  urgent?: boolean;
  onClick?: () => void;
  actions?: ReactNode;
}

/** One actionable item: an icon chip, the ask, and either a tap target or inline actions. */
export function QueueItem({ icon, title, description, urgent, onClick, actions }: QueueItemProps) {
  const body = (
    <>
      <IconChip icon={icon} tone={urgent ? 'accent' : 'neutral'} />
      <div className="min-w-0 flex-1">
        <div className="text-body-14 leading-snug font-semibold text-text">{title}</div>
        {description && <div className="mt-0.5 text-body-13 leading-snug text-text-secondary">{description}</div>}
      </div>
    </>
  );
  const shell = cn(
    'relative flex w-full flex-wrap items-start gap-3 px-5 py-3.5 text-left md:flex-nowrap md:px-6',
    urgent && 'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-accent',
  );
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className={cn(shell, 'transition-colors hover:bg-surface-hover')}>
          {body}
          {urgent && <span className="shrink-0 text-eyebrow text-accent">Urgent</span>}
        </button>
      ) : (
        <div className={shell}>
          {body}
          {actions && <div className="flex w-full shrink-0 items-center justify-end gap-2 md:w-auto">{actions}</div>}
        </div>
      )}
    </li>
  );
}

/* ---------------- progress ---------------- */

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
const PROGRESS: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  neutral: 'bg-text-muted',
};

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: ReactNode;
  /** Right-hand caption. */
  valueLabel?: ReactNode;
  tone?: ProgressTone;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, max = 100, label, valueLabel, tone = 'accent', size = 'md', className }: ProgressBarProps) {
  const pct = (Math.min(Math.max(value, 0), max > 0 ? max : 1) / (max > 0 ? max : 1)) * 100;
  return (
    <div className={cn('w-full', className)}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label && <span className="truncate text-body-13 text-text-label">{label}</span>}
          {valueLabel && <span className="text-body-12 font-semibold text-text-secondary tabular-nums">{valueLabel}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === 'string' ? label : undefined}
        className={cn('relative w-full overflow-hidden rounded-[3px] bg-surface-sunken', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div className={cn('h-full rounded-[3px] transition-[width] duration-300', PROGRESS[tone])} style={{ width: `${pct}%` }} />
        {/* Marked like a tape measure: a tick every tenth. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'repeating-linear-gradient(to right, transparent 0 calc(10% - 1px), var(--color-surface) calc(10% - 1px) 10%)',
          }}
        />
      </div>
    </div>
  );
}
