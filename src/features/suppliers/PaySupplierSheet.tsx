import { useState, type FormEvent } from 'react';
import { Button, EmptyState, Field, FormGrid, Input, KeyValue, KeyValueList, Select, Sheet } from '@/components/ui';
import { PAYMENT_METHODS } from '@/config/constants';
import { naira, toKobo } from '@/lib/format';
import { useApp } from '@/store/hooks';
import { supplierOf } from '@/store/selectors';
import { paySupplier } from '@/store/actions/buying';
import { closeSheet } from '@/store/ui/sheetStore';
import type { PaymentMethod } from '@/types/domain';

const FORM_ID = 'pay-supplier-form';

export function PaySupplierSheet({ id }: { id: string }) {
  const s = useApp();
  const sup = supplierOf(s, id);

  const [amount, setAmount] = useState(() => String(sup.owed / 100));
  const [method, setMethod] = useState<PaymentMethod>('Transfer');
  const [note, setNote] = useState('');

  const left = Math.max(0, sup.owed - toKobo(amount));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    paySupplier(id, amount, method, note);
  };

  return (
    <Sheet
      title={'Pay ' + sup.name}
      description="Paying a debt is not a new cost — it was counted when the goods arrived."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            {sup.owed > 0 ? 'Cancel' : 'Close'}
          </Button>
          {sup.owed > 0 && (
            <Button type="submit" form={FORM_ID} leftIcon="wallet">
              Record payment
            </Button>
          )}
        </>
      }
    >
      {sup.owed > 0 ? (
        <form id={FORM_ID} onSubmit={submit}>
          <KeyValueList className="mb-5">
            <KeyValue label="You owe them" tone="danger">
              {naira(sup.owed)}
            </KeyValue>
            <KeyValue label="Terms">{sup.terms}</KeyValue>
          </KeyValueList>
          <FormGrid>
            <Field label="Amount" hint={left > 0 ? naira(left) + ' will still be owed' : 'Clears the balance'}>
              <Input type="number" min="0" step="1" prefix="₦" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="How">
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note" optional full>
              <Input placeholder="Bank reference or receipt number" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </FormGrid>
        </form>
      ) : (
        <EmptyState icon="check" size="sm" title="Nothing owed" message={'You are square with ' + sup.name + '.'} />
      )}
    </Sheet>
  );
}
