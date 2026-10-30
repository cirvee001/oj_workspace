import { useState } from 'react';
import { Button, Field, FormGrid, Input, SectionHeader, Select, Sheet, Tabs, Textarea } from '@/components/ui';
import { ENQUIRY_CHANNELS } from '@/config/constants';
import { FIGURES, FITS, MEASUREMENT_BOOK, figureOf, pointsFor } from '@/config/measurements';
import { cn } from '@/lib/cn';
import type { Channel, Figure, Fit } from '@/types/domain';
import { useApp } from '@/store/hooks';
import { useOpenCustomer } from '@/hooks/useGo';
import { CUSTOMER_TAGS, createCustomer, updateCustomer } from '@/store/actions/customers';
import { closeSheet, openSheet } from '@/store/ui/sheetStore';

const FORM_ID = 'customer-form';

/** Every point in either book: values under any other key are older data we keep untouched. */
const KNOWN = new Set([...pointsFor('men'), ...pointsFor('women')].map((p) => p.label));

export function CustomerFormSheet({ id, then }: { id?: string; then?: 'newOrder' }) {
  const s = useApp();
  const openCustomer = useOpenCustomer();
  const existing = id ? s.customers.find((c) => c.id === id) : undefined;
  const sizes = existing?.sizes ?? {};

  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [channel, setChannel] = useState<Channel>(existing?.channel ?? ENQUIRY_CHANNELS[0] ?? 'Walk-in');
  const [birthday, setBirthday] = useState(existing?.birthday ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [figure, setFigure] = useState<Figure>(existing ? figureOf(existing) : 'men');
  const [fit, setFit] = useState<Fit>(existing?.fit ?? 'Regular');
  const [fitNotes, setFitNotes] = useState(existing?.fitNotes ?? '');
  const [measures, setMeasures] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, String(v)])),
  );
  const [focused, setFocused] = useState<string | null>(null);

  if (id && !existing) return null;

  const book = MEASUREMENT_BOOK[figure];
  const points = pointsFor(figure);
  const taken = points.filter((p) => Number(measures[p.label]) > 0).length;
  const toggleTag = (t: string) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = () => {
    /* Keep older keys outside both books; save the chosen book's points. */
    const out: Record<string, number> = {};
    Object.entries(sizes).forEach(([k, v]) => {
      if (!KNOWN.has(k)) out[k] = v;
    });
    points.forEach((p) => {
      const raw = measures[p.label];
      if (raw === undefined || raw.trim() === '') return;
      out[p.label] = Number(raw);
    });
    const input = { name, phone, channel, birthday, tags, notes, sizes: out, figure, fit, fitNotes };
    if (existing) {
      if (updateCustomer(existing.id, input)) openCustomer(existing.id);
    } else {
      const newId = createCustomer(input);
      if (!newId) return;
      if (then === 'newOrder') openSheet({ type: 'newOrder', customerId: newId });
      else openCustomer(newId);
    }
  };

  return (
    <Sheet
      size="lg"
      title={existing ? 'Edit ' + existing.name : 'Add a customer'}
      description={existing ? 'Change their details or take new measurements.' : 'Their details and measurements, so the next order is quick.'}
      footer={
        <>
          <span className="mr-auto text-body-13 text-text-muted tabular-nums">
            {taken} of {points.length} measurements taken
          </span>
          <Button variant="secondary" onClick={closeSheet}>
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
            <ChipGroup label="Tags" options={CUSTOMER_TAGS} isOn={(t) => tags.includes(t)} onToggle={toggleTag} />
          </Field>
          <Field label="Notes" optional full>
            <Textarea placeholder="Prefers heavy brocade. Travels on Fridays." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </FormGrid>

        <SectionHeader
          title="Measurements"
          description="In inches. Tap a box to see how to take it."
          className="mt-8"
          actions={<Tabs<Figure> size="sm" aria-label="Measurement book" value={figure} onChange={setFigure} options={FIGURES} />}
        />

        <Field label="How they like it to sit" className="mb-5">
          <div role="radiogroup" aria-label="Fit" className="grid grid-cols-3 gap-2">
            {FITS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={fit === f.value}
                onClick={() => setFit(f.value)}
                className={cn(
                  'rounded-ctl border px-3 py-2 text-left transition-colors',
                  fit === f.value ? 'border-text bg-text text-surface' : 'border-border-strong bg-surface hover:bg-surface-hover',
                )}
              >
                <span className="block text-body-13 font-semibold">{f.label}</span>
                <span className={cn('block text-body-12', fit === f.value ? 'text-surface/70' : 'text-text-muted')}>{f.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <div className="space-y-6">
          {book.map((g) => {
            const done = g.points.filter((p) => Number(measures[p.label]) > 0).length;
            return (
              <fieldset key={g.id} className="min-w-0">
                <legend className="mb-3 flex w-full items-baseline gap-2">
                  <span className="text-eyebrow text-text">{g.title}</span>
                  <span className="text-body-12 text-text-muted">{g.for}</span>
                  <span className="ml-auto text-body-12 text-text-muted tabular-nums">
                    {done}/{g.points.length}
                  </span>
                </legend>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
                  {g.points.map((p) => (
                    <Field
                      key={g.id + p.label}
                      label={p.label}
                      hint={focused === g.id + p.label ? p.how : undefined}
                    >
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={120}
                        step={0.25}
                        prefix={<span className="text-body-12 font-semibold">{p.code}</span>}
                        suffix={'"'}
                        value={measures[p.label] ?? ''}
                        onFocus={() => setFocused(g.id + p.label)}
                        onBlur={() => setFocused((f) => (f === g.id + p.label ? null : f))}
                        onChange={(e) => setMeasures((m) => ({ ...m, [p.label]: e.target.value }))}
                      />
                    </Field>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <Field label="Tailor's note" optional full className="mt-6">
          <Textarea
            placeholder="Left shoulder sits lower. Likes room at the tummy. Wears agbada with the sleeves folded."
            value={fitNotes}
            onChange={(e) => setFitNotes(e.target.value)}
          />
        </Field>
      </form>
    </Sheet>
  );
}

/** A row of toggle chips (multi-select). */
function ChipGroup({ label, options, isOn, onToggle }: { label: string; options: readonly string[]; isOn: (o: string) => boolean; onToggle: (o: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((t) => {
        const on = isOn(t);
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(t)}
            className={cn(
              'h-8 rounded-tag border px-3 text-body-13 font-medium transition-colors',
              on ? 'border-accent bg-accent text-on-accent' : 'border-border-strong bg-surface text-text-secondary hover:bg-surface-hover hover:text-text',
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
