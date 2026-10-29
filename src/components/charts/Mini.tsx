/** Small inline charts for stat cards and hero rows. Colour comes from `currentColor`. */
import { cn } from '@/lib/cn';

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 104;
  const h = 30;
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(2)},${(h - 2 - ((v - min) / range) * (h - 6)).toFixed(2)}`);
  const line = `M${pts.join(' L')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className={cn('h-8 w-26 shrink-0 overflow-visible', className)}>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** A few buckets as rounded bars; the last one is solid. */
export function MiniBars({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  return (
    <div aria-hidden="true" className={cn('flex h-9 items-end gap-1', className)}>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn('w-1.5 rounded-t-[2px] bg-current', i === values.length - 1 ? 'opacity-100' : 'opacity-30')}
          style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}
