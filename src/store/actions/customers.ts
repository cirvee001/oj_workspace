import type { BranchId, Channel, Figure, Fit } from '@/types/domain';
import { TODAY } from '@/lib/dates';
import { getState, update } from '../appStore';
import { can, myBranch } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { addLog } from './core';

export const CUSTOMER_TAGS = ['VIP', 'Bridal', 'Corporate', 'Quiet'] as const;

export interface CustomerInput {
  name: string;
  phone: string;
  channel: Channel;
  /** ISO date or '' when not known. */
  birthday: string;
  /** Defaults to the branch on screen. */
  branch?: BranchId;
  tags: string[];
  notes: string;
  /** Measurements in inches, keyed by the point labels in config/measurements.ts. */
  sizes: Record<string, number>;
  figure?: Figure;
  fit?: Fit;
  fitNotes?: string;
}

/** Digits only, so "+234 803 …" and "0803…" compare equal on their last ten digits. */
const digits = (phone: string): string => phone.replace(/[\s+\-()]/g, '');
const phoneKey = (phone: string): string => digits(phone).slice(-10);

/** Validate the input. Toasts and returns false on the first problem. */
function check(input: CustomerInput, selfId?: string): boolean {
  const s = getState();
  if (!can(s, 'customer') && !can(s, 'order')) {
    toast('You cannot add or change customers.', 'Ask a manager or someone in sales.');
    return false;
  }
  if (input.name.trim().length < 2) {
    toast('Enter their name.');
    return false;
  }
  const d = digits(input.phone);
  if (!/^\d{10,14}$/.test(d)) {
    toast('That phone number does not look right.', 'Use a Nigerian number, like 0803 123 4567.');
    return false;
  }
  const dup = s.customers.find((c) => c.id !== selfId && c.phone && phoneKey(c.phone) === phoneKey(d));
  if (dup) {
    toast(dup.name + ' already has that number.', 'Open their record instead of adding them twice.');
    return false;
  }
  const bad = badMeasurement(input.sizes);
  if (bad) {
    toast('Check the ' + bad.toLowerCase() + ' measurement.', 'Measurements are in inches, between 0 and 120.');
    return false;
  }
  return true;
}

const clean = (input: CustomerInput) => ({
  name: input.name.trim(),
  phone: input.phone.trim(),
  channel: input.channel,
  birthday: input.birthday,
  tags: input.tags.filter((t) => (CUSTOMER_TAGS as readonly string[]).includes(t)),
  notes: input.notes.trim(),
  sizes: Object.fromEntries(Object.entries(input.sizes).filter(([, v]) => Number.isFinite(v) && v > 0 && v < 120)),
  figure: input.figure,
  fit: input.fit,
  fitNotes: (input.fitNotes ?? '').trim() || undefined,
});

/** A measurement that is not a plausible number of inches. */
function badMeasurement(sizes: Record<string, number>): string | null {
  const bad = Object.entries(sizes).find(([, v]) => !Number.isFinite(v) || v <= 0 || v >= 120);
  return bad ? bad[0] : null;
}

/** Stamp who measured and when, only when the measurements themselves changed. */
const measuredStamp = (actor: string | null, before?: Record<string, number>, after?: Record<string, number>) =>
  JSON.stringify(before ?? {}) !== JSON.stringify(after ?? {}) && Object.keys(after ?? {}).length
    ? { measuredOn: TODAY, measuredBy: actor ?? undefined }
    : {};

/** Add a customer. Returns the new id on success. */
export function createCustomer(input: CustomerInput): string | null {
  if (!check(input)) return null;
  const c = clean(input);
  let id = '';
  update((d) => {
    const max = d.customers.reduce((n, x) => Math.max(n, Number(x.id.replace(/\D/g, '')) || 0), 0);
    id = 'c' + (max + 1);
    d.customers.unshift({ id, ...c, ...measuredStamp(d.actor, {}, c.sizes), branch: input.branch ?? myBranch(d), since: TODAY });
    addLog(d, 'Added customer ' + c.name, c.phone + ' · ' + c.channel);
  });
  closeSheet();
  toast(c.name + ' added.', Object.keys(c.sizes).length ? 'Measurements saved.' : 'Add their measurements when you take them.');
  return id;
}

/** Change a customer's details. */
export function updateCustomer(id: string, input: CustomerInput): boolean {
  const before = getState().customers.find((x) => x.id === id);
  if (!before) return false;
  if (!check(input, id)) return false;
  const c = clean(input);
  update((d) => {
    const rec = d.customers.find((x) => x.id === id)!;
    Object.assign(rec, c, measuredStamp(d.actor, before.sizes, c.sizes));
    if (input.branch) rec.branch = input.branch;
    const changed = (Object.keys(c) as (keyof typeof c)[]).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(c[k]),
    );
    addLog(d, 'Updated customer ' + c.name, changed.length ? 'Changed ' + changed.join(', ') : 'No changes');
  });
  closeSheet();
  toast(c.name + '’s record is updated.');
  return true;
}
