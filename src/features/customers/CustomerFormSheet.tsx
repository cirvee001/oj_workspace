import { useState } from 'react';
import { Button, Field, FormGrid, Input, SectionHeader, Select, Sheet, Tabs, Textarea } from '@/components/ui';
import { ENQUIRY_CHANNELS } from '@/config/constants';
import { cn } from '@/lib/cn';
import type { Channel } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { CUSTOMER_TAGS, createCustomer, updateCustomer } from '@/store/actions/customers';
import { closeSheet, openSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'customer-form';

type Template = 'men' | 'women';
const TEMPLATES: Record<Template, readonly string[]> = {
  men: ['Chest', 'Shoulder', 'Sleeve length', 'Length', 'Neck'],
  women: ['Bust', 'Waist', 'Hip', 'Dress length', 'Shoulder'],
};

export function CustomerFormSheet({ id, then }: { id?: string; then?: 'newOrder' }) {
  const s = useApp();
  const existing = id ? s.customers.find((c) => c.id === id) : undefined;
  const sizes = existing?.sizes ?? {};

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [channel, setChannel] = useState<Channel>(existing?.channel ?? ENQUIRY_CHANNELS[0] ?? 'Walk-in');
  const [birthday, setBirthday] = useState(existing?.birthday ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [template, setTemplate] = useState<Template>(
    TEMPLATES.women.some((k) => k !== 'Shoulder' && k in sizes) ? 'women' : 'men',
  );
  const [measures, setMeasures] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, String(v)])),
  );

  if (id && !existing) return null;

  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = () => {
    /* Keep any measurement outside both templates; replace the template's own. */
    const known = new Set([...TEMPLATES.men, ...TEMPLATES.women]);
    const out: Record<string, number> = {};
    Object.entries(sizes).forEach(([k, v]) => {
      if (!known.has(k)) out[k] = v;
    });
    TEMPLATES[template].forEach((k) => {
      const v = Number(measures[k]);
      if (measures[k] && Number.isFinite(v) && v > 0) out[k] = v;
    });
    const input = { name, phone, channel, birthday, tags, notes, sizes: out };
    if (existing) {
      if (updateCustomer(existing.id, input)) openSheet({ type: 'customer', id: existing.id });
    } else {
      const newId = createCustomer(input);
      if (newId) openSheet(then === 'newOrder' ? { type: 'newOrder', customerId: newId } : { type: 'customer', id: newId });
    }
  };

  return (
    <Sheet
      title={existing ? 'Edit ' + existing.name : 'Add a customer'}
      description={existing ? 'Change their details or take new measurements.' : 'Their details and measurements, so the next order is quick.'}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => (existing ? openSheet({ type: 'customer', id: existing.id }) : closeSheet())}
          >
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} leftIcon="check">
            {existing ? 'Save changes' : 'Add customer'}
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
        <FormGrid>
          <Field label="Name">
            <Input value={name} autoFocus placeholder="Adaeze Okafor" onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input type="tel" inputMode="tel" value={phone} placeholder="0803 123 4567" onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Came from">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {ENQUIRY_CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Birthday" optional>
            <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </Field>
          <Field label="Tags" optional full>
            <div role="group" aria-label="Tags" className="flex flex-wrap gap-2">
              {CUSTOMER_TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      'h-8 rounded-tag border px-3 text-body-13 font-medium transition-colors',
                      on
                        ? 'border-accent bg-accent text-on-accent'
                        : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-hover hover:text-text',
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Notes" optional full>
            <Textarea
              placeholder="Prefers heavy brocade. Travels on Fridays."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </FormGrid>

        <SectionHeader
          title="Measurements"
          className="mt-6"
          actions={
            <Tabs<Template>
              size="sm"
              aria-label="Measurement template"
              value={template}
              onChange={setTemplate}
              options={[
                { value: 'men', label: 'Men' },
                { value: 'women', label: 'Women' },
              ]}
            />
          }
        />
        <FormGrid className="sm:grid-cols-3">
          {TEMPLATES[template].map((k) => (
            <Field key={k} label={k} optional>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.25}
                suffix={'"'}
                value={measures[k] ?? ''}
                onChange={(e) => setMeasures((m) => ({ ...m, [k]: e.target.value }))}
              />
            </Field>
          ))}
        </FormGrid>
      </form>
    </Sheet>
  );
}
