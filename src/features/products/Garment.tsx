import { useId } from 'react';
import type { GarmentShape } from '@/types/domain';
import { SWATCH } from '@/config/constants';
import { cn } from '@/lib/cn';

interface GarmentProps {
  shape: GarmentShape;
  colour: string;
  patterned: boolean;
  /** Product id, folded into the SVG pattern id for readability in the DOM. */
  id: string;
  className?: string;
}

const BODY: Record<GarmentShape, string> = {
  dress: 'M38 22 52 14l10 6 10-6 14 8-8 16-6-3 5 51H39l5-51-6 3z',
  shirt: 'M36 24 52 15l8 7 8-7 16 9-7 15-7-3v45H43V45l-7 3z',
  wrap: 'M30 40c14-12 46-12 60 0 6 5 6 22 0 27-14 12-46 12-60 0-6-5-6-22 0-27z',
};

/**
 * A garment silhouette in its actual colour (and pattern), shown until a real
 * photo is added.
 */
export function Garment({ shape, colour, patterned, id, className }: GarmentProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const c = SWATCH[colour] ?? '#8A9691';
  const pid = 'p' + id.replace(/[^a-z0-9]/gi, '') + shape + uid;
  const body = BODY[shape];

  return (
    <svg viewBox="0 0 120 108" aria-hidden="true" className={cn('block size-full object-cover', className)}>
      {patterned && (
        <defs>
          <pattern id={pid} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={c} />
            <path d="M0 4h8M4 0v8" stroke="rgba(255,255,255,.34)" strokeWidth="1.1" />
            <circle cx="4" cy="4" r="1.2" fill="rgba(255,255,255,.4)" />
          </pattern>
        </defs>
      )}
      <rect width="120" height="108" fill="var(--color-surface-sunken)" />
      <g fill={patterned ? `url(#${pid})` : c} stroke="rgba(0,0,0,.16)" strokeWidth="1.2" strokeLinejoin="round">
        {body ? <path d={body} /> : <rect x="38" y="20" width="44" height="70" rx="6" />}
      </g>
    </svg>
  );
}
