import { useState } from 'react';
import type { LeaveKind } from '@/types/domain';
import { Button, Field, FormGrid, Input, Select, Sheet } from '@/components/ui';
import { LEAVE_KINDS } from '@/config/constants';
import { isoFromToday } from '@/lib/dates';
import { requestLeave } from '@/store/actions/people';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'ask-leave-form';

/** Ask for time off. Goes to a manager in Approvals. */
export function AskLeaveSheet() {
  const [kind, setKind] = useState<LeaveKind>(LEAVE_KINDS[0]);
  const [from, setFrom] = useState(() => isoFromToday(7));
  const [to, setTo] = useState(() => isoFromToday(11));
  const [reason, setReason] = useState('');

  return (
    <Sheet
      title="Ask for time off"
      description="Goes to a manager in Approvals."
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            Send the request
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          requestLeave({ kind, from, to, reason });
        }}
      >
        <FormGrid>
          <Field label="Type" full>
            <Select value={kind} onChange={(e) => setKind(e.target.value as LeaveKind)}>
              {LEAVE_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </Select>
          </Field>
          <Field label="First day">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Last day">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Reason" full>
            <Input placeholder="Family wedding" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}
