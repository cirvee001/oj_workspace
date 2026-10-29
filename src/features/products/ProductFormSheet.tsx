import { useState, type FormEvent } from 'react';
import { Button, Field, FormGrid, IconButton, Input, Select, Sheet, Switch } from '@/components/ui';
import { SIZES, SWATCH } from '@/config/constants';
import { useApp } from '@/store/hooks';
import { createProduct, updateProduct } from '@/store/actions/buying';
import { closeSheet } from '@/store/ui/sheetStore';
import type { GarmentShape } from '@/types/domain';
import { Garment } from './Garment';

const FORM_ID = 'product-form';
const SHAPES: { value: GarmentShape; label: string }[] = [
  { value: 'dress', label: 'Dress' },
  { value: 'shirt', label: 'Shirt or top' },
  { value: 'wrap', label: 'Wrap, cap or accessory' },
];
const SIZE_OPTIONS = [...SIZES, 'One'];
const COLOURS = Object.keys(SWATCH);

/** Stable React keys for variant rows. */
let seq = 0;
const newKey = () => ++seq;

interface Row {
  key: number;
  size: string;
  colour: string;
  /** Existing rows show their stock and are kept by size + colour. */
  stock?: number;
}

/** Add a ready-to-wear piece (no id) or edit one. Managers only. */
export function ProductFormSheet({ id }: { id?: string }) {
  const s = useApp();
  const existing = id ? s.products.find((p) => p.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing ? String(existing.price / 100) : '');
  const [shape, setShape] = useState<GarmentShape>(existing?.shape ?? 'dress');
  const [patterned, setPatterned] = useState(existing?.patterned ?? false);
  const [rows, setRows] = useState<Row[]>(() =>
    existing
      ? existing.variants.map((v) => ({
          key: newKey(),
          size: v.size,
          colour: v.colour,
          stock: Object.values(v.stock).reduce((n, x) => n + x, 0),
        }))
      : [{ key: newKey(), size: 'M', colour: COLOURS[0] ?? '' }],
  );

  const setRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { key: newKey(), size: rs[rs.length - 1]?.size ?? 'M', colour: rs[rs.length - 1]?.colour ?? COLOURS[0] ?? '' }]);
  const removeRow = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = { name, priceNaira: price, shape, patterned, variants: rows.map((r) => ({ size: r.size, colour: r.colour })) };
    if (existing) updateProduct(existing.id, input);
    else createProduct(input);
  };

  return (
    <Sheet
      title={existing ? 'Edit ' + existing.name : 'Add a product'}
      tag={existing?.sku}
      description={existing ? 'Stock is kept for sizes you leave in.' : 'A finished piece for the rail. New sizes start with no stock.'}
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            {existing ? 'Save' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <div className="flex gap-5">
          <div className="hidden size-28 shrink-0 overflow-hidden rounded-tile bg-surface-sunken sm:block">
            <Garment shape={shape} colour={rows[0]?.colour ?? ''} patterned={patterned} id={existing?.id ?? 'new'} />
          </div>
          <FormGrid className="flex-1">
            <Field label="Name" full>
              <Input autoFocus placeholder="Ankara Bustier Dress" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Selling price">
              <Input type="number" min="0" step="100" prefix="₦" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Field label="Shape">
              <Select value={shape} onChange={(e) => setShape(e.target.value as GarmentShape)}>
                {SHAPES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Switch checked={patterned} onChange={setPatterned} label="Patterned fabric" showLabel />
            </div>
          </FormGrid>
        </div>

        <div className="stitch mt-6 mb-3 flex items-center justify-between gap-3 border-b pb-2">
          <h3 className="text-eyebrow text-text-secondary">Sizes and colours</h3>
          <Button size="sm" variant="ghost" leftIcon="plus" onClick={addRow}>
            Add a size
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 flex-none rounded-full ring-1 ring-border-strong"
                style={{ background: SWATCH[r.colour] ?? 'var(--color-text-muted)' }}
              />
              <Select aria-label={'Size, row ' + (i + 1)} value={r.size} containerClassName="w-28 shrink-0" onChange={(e) => setRow(r.key, { size: e.target.value })}>
                {SIZE_OPTIONS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
              <Select aria-label={'Colour, row ' + (i + 1)} value={r.colour} onChange={(e) => setRow(r.key, { colour: e.target.value })}>
                {COLOURS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <span className="w-20 shrink-0 text-right text-body-12 text-text-muted tabular-nums">
                {r.stock === undefined ? 'new' : r.stock + ' in stock'}
              </span>
              <IconButton
                icon="x"
                label={'Remove ' + r.size + ' ' + r.colour}
                disabled={rows.length === 1}
                onClick={() => removeRow(r.key)}
              />
            </li>
          ))}
        </ul>
      </form>
    </Sheet>
  );
}
