import { useMemo, useState } from 'react';
import { Button, Field, FormGrid, Input, Select, Sheet, Tabs, Textarea } from '@/components/ui';
import { ENQUIRY_CHANNELS } from '@/config/constants';
import type { Channel } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { saveEnquiry } from '@/store/actions/sales';
import { closeSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'new-enquiry-form';

type Who = 'new' | 'existing';

export function NewEnquirySheet() {
  const s = useApp();
  const customers = useMemo(() => [...s.customers].sort((a, b) => a.name.localeCompare(b.name)), [s.customers]);
  const [who, setWho] = useState<Who>('new');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState('');
  const [source, setSource] = useState<Channel>(ENQUIRY_CHANNELS[0] ?? 'Instagram');
  const [style, setStyle] = useState(s.styles[0]?.id ?? '');
  const [note, setNote] = useState('');

  const submit = () => {
    if (who === 'new') saveEnquiry({ who, name, phone, source, style, note });
    else saveEnquiry({ who, customer, source, style, note });
  };

  return (
    <Sheet
      title="Add an enquiry"
      description="Log someone who asked so they get a follow-up."
      footer={
        <>
          <Button variant="secondary" onClick={closeSheet}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            Save enquiry
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Tabs<Who>
          aria-label="Who is asking"
          className="mb-5"
          value={who}
          onChange={setWho}
          options={[
            { value: 'new', label: 'Someone new' },
            { value: 'existing', label: 'Existing customer' },
          ]}
        />
        <FormGrid>
          {who === 'new' ? (
            <>
              <Field label="Name">
                <Input value={name} placeholder="Adaeze Okafor" onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Phone" hint="They are added as a customer too.">
                <Input type="tel" inputMode="tel" value={phone} placeholder="0803 123 4567" onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </>
          ) : (
            <Field label="Who is asking" full>
              <Select value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">Choose a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.phone}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Where did they come from">
            <Select value={source} onChange={(e) => setSource(e.target.value as Channel)}>
              {ENQUIRY_CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Interested in">
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              {s.styles.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What did they say" full>
            <Textarea
              placeholder="Asked about an agbada for a wedding in December"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </FormGrid>
      </form>
    </Sheet>
  );
}
