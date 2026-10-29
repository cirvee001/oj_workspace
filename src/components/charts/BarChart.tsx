import { cn } from '@/lib/cn';

export interface Bar {
  label: string;
  value: number;
  /** Formatted value for the label and screen readers. Defaults to the number. */
  display?: string;
  /** The bar to call out: solid ink with its value set above it. */
  current?: boolean;
  /** A bucket still to come: drawn as a dashed placeholder. */
  future?: boolean;
}

interface BarChartProps {
  bars: Bar[];
  height?: number;
  /** Print every bar's value above it, not just the called-out one. */
  showValues?: boolean;
  className?: string;
}

/**
 * Square-shouldered columns on a ruled baseline, like cloth on a cutting
 * table. One bar is called out in solid ink with its figure above; the rest are
 * pale grey. If no bar is marked current, the tallest one is.
 */
export function BarChart({ bars, height = 180, showValues, className }: BarChartProps) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const hasCurrent = bars.some((b) => b.current);
  const peak = bars.reduce((best, b, i) => (b.value > bars[best].value ? i : best), 0);
  return (
    <div className={cn('relative', className)}>
      <div
        role="img"
        aria-label={bars.map((b) => `${b.label}: ${b.display ?? b.value}`).join(', ')}
        className="flex items-end gap-2.5 border-b border-text/70 pt-8"
        style={{ height }}
      >
        {bars.map((b, i) => {
          const current = hasCurrent ? b.current : i === peak && b.value > 0;
          const pct = b.future ? 14 : Math.max(b.value === 0 ? 2 : 6, (b.value / max) * 100);
          return (
            <div key={b.label + i} className="relative flex h-full min-w-0 flex-1 items-end justify-center">
              <div className="relative flex h-full w-full max-w-10 items-end">
                {(current || showValues) && !b.future && (
                  <span
                    className={cn(
                      'absolute left-1/2 -translate-x-1/2 text-[12px] whitespace-nowrap tabular-nums',
                      current ? 'font-display text-[18px] leading-none text-accent' : 'font-medium text-text-secondary',
                    )}
                    style={{ bottom: `calc(${pct}% + 6px)` }}
                  >
                    {b.display ?? b.value}
                  </span>
                )}
                <span
                  className={cn(
                    'w-full rounded-t-[3px] transition-[height] duration-300',
                    b.future ? 'stitch border border-b-0' : current ? 'bg-accent' : 'bg-text/15 dark:bg-text/20',
                  )}
                  style={{ height: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2.5" aria-hidden="true">
        {bars.map((b, i) => {
          const current = hasCurrent ? b.current : i === peak && b.value > 0;
          return (
            <span key={b.label + i} className={cn('min-w-0 flex-1 truncate text-center text-[11px]', current ? 'font-semibold text-text' : 'text-text-muted')}>
              {b.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Ranked shares: label and figure over a tape-marked bar. The leader is ink, the rest grey. */
export function BarList({ items, className }: { items: { label: string; value: number; display: string; hint?: string }[]; className?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className={cn('space-y-4', className)}>
      {items.map((it, i) => (
        <li key={it.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-body-13 font-medium text-text-label">{it.label}</span>
            <span className="text-body-13 font-semibold text-text tabular-nums">
              {it.display}
              {it.hint && <span className="ml-1.5 font-normal text-text-muted">{it.hint}</span>}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-[2px] bg-surface-sunken">
            <div className={cn('h-full rounded-[2px]', i === 0 ? 'bg-accent' : 'bg-text/35')} style={{ width: `${Math.max(2, (it.value / max) * 100)}%` }} />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{ backgroundImage: 'repeating-linear-gradient(to right, transparent 0 calc(10% - 1px), var(--color-surface) calc(10% - 1px) 10%)' }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
