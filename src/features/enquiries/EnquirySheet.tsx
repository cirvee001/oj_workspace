import { useState } from 'react';
import { Alert, Button, Field, KeyValue, KeyValueList, Select, Sheet } from '@/components/ui';
import { ENQUIRY_STAGES, enquiryStageName } from '@/config/constants';
import { dueDate, niceDate } from '@/lib/dates';
import { naira } from '@/lib/format';
import type { EnquiryStage } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { can, nameOf, styleOf } from '@/store/selectors';
import { moveEnquiry } from '@/store/actions/sales';
import { closeSheet, openSheet } from '@/store/ui/sheetStore';

export function EnquirySheet({ id }: { id: string }) {
  const s = useApp();
  const e = s.enquiries.find((x) => x.id === id);
  const [stage, setStage] = useState<EnquiryStage>(e?.stage ?? 'new');
  if (!e) return null;

  return (
    <Sheet
      title={e.name}
      tag={enquiryStageName(e.stage)}
      description="What they asked about and where things stand."
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Close
          </Button>
          <Button variant="secondary" leftIcon="check" onClick={() => moveEnquiry(id, stage)}>
            Save
          </Button>
          {e.stage !== 'converted' && can(s, 'order') && (
            <Button leftIcon="receipt" onClick={() => openSheet({ type: 'newOrder', enquiryId: id })}>
              Turn into an order
            </Button>
          )}
        </>
      }
    >
      <KeyValueList>
        <KeyValue label="Phone">{e.phone}</KeyValue>
        <KeyValue label="Came from">{e.source}</KeyValue>
        <KeyValue label="Interested in">{styleOf(s, e.style).name}</KeyValue>
        <KeyValue label="Looked after by">{nameOf(s, e.owner)}</KeyValue>
        <KeyValue label="Last spoke">{niceDate(e.lastContact)}</KeyValue>
        <KeyValue label="Follow up">{dueDate(e.nextFollowUp)}</KeyValue>
        <KeyValue label="Worth about" total>
          {naira(e.value)}
        </KeyValue>
      </KeyValueList>

      <Alert tone="info" title="What they said" className="my-4">
        {e.note}
      </Alert>

      <Field label="Where are we with them">
        <Select value={stage} onChange={(ev) => setStage(ev.target.value as EnquiryStage)}>
          {ENQUIRY_STAGES.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
    </Sheet>
  );
}
