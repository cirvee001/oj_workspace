import { useMemo } from 'react';
import { Check, Delete } from 'lucide-react';
import { encodeQR, qrPath } from '@/lib/qr';
import { cn } from '@/lib/cn';

/**
 * A hanger, not an "OJ" monogram — the wordmark already says OJ Clothing, and
 * a mark that repeats the name reads as "OJOJ Clothing".
 */
export function Logo({ size = 32, inverted, className }: { size?: number; inverted?: boolean; className?: string }) {
  /* Ink tile on paper; on a black surface (sidebar, sign-in panel) it flips to a white tile. */
  const tile = inverted ? '#ffffff' : 'var(--color-text)';
  const line = inverted ? '#0a0a0a' : 'var(--color-surface)';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill={tile} />
      <path d="M16 9.5a2.2 2.2 0 1 1 2.2 2.2c-1 0-1.6.5-1.6 1.4v.9" fill="none" stroke={line} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M16.2 14.2 8.4 19.9c-.9.7-.5 2.1.7 2.1h13.8c1.2 0 1.6-1.4.7-2.1l-7.4-5.7z"
        fill="none"
        stroke={line}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The hanger plus the wordmark. The text inherits its colour; pass `inverted` on black. */
export function BrandMark({ className, compact, inverted }: { className?: string; compact?: boolean; inverted?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo inverted={inverted} />
      {!compact && (
        <span className="font-display text-[17px] leading-none">
          OJ Clothing
        </span>
      )}
    </div>
  );
}

interface QrCodeProps {
  value: string;
  size?: number;
  quiet?: number;
  className?: string;
}

/** QR code as crisp SVG. Always dark-on-white so it scans in either theme. */
export function QrCode({ value, size = 200, quiet = 2, className }: QrCodeProps) {
  const { path, dim } = useMemo(() => {
    const m = encodeQR(value);
    return { path: qrPath(m, quiet), dim: m.length + quiet * 2 };
  }, [value, quiet]);
  return (
    <svg viewBox={`0 0 ${dim} ${dim}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="Clock-in code" className={cn('block', className)}>
      <rect width={dim} height={dim} fill="#fff" />
      <path d={path} fill="#1c1815" />
    </svg>
  );
}

interface KeypadProps {
  /** How many digits are entered (shown as dots). */
  length: number;
  /** Total digits expected; empty slots show as rings. */
  max?: number;
  onDigit: (n: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
  label?: string;
  className?: string;
}

/** Big number pad for badge numbers on the shop tablet. */
export function Keypad({ length, max = 6, onDigit, onDelete, onSubmit, label, className }: KeypadProps) {
  const key =
    'grid h-14 place-items-center rounded-tile border border-border bg-surface font-display text-[20px] text-text tabular-nums transition-colors hover:border-border-strong hover:bg-surface-hover active:bg-text active:text-surface';
  return (
    <div className={cn('mx-auto w-full max-w-80', className)}>
      {label && <p className="mb-3 text-center text-body-13 text-text-secondary">{label}</p>}
      <div className="mb-5 flex justify-center gap-2.5" aria-label={`${length} of ${max} digits entered`} role="status">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={cn('size-3 rounded-full transition-colors', i < length ? 'bg-accent' : 'border border-border-interactive')} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" className={key} onClick={() => onDigit(n)}>
            {n}
          </button>
        ))}
        <button type="button" className={cn(key, 'text-text-muted')} onClick={onDelete} aria-label="Delete">
          <Delete size={20} />
        </button>
        <button type="button" className={key} onClick={() => onDigit(0)}>
          0
        </button>
        <button
          type="button"
          className={cn(key, 'border-accent bg-accent text-on-accent hover:border-accent-hover hover:bg-accent-hover')}
          onClick={onSubmit}
          aria-label="Done"
        >
          <Check size={22} />
        </button>
      </div>
    </div>
  );
}
