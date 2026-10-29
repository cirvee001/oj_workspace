import { useMemo, useState } from 'react';
import { Alert, Button, Field, FormGrid, Input, KeyValue, KeyValueList, Note, Select, Sheet } from '@/components/ui';
import { ORDER_CHANNELS, PAYMENT_METHODS, SIZES } from '@/config/constants';
import { isoFromToday } from '@/lib/dates';
import { naira, qty, toKobo } from '@/lib/format';
import type { Channel, PaymentMethod, Size } from '@/types/domain';
import { useGo } from '@/hooks/useGo';
import { useApp } from '@/store/hooks';
import { materialOf, myBranch, stockOf, styleOf } from '@/store/selectors';
import { saveOrder } from '@/store/actions/orders';
import { closeSheet, openSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'new-order-form';

export function NewOrderSheet({ customerId, enquiryId }: { customerId?: string; enquiryId?: string }) {
  const s = useApp();
  const go = useGo();
  const fabrics = s.materials.filter((m) => m.kind === 'Fabric');
  const enquiry = enquiryId ? s.enquiries.find((x) => x.id === enquiryId) : undefined;
  const startStyle = (enquiry && s.styles.find((x) => x.id === enquiry.style)) ?? s.styles[0];
  const startCustomer = enquiry?.customer ?? customerId ?? '';
  const startChannel: Channel =
    enquiry?.source ?? s.customers.find((c) => c.id === startCustomer)?.channel ?? ORDER_CHANNELS[0] ?? 'Instagram';

  const [customer, setCustomer] = useState(startCustomer);
  const [find, setFind] = useState('');
  const [channel, setChannel] = useState<Channel>(startChannel);
  const [style, setStyle] = useState(startStyle?.id ?? '');
  const [size, setSize] = useState<Size>('XL');
  const [material, setMaterial] = useState(fabrics[0]?.id ?? '');
  const [due, setDue] = useState(isoFromToday(startStyle?.days ?? 0));
  const [price, setPrice] = useState(enquiry ? String(enquiry.value / 100) : startStyle ? String(startStyle.price / 100) : '');
  const [deposit, setDeposit] = useState('0');
  const [method, setMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0] ?? 'Cash');

  /* Every customer, sorted by name; the search narrows the list but never hides the one chosen. */
  const sorted = useMemo(() => [...s.customers].sort((a, b) => a.name.localeCompare(b.name)), [s.customers]);
  const needle = find.trim().toLowerCase();
  const options = needle
    ? sorted.filter((c) => c.id === customer || (c.name + ' ' + c.phone).toLowerCase().includes(needle))
    : sorted;

  const st = styleOf(s, style);
  const m = materialOf(s, material);
  const need = st.specs[size];
  const have = stockOf(s, m.id, myBranch(s));
  const dep = toKobo(deposit);
  const half = toKobo(price) / 2;
  const short = have < need;
  const depositMet = dep >= half;

  const pickStyle = (id: string) => {
    setStyle(id);
    setPrice(String(styleOf(s, id).price / 100));
    setDue(isoFromToday(styleOf(s, id).days));
  };

  const pickCustomer = (id: string) => {
    setCustomer(id);
    const c = s.customers.find((x) => x.id === id);
    if (c && !enquiry && (ORDER_CHANNELS as readonly Channel[]).includes(c.channel)) setChannel(c.channel);
  };

  const submit = () => {
    const id = saveOrder({
      customer,
      channel,
      style,
      size,
      material,
      due,
      priceNaira: price,
      depositNaira: deposit,
      depositMethod: method,
      fromEnquiry: enquiry?.id,
    });
    if (id) go('workshop');
  };

  /* An enquiry can come from a referral, which is not an order channel; keep it selectable. */
  const channels: readonly Channel[] = ORDER_CHANNELS.includes(channel) ? ORDER_CHANNELS : [...ORDER_CHANNELS, channel];

  return (
    <Sheet
      title="New order"
      description="Who it is for, what to make and what they paid today."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            Save order
          </Button>
        </>
      }
    >
      {enquiry && (
        <Note className="mt-0 mb-4">
          From enquiry {enquiry.id} · {enquiry.name}. Saving marks the enquiry converted.
        </Note>
      )}
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormGrid>
          <Field
            label="Customer"
            full
            hint={
              <Button variant="link" className="text-body-12" onClick={() => openSheet({ type: 'customerForm', then: 'newOrder' })}>
                + Add a new customer
              </Button>
            }
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="search"
                aria-label="Find a customer"
                placeholder="Find by name or phone"
                containerClassName="sm:max-w-56"
                value={find}
                onChange={(e) => setFind(e.target.value)}
              />
              <Select
                aria-label="Customer"
                containerClassName="flex-1"
                value={customer}
                onChange={(e) => pickCustomer(e.target.value)}
              >
                {!customer && <option value="">Choose a customer…</option>}
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
                {needle && options.length === 0 && (
                  <option value="" disabled>
                    No one matches “{find}”
                  </option>
                )}
              </Select>
            </div>
          </Field>
          <Field label="Came from">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {channels.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Style">
            <Select value={style} onChange={(e) => pickStyle(e.target.value)}>
              {s.styles.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Size">
            <Select value={size} onChange={(e) => setSize(e.target.value as Size)}>
              {SIZES.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fabric">
            <Select value={material} onChange={(e) => setMaterial(e.target.value)}>
              {fabrics.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({qty(stockOf(s, f.id, myBranch(s)))} {f.unit} left)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ready by">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Price">
            <Input type="number" prefix="₦" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Deposit now">
            <Input type="number" prefix="₦" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
          <Field label="Deposit paid by">
            <Select value={method} disabled={dep <= 0} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
        </FormGrid>
      </form>

      <div className="mt-5 rounded-tile bg-surface-sunken px-4 py-2">
        <KeyValueList>
          <KeyValue label="Fabric this style and size needs">{qty(need)} yards</KeyValue>
          <KeyValue label={m.name + ' in the store'} tone={short ? 'danger' : undefined}>
            {qty(have)} yards{short ? ' — not enough' : ''}
          </KeyValue>
          <KeyValue label="Usual time to make">{st.days} days</KeyValue>
          <KeyValue label="Deposit rule" total tone={depositMet ? 'success' : 'warning'}>
            {depositMet ? 'met' : naira(half) + ' needed before cutting'}
          </KeyValue>
        </KeyValueList>
      </div>

      {(short || !depositMet) && (
        <div className="mt-3 flex flex-col gap-2">
          {short && (
            <Alert tone="danger" title="Not enough fabric">
              {m.name} has {qty(have)} yards here; this needs {qty(need)}.
            </Alert>
          )}
          {!depositMet && (
            <Alert tone="warning" title="Deposit rule not met">
              {naira(half)} needed before cutting.
            </Alert>
          )}
        </div>
      )}
    </Sheet>
  );
}
