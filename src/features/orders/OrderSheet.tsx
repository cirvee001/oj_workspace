import { useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  Figure,
  IconChip,
  Input,
  KeyValue,
  KeyValueList,
  List,
  ListItem,
  SectionHeader,
  Select,
  Sheet,
} from '@/components/ui';
import { PAYMENT_METHODS, stageName } from '@/config/constants';
import { niceDate } from '@/lib/dates';
import { naira } from '@/lib/format';
import type { PaymentMethod } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { can, customerOf, materialOf, orderOf, styleOf, balanceOf } from '@/store/selectors';
import { cancelOrder, takePayment } from '@/store/actions/orders';
import { openSheet } from '@/store/ui/sheetStore';

export function OrderSheet({ id }: { id: string }) {
  const s = useApp();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const o = orderOf(s, id);
  if (!o) return null;

  const c = customerOf(s, o.customer);
  const job = s.jobs.find((j) => j.order === id);
  const pays = s.payments.filter((p) => p.order === id);
  const bal = balanceOf(o);
  const seePhone = can(s, 'customer') || can(s, 'order');
  const cancelled = o.status === 'cancelled';
  const status = cancelled ? 'Cancelled' : o.status === 'delivered' ? 'Delivered' : bal > 0 ? 'Owing' : 'Paid';
  const canCancel = o.status === 'making' && can(s, 'approve');

  return (
    <Sheet
      title={'Order ' + id}
      tag={status}
      tagTone={cancelled ? 'danger' : status === 'Owing' ? 'warning' : status === 'Paid' ? 'success' : 'neutral'}
      description="What was ordered, what has been paid and where it is now."
      footer={
        (job || canCancel) && (
          <>
            {canCancel && (
              <Button variant="danger" className="mr-auto" onClick={() => void cancelOrder(id)}>
                Cancel order
              </Button>
            )}
            {job && (
              <Button variant="secondary" leftIcon="scissors" onClick={() => openSheet({ type: 'job', id: job.id })}>
                Open the job
              </Button>
            )}
          </>
        )
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-tile bg-surface-sunken p-3.5">
        <Avatar name={c.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-14 font-semibold text-text">{c.name}</p>
          <p className="truncate text-body-13 text-text-secondary">
            {styleOf(s, o.style).name} · size {o.size}
          </p>
        </div>
        {cancelled ? (
          <Badge tone="danger">cancelled</Badge>
        ) : bal > 0 ? (
          <Badge tone="danger">owing {naira(bal)}</Badge>
        ) : (
          <Badge tone="success">paid</Badge>
        )}
      </div>

      {cancelled && (
        <Alert tone="danger" title="Cancelled" className="mb-4">
          {o.cancelReason || 'No reason was given.'} The {naira(o.paid)} already paid was kept; nothing more is owed.
        </Alert>
      )}

      <KeyValueList>
        <KeyValue label="Customer">{c.name}</KeyValue>
        <KeyValue label="Phone">{seePhone ? c.phone : 'hidden'}</KeyValue>
        <KeyValue label="Making">
          {styleOf(s, o.style).name} · size {o.size}
        </KeyValue>
        <KeyValue label="Fabric">{materialOf(s, o.material).name}</KeyValue>
        <KeyValue label="Came from">{o.channel}</KeyValue>
        <KeyValue label="Ready by">{niceDate(o.due)}</KeyValue>
        <KeyValue label="Now at">{cancelled ? 'cancelled' : job ? stageName(job.stage) : '—'}</KeyValue>
        <KeyValue label={cancelled ? 'Price (after cancelling)' : 'Price'}>{naira(o.total)}</KeyValue>
        <KeyValue label="Paid so far">{naira(o.paid)}</KeyValue>
        <KeyValue label="Still owing" total tone={bal > 0 ? 'danger' : 'success'}>
          {bal > 0 ? naira(bal) : 'nothing'}
        </KeyValue>
      </KeyValueList>

      <SectionHeader title="Payments" className="mt-6" />
      {pays.length ? (
        <List bare className="-mx-4 md:-mx-5">
          {pays.map((p, i) => (
            <ListItem
              key={i}
              leading={<IconChip icon="wallet" tone="success" />}
              title={p.method}
              description={niceDate(p.when)}
              trailing={<Figure value={naira(p.amount)} />}
            />
          ))}
        </List>
      ) : (
        <EmptyState title="Nothing paid yet" icon="wallet" size="sm" className="rounded-tile bg-surface-sunken" />
      )}

      {bal > 0 && can(s, 'order') && (
        <form
          className="mt-4 flex flex-wrap items-center gap-2 rounded-tile bg-surface-sunken p-3"
          onSubmit={(e) => {
            e.preventDefault();
            takePayment(id, amount, method);
          }}
        >
          <Input
            type="number"
            prefix="₦"
            placeholder="Amount in naira"
            aria-label="Amount in naira"
            containerClassName="min-w-40 flex-1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Select
            aria-label="Paid by"
            containerClassName="w-auto min-w-36"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          <Button type="submit" leftIcon="plus">
            Take payment
          </Button>
        </form>
      )}
    </Sheet>
  );
}
