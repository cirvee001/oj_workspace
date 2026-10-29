import { useState, type FormEvent } from 'react';
import { Button, EmptyState, Input, Sheet } from '@/components/ui';
import { SWATCH } from '@/config/constants';
import { plural } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, myBranch } from '@/store/selectors';
import { restockProduct } from '@/store/actions/buying';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'restock-form';

/** Add finished pieces to the rail at this branch. */
export function RestockSheet({ productId }: { productId: string }) {
  const s = useApp();
  const here = myBranch(s);
  const p = s.products.find((x) => x.id === productId);
  const [counts, setCounts] = useState<Record<string, string>>({});

  if (!p) {
    return (
      <Sheet title="Restock" size="sm">
        <EmptyState size="sm" title="Product not found" message="It may have been removed." />
      </Sheet>
    );
  }

  const keyOf = (v: { size: string; colour: string }) => v.size + '|' + v.colour;
  const total = p.variants.reduce((n, v) => n + Math.max(0, Math.floor(Number(counts[keyOf(v)] || 0))), 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    restockProduct(
      p.id,
      p.variants.map((v) => ({ size: v.size, colour: v.colour, qty: Number(counts[keyOf(v)] || 0) })),
    );
  };

  return (
    <Sheet
      title={'Restock ' + p.name}
      tag={p.sku}
      description={'Pieces that came in at ' + branchName(s, here) + '.'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="plus" disabled={total === 0}>
            {total ? 'Add ' + plural(total, 'piece') : 'Add pieces'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <ul className="divide-y divide-border border-y border-border">
          {p.variants.map((v) => {
            const k = keyOf(v);
            const have = v.stock[here] ?? 0;
            return (
              <li key={k} className="flex items-center gap-3 py-2.5">
                <span
                  aria-hidden="true"
                  className="size-3 flex-none rounded-full ring-1 ring-border-strong"
                  style={{ background: SWATCH[v.colour] ?? 'var(--color-text-muted)' }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-14 font-medium text-text">{v.size + ' · ' + v.colour}</span>
                  <span className="block text-body-12 text-text-muted tabular-nums">{have ? have + ' here now' : 'none here'}</span>
                </span>
                <Input
                  aria-label={'Pieces of ' + v.size + ' ' + v.colour}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  suffix="pcs"
                  containerClassName="w-28"
                  value={counts[k] ?? ''}
                  onChange={(e) => setCounts((c) => ({ ...c, [k]: e.target.value }))}
                />
              </li>
            );
          })}
        </ul>
      </form>
    </Sheet>
  );
}
