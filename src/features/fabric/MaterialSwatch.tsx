import type { Material } from '@/types/domain';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * A small square of the actual cloth or trim, so the store is recognised by
 * sight, not by name. Materials added without a photo get a quiet placeholder.
 */
export function MaterialSwatch({ material, size = 40, className }: { material: Material; size?: number; className?: string }) {
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-tag bg-surface-sunken text-text-muted shadow-card', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {material.photo ? (
        <img src={material.photo} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <Icon name={material.kind === 'Trim' ? 'spark' : 'layers'} size={Math.round(size * 0.42)} />
      )}
    </span>
  );
}
