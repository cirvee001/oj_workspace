import { useState } from 'react';
import { Button, Field, FormGrid, Input, Select, Sheet } from '@/components/ui';
import { EXPENSE_CATEGORIES } from '@/config/constants';
import { recordExpense, submitExpense } from '@/store/actions/people';
import { useCan } from '@/store/hooks';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'add-expense-form';

/** Record a running cost against this branch, or, without money rights, send one for approval. */
export function AddExpenseSheet() {
  const direct = useCan('money');
  const [what, setWhat] = useState('');
  const [cat, setCat] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');

  return (
    <Sheet
      title={direct ? 'Record a cost' : 'Submit a cost'}
      description={direct ? 'A running cost against this branch.' : 'Something you paid for the branch. Finance or a manager approves it.'}
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon={direct ? 'check' : 'send'}>
            {direct ? 'Save' : 'Send for approval'}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          (direct ? recordExpense : submitExpense)({ what, cat, amountNaira: amount });
        }}
      >
        <FormGrid>
          <Field label="What was it for" full>
            <Input placeholder="Generator diesel" value={what} onChange={(e) => setWhat(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Amount">
            <Input
              prefix="₦"
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="0"
              className="tabular-nums"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}
