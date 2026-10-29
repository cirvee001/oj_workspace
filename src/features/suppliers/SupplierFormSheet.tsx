import { useState, type FormEvent } from 'react';
import { Button, Field, FormGrid, Input, Select, Sheet } from '@/components/ui';
import { useApp } from '@/store/hooks';
import { createSupplier, updateSupplier } from '@/store/actions/buying';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'supplier-form';
const TERMS = ['On delivery', '50% upfront', 'Cash', '30 days'];
const RATINGS = [
  { value: 5, label: '5 — excellent' },
  { value: 4, label: '4 — good' },
  { value: 3, label: '3 — fair' },
  { value: 2, label: '2 — unreliable' },
  { value: 1, label: '1 — poor' },
];

/** Add a supplier (no id) or edit one. */
export function SupplierFormSheet({ id }: { id?: string }) {
  const s = useApp();
  const existing = id ? s.suppliers.find((x) => x.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [terms, setTerms] = useState(existing?.terms ?? TERMS[0]);
  const [rating, setRating] = useState(existing?.rating ?? 4);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = { name, phone, terms, rating };
    if (existing) updateSupplier(existing.id, input);
    else createSupplier(input);
  };

  return (
    <Sheet
      title={existing ? 'Edit supplier' : 'Add a supplier'}
      description={existing ? 'Change their details. What you owe them is kept.' : 'Someone you buy fabric or trims from.'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            {existing ? 'Save' : 'Add supplier'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <FormGrid>
          <Field label="Name" full>
            <Input autoFocus placeholder="Balogun Textiles" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone" full>
            <Input type="tel" placeholder="0802 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Payment terms" hint="How they expect to be paid">
            <Input list="supplier-terms" value={terms} onChange={(e) => setTerms(e.target.value)} />
          </Field>
          <Field label="Rating">
            <Select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {RATINGS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <datalist id="supplier-terms">
          {TERMS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </form>
    </Sheet>
  );
}
