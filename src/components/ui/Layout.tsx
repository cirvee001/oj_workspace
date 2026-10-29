/**
 * Page-level building blocks: headers, cards, the KPI ledger, alerts and empty states.
 */
import { Children, createContext, useContext, type HTMLAttributes, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';
import { Sparkline, MiniBars } from '../charts/Mini';

/* ---------------- headers ---------------- */

interface PageHeaderProps {
  title: ReactNode;
  /** One short line. Longer copy is kept in the tooltip. */
  description?: string;
  actions?: ReactNode;
  /** Badges rendered inline after the title. */
  meta?: ReactNode;
  /** Small tracked label above the title, e.g. the section of the business. */
  eyebrow?: ReactNode;
}

/** Editorial page title: a large serif headline with a quiet one-line standfirst. */
export function PageHeader({ title, description, actions, meta, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-7 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && <p className="mb-2 text-eyebrow text-accent">{eyebrow}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[36px] leading-[40px] text-text md:text-[42px] md:leading-[46px]">{title}</h1>
            {meta}
          </div>
          {description && (
            <p className="mt-2 max-w-2xl text-body-14 text-text-secondary md:truncate" title={description}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A section title with the tailor's stitched rule running to the right. */
export function SectionHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('mt-10 mb-4', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-2 text-[15px] leading-6 font-semibold text-text">{title}</h2>
        <span aria-hidden="true" className="stitch hidden min-w-8 flex-1 border-t sm:block" />
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="mt-1 text-body-13 text-text-secondary">{description}</p>}
    </div>
  );
}

/** Row of filters/buttons above a list. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

/* ---------------- cards ---------------- */

type CardPadding = 'none' | 'tight' | 'default';
const PADDING: Record<CardPadding, string> = { none: '', tight: 'p-4', default: 'p-5 md:p-6' };

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

/** A sheet of paper on the page: hairline edge, no float. */
export function Card({ padding = 'none', className, ...rest }: CardProps) {
  return <div className={cn('min-w-0 rounded-card bg-surface shadow-card', PADDING[padding], className)} {...rest} />;
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Draw a hairline under the header. */
  divided?: boolean;
  className?: string;
}

export function CardHeader({ title, description, actions, divided, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3 md:px-6', divided && 'border-b border-border pb-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] leading-6 font-semibold text-text">{title}</h3>
        {description && <p className="mt-0.5 text-body-13 text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5 md:px-6 md:pb-6', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 rounded-b-card border-t border-border bg-surface-sunken px-5 py-3.5 md:px-6', className)}
      {...rest}
    />
  );
}

/** Two-column page body that stacks on smaller screens. Main column first. */
export function DashGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]', className)}>{children}</div>;
}

/* ---------------- the KPI ledger ---------------- */

export type StatTone = 'default' | 'success' | 'warning' | 'danger';

const VALUE_TONE: Record<StatTone, string> = {
  default: 'text-text',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
};
const MARK_TONE: Record<StatTone, string> = {
  default: 'text-text-muted',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
};

export interface StatDelta {
  /** Shown as is: "+12%", "3 late". */
  label: string;
  direction?: 'up' | 'down' | 'flat';
  /** Is this movement good news? Colours it. */
  good?: boolean;
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** Small unit after the value, like "/16" or "yd". */
  unit?: ReactNode;
  caption?: ReactNode;
  icon?: IconName;
  tone?: StatTone;
  delta?: StatDelta;
  /** Two or more values for an inline sparkline. */
  sparkline?: number[];
  /** Two or more values for a mini bar chart (instead of the sparkline). */
  bars?: number[];
  onClick?: () => void;
  className?: string;
}

/** Inside a StatGrid, cards render as cells of one ruled ledger rather than separate cards. */
const LedgerContext = createContext(false);

/** A figure set like a ledger entry: "₦" small and raised, the amount in the serif. */
function BigValue({ value, unit, tone }: { value: ReactNode; unit?: ReactNode; tone: StatTone }) {
  const long = typeof value === 'string' && value.length > 9;
  const cls = cn(
    'font-display whitespace-nowrap tabular-nums',
    long ? 'text-[32px] leading-[36px]' : 'text-[40px] leading-[42px]',
    VALUE_TONE[tone],
  );
  const tail = unit ? <span className="ml-1 font-sans text-body-13 text-text-muted">{unit}</span> : null;
  if (typeof value === 'string' && /^[₦$£€]/.test(value)) {
    return (
      <p className={cls}>
        <span className="mr-0.5 align-[0.55em] font-sans text-[0.38em] font-medium text-text-muted">{value[0]}</span>
        {value.slice(1)}
        {tail}
      </p>
    );
  }
  return (
    <p className={cls}>
      {value}
      {tail}
    </p>
  );
}

/** One KPI: tracked label, a serif figure, and a line of context. */
export function StatCard({ label, value, unit, caption, icon, tone = 'default', delta, sparkline, bars, onClick, className }: StatCardProps) {
  const inLedger = useContext(LedgerContext);
  const DeltaIcon = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : Minus;
  const body = (
    <>
      <div className="flex items-start gap-1.5">
        {icon && <Icon name={icon} size={13} className={cn('mt-px shrink-0', MARK_TONE[tone])} />}
        <p className="min-w-0 text-eyebrow text-text-muted">{label}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <BigValue value={value} unit={unit} tone={tone} />
        {bars && bars.length > 1 ? (
          <MiniBars values={bars} className="text-accent" />
        ) : (
          sparkline && sparkline.length > 1 && <Sparkline values={sparkline} className="text-accent" />
        )}
      </div>
      {(delta || caption) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-12">
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold tabular-nums',
                delta.good === undefined ? 'text-text-secondary' : delta.good ? 'text-success-text' : 'text-danger-text',
              )}
            >
              {delta.direction && <DeltaIcon size={13} aria-hidden="true" />}
              {delta.label}
            </span>
          )}
          {caption && <span className="text-text-muted">{caption}</span>}
        </div>
      )}
    </>
  );
  const shell = cn(
    'flex w-full min-w-0 flex-col justify-start bg-surface px-5 py-5 text-left transition-colors',
    !inLedger && 'rounded-card shadow-card',
    onClick && 'hover:bg-surface-hover',
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={shell}>
      {body}
    </button>
  ) : (
    <div className={shell}>{body}</div>
  );
}

/* Full-row column counts, so the ruled strip never shows an empty cell. */
const XL_COLS: Record<number, string> = {
  1: 'xl:grid-cols-1',
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
  5: 'xl:grid-cols-5',
  6: 'xl:grid-cols-3',
};

/** KPIs as one ruled ledger strip: a single card, cells divided by hairlines. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  const count = Children.toArray(children).filter(Boolean).length;
  return (
    <LedgerContext.Provider value={true}>
      <div
        className={cn(
          'grid grid-cols-1 gap-px overflow-hidden rounded-card bg-border shadow-card sm:grid-cols-2',
          /* an odd last cell spans the row on two-column screens */
          'sm:[&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1',
          XL_COLS[count] ?? 'xl:grid-cols-4',
          className,
        )}
      >
        {children}
      </div>
    </LedgerContext.Provider>
  );
}

/* ---------------- alerts & empty states ---------------- */

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';
const ALERT: Record<AlertTone, { cls: string; rule: string; icon: IconName }> = {
  info: { cls: 'bg-info-fill text-info-ink', rule: 'bg-info-500', icon: 'spark' },
  success: { cls: 'bg-success-fill text-success-ink', rule: 'bg-success-500', icon: 'check' },
  warning: { cls: 'bg-warning-fill text-warning-ink', rule: 'bg-warning-500', icon: 'bell' },
  danger: { cls: 'bg-danger-fill text-danger-ink', rule: 'bg-danger-500', icon: 'x' },
};

/** Inline message: a tinted slip with a coloured rule down its edge. */
export function Alert({ title, children, tone = 'info', actions, className }: { title: ReactNode; children?: ReactNode; tone?: AlertTone; actions?: ReactNode; className?: string }) {
  const a = ALERT[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('relative flex items-start gap-3 overflow-hidden rounded-tile py-3 pr-4 pl-5', a.cls, className)}>
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', a.rule)} />
      <Icon name={a.icon} size={15} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-body-14 font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-body-13 opacity-90">{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  message?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  /** Wrap it in a card. Off when it already sits inside a card or table. */
  bordered?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({ title, message, icon = 'spark', action, bordered, size = 'md', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        size === 'sm' ? 'py-8' : 'py-12',
        bordered && 'rounded-card bg-surface shadow-card',
        className,
      )}
    >
      <span className="stitch grid size-12 place-items-center rounded-full border text-text-muted">
        <Icon name={icon} size={18} />
      </span>
      <h3 className="mt-4 font-display text-[22px] leading-7 text-text">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-body-14 text-text-secondary">{message}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Fine print under a section. */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-3 text-body-12 text-text-muted', className)}>{children}</p>;
}
