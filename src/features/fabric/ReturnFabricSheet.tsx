import { useState, type FormEvent } from 'react';
import { Button, Field, FormGrid, Input, KeyValue, KeyValueList, Select, Sheet } from '@/components/ui';
import { WASTE_CATEGORIES } from '@/config/constants';
import { qty } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { materialOf, nameOf } from '@/store/selectors';
import { saveReturn, unaccounted } from '@/store/actions/fabric';
import { closeSheet } from '@/store/ui/sheetStore';
import type { WasteCategory } from '@/types/domain';

const FORM_ID = 'return-fabric-form';

export function ReturnFabricSheet({ issueId }: { issueId: string }) {
  const s = useApp();
  const i = s.issues.find((x) => x.id === issueId);
  const [used, setUsed] = useState(() => qty(i?.expected));
  const [back, setBack] = useState('0');
  const [waste, setWaste] = useState('0');
  const [cat, setCat] = useState<WasteCategory>('Normal offcuts');
  const [reason, setReason] = useState('');

  if (!i) return null;

  const issued = i.issued ?? 0;
  const nums = { used: Number(used || 0), back: Number(back || 0), waste: Number(waste || 0) };
  const gap = unaccounted(issued, nums);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    saveReturn(issueId, { ...nums, cat, reason });
  };

  return (
    <Sheet
      title="Bring back leftovers"
      tag={'Job ' + i.job}
      description="Say where every yard that was given out went."
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            Close this off
          </Button>
        </>
      }
    >
      <KeyValueList columns={2} className="mb-5">
        <KeyValue label="Job">{i.job}</KeyValue>
        <KeyValue label="Fabric">{materialOf(s, i.material).name}</KeyValue>
        <KeyValue label="Who took it">{nameOf(s, i.to)}</KeyValue>
        <KeyValue label="Given out">{qty(issued) + ' yards'}</KeyValue>
      </KeyValueList>

      <form id={FORM_ID} onSubmit={submit}>
        <FormGrid>
          <Field label="Used in the garment">
            <Input type="number" step="0.1" suffix="yd" value={used} onChange={(e) => setUsed(e.target.value)} />
          </Field>
          <Field label="Good fabric returned">
            <Input type="number" step="0.1" suffix="yd" value={back} onChange={(e) => setBack(e.target.value)} />
          </Field>
          <Field label="Offcuts and waste">
            <Input type="number" step="0.1" suffix="yd" value={waste} onChange={(e) => setWaste(e.target.value)} />
          </Field>
          <Field label="The waste was">
            <Select value={cat} onChange={(e) => setCat(e.target.value as WasteCategory)}>
              {WASTE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </FormGrid>

        <div className="mt-5 rounded-tile bg-surface-sunken px-4 py-1.5">
          <KeyValueList>
            <KeyValue label="Given out">{qty(issued)}</KeyValue>
            <KeyValue label="Used">{qty(nums.used)}</KeyValue>
            <KeyValue label="Returned">{qty(nums.back)}</KeyValue>
            <KeyValue label="Waste">{qty(nums.waste)}</KeyValue>
            <KeyValue
              label={gap > 0 ? 'Not accounted for' : gap < 0 ? 'More than was given out' : 'Everything adds up'}
              total
              tone={gap > 0 ? 'danger' : gap < 0 ? 'warning' : 'success'}
            >
              {qty(Math.abs(gap)) + ' yards'}
            </KeyValue>
          </KeyValueList>
        </div>

        {gap > 0 && (
          <Field label="What happened to the rest?" className="mt-5">
            <Input placeholder="Say what happened to it" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}
      </form>
    </Sheet>
  );
}
