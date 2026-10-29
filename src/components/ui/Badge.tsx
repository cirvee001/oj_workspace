import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Channel } from '@/types/domain';
import { CHANNEL_CHIP } from '@/config/constants';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeVariant = 'subtle' | 'solid' | 'outline';

/* Tinted fills use the fill/ink pair, which inverts together with the theme. */
const SUBTLE: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-text-label',
  accent: 'bg-accent-subtle text-accent',
  success: 'bg-success-fill text-success-ink',
  warning: 'bg-warning-fill text-warning-ink',
  danger: 'bg-danger-fill text-danger-ink',
  info: 'bg-info-fill text-info-ink',
};

const SOLID: Record<BadgeTone, string> = {
  neutral: 'bg-text text-surface',
  accent: 'bg-accent text-on-accent',
  success: 'bg-success-600 text-white',
  warning: 'bg-warning-500 text-ui-900',
  danger: 'bg-danger-600 text-white',
  info: 'bg-info-600 text-white',
};

const OUTLINE: Record<BadgeTone, string> = {
  neutral: 'border border-border-strong text-text-label',
  accent: 'border border-accent text-accent',
  success: 'border border-success-600 text-success-text',
  warning: 'border border-warning-600 text-warning-text',
  danger: 'border border-danger-600 text-danger-text',
  info: 'border border-info-600 text-info-ink',
};

interface BadgeProps {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  /** Leading status dot in the current text colour. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

/** Status chips are sentence case: "late", "needs a decision" → "Late", "Needs a decision". */
const sentence = (c: ReactNode): ReactNode =>
  typeof c === 'string' && c ? c.charAt(0).toUpperCase() + c.slice(1) : c;

export function Badge({ tone = 'neutral', variant = 'subtle', size = 'md', dot, children, className }: BadgeProps) {
  const palette = variant === 'solid' ? SOLID : variant === 'outline' ? OUTLINE : SUBTLE;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-tag leading-none font-medium whitespace-nowrap',
        size === 'sm' ? 'h-5 gap-1 px-1.5 text-[11px]' : 'h-6 gap-1.5 px-2 text-[12px]',
        palette[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn('rounded-full bg-current', size === 'sm' ? 'size-1' : 'size-1.5')} />}
      {sentence(children)}
    </span>
  );
}

/** Where a customer or order came from, with the channel's mark. */
export function ChannelChip({ channel }: { channel: Channel }) {
  const chip = CHANNEL_CHIP[channel] ?? { code: '??', colour: '#7A8090' };
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-tag border border-border bg-surface pr-2 pl-1 text-[12px] font-medium whitespace-nowrap text-text-label">
      <i
        className="grid size-4 place-items-center rounded-[4px] text-[8px] font-bold not-italic text-white"
        style={{ background: chip.colour }}
        aria-hidden="true"
      >
        {chip.code}
      </i>
      {channel}
    </span>
  );
}
