import { useId, useRef, useState, type MouseEvent, type TouchEvent } from 'react';

export interface Series {
  name: string;
  /** Any CSS colour, including `var(--color-series-1)`. */
  colour: string;
  values: number[];
  format?: (v: number) => string;
}

const W = 680;
const H = 200;
const PAD_Y = 10;

/**
 * Monotone cubic (Fritsch–Carlson) through the points. Unlike Catmull-Rom it
 * never overshoots, so a run of zero days stays on the baseline instead of
 * dipping below it.
 */
function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 2) return '';
  const dx = (i: number) => pts[i + 1][0] - pts[i][0];
  const slope = Array.from({ length: n - 1 }, (_, i) => (pts[i + 1][1] - pts[i][1]) / dx(i));
  const m = pts.map((_, i) => (i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    d += `C${(pts[i][0] + h).toFixed(1)} ${(pts[i][1] + m[i] * h).toFixed(1)},${(pts[i + 1][0] - h).toFixed(1)} ${(pts[i + 1][1] - m[i + 1] * h).toFixed(1)},${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/** Smooth multi-series area chart with gridlines, a crosshair and a dark tooltip. */
export function LineChart({ series, labels, height = 220 }: { series: Series[]; labels: string[]; height?: number }) {
  const gid = useId().replace(/:/g, '');
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = labels.length;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const x = (i: number) => (i * W) / Math.max(1, n - 1);
  const y = (v: number) => H - PAD_Y - (v / max) * (H - PAD_Y * 2);

  const onMove = (e: MouseEvent | TouchEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((clientX - rect.left) / rect.width) * (n - 1)))));
  };

  const tickEvery = Math.ceil(n / 6);
  const tipTop = hover == null ? 0 : (y(Math.max(...series.map((s) => s.values[hover]))) / H) * 100;
  const tipLeft = hover == null ? 0 : (x(hover) / W) * 100;

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block w-full overflow-visible"
        style={{ height }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchMove={onMove}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          {series.map((s, k) => (
            <linearGradient key={k} id={`${gid}g${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.colour} stopOpacity=".12" />
              <stop offset="100%" stopColor={s.colour} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="var(--color-border)"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {series.map((s, k) => {
          const line = smoothPath(s.values.map((v, i) => [x(i), y(v)]));
          return (
            <g key={k}>
              <path d={`${line} L${x(n - 1)} ${H - PAD_Y} L${x(0)} ${H - PAD_Y} Z`} fill={`url(#${gid}g${k})`} />
              <path d={line} fill="none" stroke={s.colour} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
        {hover != null && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD_Y} y2={H - PAD_Y} stroke="var(--color-border-interactive)" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {/* Hover dots are HTML so they stay round under the stretched SVG. */}
      {hover != null &&
        series.map((s, k) => (
          <span
            key={k}
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface"
            style={{ left: `${tipLeft}%`, top: `${(y(s.values[hover]) / H) * 100}%`, borderColor: s.colour }}
          />
        ))}
      {hover != null && (
        <div
          className="pointer-events-none absolute z-10 min-w-32 -translate-x-1/2 -translate-y-[118%] rounded-tile bg-ui-900 px-3 py-2 text-body-12 text-ui-50 shadow-toast"
          style={{ left: `${Math.min(88, Math.max(12, tipLeft))}%`, top: `${tipTop}%` }}
        >
          <div className="mb-1 font-semibold">{labels[hover]}</div>
          {series.map((s, k) => (
            <div key={k} className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
              <i className="inline-block size-2 rounded-full" style={{ background: s.colour }} />
              <span className="tabular-nums">{s.format ? s.format(s.values[hover]) : s.values[hover]}</span>
              <span className="text-ui-400">{s.name}</span>
            </div>
          ))}
        </div>
      )}
      <div className="relative mt-2 h-4 text-[11px] text-text-muted" aria-hidden="true">
        {labels.map((l, i) =>
          (i % tickEvery === 0 && n - 1 - i >= tickEvery / 2) || i === n - 1 ? (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={{
                left: `${(x(i) / W) * 100}%`,
                transform: i === 0 ? 'none' : i === n - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {l}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; colour: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 text-body-12 text-text-secondary">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: it.colour }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
