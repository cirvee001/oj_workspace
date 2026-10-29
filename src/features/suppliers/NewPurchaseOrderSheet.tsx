import { useState, type FormEvent } from 'react';
import { Button, Field, FormGrid, Input, KeyValue, KeyValueList, Select, Sheet } from '@/components/ui';
import { isoFromToday, TODAY } from '@/lib/dates';
import { naira, qty, toKobo } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, materialOf, myBranch, stockOf } from '@/store/selectors';
import { createPurchaseOrder } from '@/store/actions/buying';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'new-purchase-order-form';

/** Naira as typed into a form, from kobo. */
const toNairaInput = (kobo: number): string => String(kobo / 100);

export function NewPurchaseOrderSheet({ materialId }: { materialId?: string }) {
  const s = useApp();
  const here = myBranch(s);

  const first = materialId && s.materials.some((m) => m.id === materialId) ? materialId : (s.materials[0]?.id ?? '');
  const [material, setMaterial] = useState(first);
  const [supplier, setSupplier] = useState(() => materialOf(s, first).supplier || (s.suppliers[0]?.id ?? ''));
  const [amount, setAmount] = useState(() => {
    const m = materialOf(s, first);
    const short = m.reorder * 2 - stockOf(s, first, here);
    return qty(Math.max(1, Math.ceil(short)));
  });
  const [cost, setCost] = useState(() => toNairaInput(materialOf(s, first).cost));
  const [expected, setExpected] = useState(() => isoFromToday(5));

  const m = materialOf(s, material);
  const have = stockOf(s, material, here);
  const total = Number(amount || 0) * toKobo(cost);

  const pickMaterial = (id: string) => {
    const next = materialOf(s, id);
    setMaterial(id);
    if (next.supplier) setSupplier(next.supplier);
    setCost(toNairaInput(next.cost));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    createPurchaseOrder({ supplier, material, qty: Number(amount || 0), costNaira: cost, expected });
  };

  return (
    <Sheet
      title="New purchase order"
      tag={'For ' + branchName(s, here)}
      description="Send an order to a supplier. Record what arrives when it comes."
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="send">
            Send order
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <FormGrid>
          <Field
            label="Fabric or trim"
            full
            hint={qty(have) + ' ' + m.unit + ' here · order more at ' + qty(m.reorder)}
          >
            <Select value={material} onChange={(e) => pickMaterial(e.target.value)}>
              {s.materials.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Supplier" full hint={supplier === m.supplier ? 'Who you usually buy it from' : undefined}>
            <Select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              {s.suppliers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How much">
            <Input type="number" min="0" step="0.5" suffix={m.unit} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={'Cost per ' + m.unit.replace(/s$/, '')}>
            <Input type="number" min="0" step="1" prefix="₦" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label="Expected by" full>
            <Input type="date" min={TODAY} value={expected} onChange={(e) => setExpected(e.target.value)} />
          </Field>
        </FormGrid>
        <KeyValueList className="mt-5">
          <KeyValue label="Order total" total hint={qty(Number(amount || 0)) + ' ' + m.unit + ' × ' + naira(toKobo(cost))}>
            {naira(total)}
          </KeyValue>
        </KeyValueList>
      </form>
    </Sheet>
  );
}
