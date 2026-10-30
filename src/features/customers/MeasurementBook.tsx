import type { Customer } from '@/types/domain';
import { Badge, EmptyState } from '@/components/ui';
import { figureOf, groupsForStyle } from '@/config/measurements';
import { ago, longDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { useApp } from '@/store/hooks';
import { nameOf } from '@/store/selectors';

interface MeasurementBookProps {
  customer: Customer;
  /** Show only the groups this style needs (e.g. on a job). Omit for the whole book. */
  styleId?: string;
  /** Tighter tiles for side panels and job sheets. */
  compact?: boolean;
  className?: string;
}

/**
 * A customer's measurements laid out like the tailor's book: grouped by
 * garment, each value with the shorthand the workshop writes. Points not yet
 * taken show as a dash so gaps are obvious before cutting.
 */
export function MeasurementBook({ customer, styleId, compact, className }: MeasurementBookProps) {
  const s = useApp();
  const figure = figureOf(customer);
  const groups = groupsForStyle(figure, styleId);
  const taken = Object.keys(customer.sizes).length;

  if (!taken) {
    return (
      <EmptyState
        title="No measurements yet"
        message="Take them before the job goes to cutting."
        icon="scissors"
        size="sm"
        className={cn('rounded-tile bg-surface-sunken', className)}
      />
    );
  }

  const missing = groups.flatMap((g) => g.points).filter((p) => !(p.label in customer.sizes)).length;

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-12 text-text-muted">
        <Badge size="sm">{figure === 'women' ? "Women's book" : "Men's book"}</Badge>
        {customer.fit && <Badge size="sm">{customer.fit} fit</Badge>}
        {customer.measuredOn && (
          <span title={longDate(customer.measuredOn)}>
            Measured {ago(customer.measuredOn).toLowerCase()}
            {customer.measuredBy ? ' by ' + nameOf(s, customer.measuredBy) : ''}
          </span>
        )}
        {missing > 0 && <span className="text-warning-text">{missing} not taken yet</span>}
      </div>

      <div className={cn('grid gap-4', !compact && 'lg:grid-cols-2')}>
        {groups.map((g) => (
          <section key={g.id} className="min-w-0">
            <h4 className="mb-2 flex items-baseline gap-2">
              <span className="text-eyebrow text-text">{g.title}</span>
              <span className="truncate text-body-12 text-text-muted">{g.for}</span>
            </h4>
            {/* Tiles flow to the space they have, so labels never get cut off in a narrow column. */}
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-1.5">
              {g.points.map((p) => {
                const v = customer.sizes[p.label];
                return (
                  <div key={p.label} title={p.how} className="min-w-0 rounded-tag bg-surface-sunken px-3 py-2">
                    <dt className="flex items-baseline gap-1.5 text-body-12 text-text-muted">
                      <span className="font-semibold text-text-secondary">{p.code}</span>
                      <span className="truncate">{p.label}</span>
                    </dt>
                    <dd className={cn('mt-0.5 font-display tabular-nums', compact ? 'text-body-14' : 'text-body-15', v ? 'text-text' : 'text-text-muted')}>
                      {v ? v + '"' : '—'}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      {customer.fitNotes && (
        <p className="mt-3 rounded-tag border border-dashed border-border-strong px-3 py-2 text-body-13 text-text-secondary">
          <span className="font-semibold text-text">Tailor&rsquo;s note: </span>
          {customer.fitNotes}
        </p>
      )}
    </div>
  );
}
