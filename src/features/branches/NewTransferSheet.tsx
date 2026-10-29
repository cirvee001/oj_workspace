import { useState, type FormEvent } from 'react';
import { Button, Field, FormGrid, Input, Select, Sheet } from '@/components/ui';
import { qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { branchName, myBranch, stockOf } from '@/store/selectors';
import { requestTransfer } from '@/store/actions/stock';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'new-transfer-form';

export function NewTransferSheet() {
  const s = useApp();
  const here = myBranch(s);
  const others = s.branches.filter((b) => b.id !== here);

  const [material, setMaterial] = useState(() => s.materials[0]?.id ?? '');
  const [amount, setAmount] = useState('1');
  const [to, setTo] = useState(() => others[0]?.id ?? '');
  const [note, setNote] = useState('');

  const unit = s.materials.find((m) => m.id === material)?.unit;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    requestTransfer({ material, qty: Number(amount || 0), to, note });
  };

  return (
    <Sheet
      title="Move stock to another branch"
      tag={'From ' + branchName(s, here)}
      description="A manager approves the move before anything is sent."
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="truck">
            Ask to move it
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <FormGrid>
          <Field label="Fabric or trim" full>
            <Select value={material} onChange={(e) => setMaterial(e.target.value)}>
              {s.materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name + ' — ' + qty(stockOf(s, m.id, here)) + ' ' + m.unit + ' here'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How much">
            <Input type="number" step="0.5" suffix={unit} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Send to">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {others.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Why" optional full>
            <Input placeholder="They have run out" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}
