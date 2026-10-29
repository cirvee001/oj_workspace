import { useState, type FormEvent } from 'react';
import { Button, Field, FormGrid, Input, Select, Sheet, Switch } from '@/components/ui';
import { useApp } from '@/store/hooks';
import { createMaterial, updateMaterial } from '@/store/actions/buying';
import { closeSheet } from '@/store/ui/sheetStore';
import type { Material } from '@/types/domain';

const FORM_ID = 'material-form';
const UNITS = ['yards', 'reels', 'pieces', 'packs', 'metres'];

/** Add a fabric or trim to the store list (no id) or edit one. */
export function MaterialFormSheet({ id }: { id?: string }) {
  const s = useApp();
  const existing = id ? s.materials.find((m) => m.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [kind, setKind] = useState<Material['kind']>(existing?.kind ?? 'Fabric');
  const [unit, setUnit] = useState(existing?.unit ?? 'yards');
  const [patterned, setPatterned] = useState(existing?.patterned ?? false);
  const [reorder, setReorder] = useState(String(existing?.reorder ?? 10));
  const [cost, setCost] = useState(existing ? String(existing.cost / 100) : '');
  const [supplier, setSupplier] = useState(existing?.supplier ?? s.suppliers[0]?.id ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const input = { name, kind, unit, patterned, reorder: Number(reorder || 0), costNaira: cost, supplier };
    if (existing) updateMaterial(existing.id, input);
    else createMaterial(input);
  };

  return (
    <Sheet
      title={existing ? 'Edit ' + existing.name : 'Add to the store list'}
      description={existing ? 'Stock levels are not changed here — count the store for that.' : 'It starts at nothing in every branch.'}
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            {existing ? 'Save' : 'Add it'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit}>
        <FormGrid>
          <Field label="Name" full>
            <Input autoFocus placeholder="Ankara Red Wax" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as Material['kind'])}>
              <option value="Fabric">Fabric</option>
              <option value="Trim">Trim</option>
            </Select>
          </Field>
          <Field label="Counted in">
            <Input list="material-units" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </Field>
          <Field label="Order more at" hint="Flagged low at or below this">
            <Input type="number" min="0" step="0.5" suffix={unit} value={reorder} onChange={(e) => setReorder(e.target.value)} />
          </Field>
          <Field label={'Cost per ' + (unit.replace(/s$/, '') || 'unit')}>
            <Input type="number" min="0" step="1" prefix="₦" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field label="Usual supplier" full>
            <Select value={supplier} onChange={(e) => setSupplier(e.target.value)}>
              {s.suppliers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Switch checked={patterned} onChange={setPatterned} label="Patterned (needs matching when cut)" showLabel />
          </div>
        </FormGrid>
        <datalist id="material-units">
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </form>
    </Sheet>
  );
}
