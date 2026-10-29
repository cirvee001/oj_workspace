import type { Channel, PaymentMethod, Size, Stage } from '@/types/domain';
import { STAGES } from '@/config/constants';
import { TODAY } from '@/lib/dates';
import { naira, toKobo } from '@/lib/format';
import { downloadText, toCSV } from '@/lib/csv';
import { getState, update } from '../appStore';
import { balanceOf, branchName, branchOrders, can, customerOf, myBranch, orderOf, styleOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { promptDialog } from '../ui/dialogStore';
import { addLog } from './core';

/** Take a payment against an order. Amount is typed in naira. */
export function takePayment(orderId: string, amountNaira: string | number, method: PaymentMethod): boolean {
  const s = getState();
  const o = orderOf(s, orderId);
  if (!o) return false;
  const amt = toKobo(amountNaira);
  if (amt <= 0) {
    toast('Enter the amount.');
    return false;
  }
  const bal = balanceOf(o);
  if (amt > bal) {
    toast('That is more than the ' + naira(bal) + ' still owing.', 'Enter ' + naira(bal) + ' or less.');
    return false;
  }
  update((d) => {
    orderOf(d, orderId)!.paid += amt;
    d.payments.push({ order: orderId, amount: amt, when: TODAY, method });
    addLog(d, 'Took ' + naira(amt) + ' on ' + orderId, customerOf(d, o.customer).name + ' · ' + method);
  });
  const auto = s.automations.some((a) => a.trigger === 'Payment received' && a.on);
  closeSheet();
  toast('Payment of ' + naira(amt) + ' recorded.', auto ? 'A thank-you message was sent automatically.' : '');
  return true;
}

export interface NewOrderInput {
  customer: string;
  channel: Channel;
  style: string;
  size: Size;
  material: string;
  due: string;
  priceNaira: string | number;
  depositNaira: string | number;
  depositMethod: PaymentMethod;
  /** The enquiry this order came from. It is marked converted in the same step. */
  fromEnquiry?: string;
}

/** Save a new order and open its production job. Returns the order id on success. */
export function saveOrder(input: NewOrderInput): string | null {
  const s = getState();
  const price = toKobo(input.priceNaira);
  const dep = toKobo(input.depositNaira);
  if (!s.customers.some((c) => c.id === input.customer)) {
    toast('Choose who the order is for.', 'Or add them as a new customer first.');
    return null;
  }
  if (price <= 0) {
    toast('Enter what you are charging.');
    return null;
  }
  if (dep < 0) {
    toast('The deposit cannot be less than nothing.');
    return null;
  }
  if (dep > price) {
    toast('The deposit is more than the price.', 'Check the amounts.');
    return null;
  }
  if (!input.due) {
    toast('Choose when it will be ready.');
    return null;
  }
  const enq = input.fromEnquiry ? s.enquiries.find((x) => x.id === input.fromEnquiry) : undefined;
  if (input.fromEnquiry && !enq) {
    toast('That enquiry could not be found.');
    return null;
  }
  if (enq?.stage === 'converted') {
    toast('Enquiry ' + enq.id + ' is already an order.', 'Open the existing order instead.');
    return null;
  }
  let id = '';
  let jid = '';
  update((d) => {
    const branch = myBranch(d);
    id = branch + '/' + ++d.counter.order;
    jid = branch + '/J/' + ++d.counter.job;
    d.orders.unshift({ id, customer: input.customer, style: input.style, size: input.size, material: input.material,
      branch, total: price, paid: dep, channel: input.channel, due: input.due, created: TODAY, status: 'making',
      ...(enq ? { fromEnquiry: enq.id, salesperson: enq.owner } : {}) });
    d.jobs.unshift({ id: jid, order: id, stage: 'measurement', assigned: null, due: input.due, reworks: 0 });
    if (dep > 0) d.payments.push({ order: id, amount: dep, when: TODAY, method: input.depositMethod });
    if (enq) {
      const rec = d.enquiries.find((x) => x.id === enq.id)!;
      rec.stage = 'converted';
      rec.lastContact = TODAY;
      rec.nextFollowUp = '';
    }
    addLog(d, 'Took order ' + id + (enq ? ' from enquiry ' + enq.id : ''),
      customerOf(d, input.customer).name + ' · ' + naira(price) + ' · deposit ' + naira(dep) + (dep > 0 ? ' (' + input.depositMethod + ')' : ''));
  });
  closeSheet();
  toast('Order ' + id + ' saved. Job ' + jid + ' is in the workshop.',
    dep < price / 2 ? 'Deposit is under half, so cutting will be blocked.' : enq ? 'Enquiry ' + enq.id + ' is marked converted.' : '');
  return id;
}

const STAGE_INDEX = (k: Stage): number => STAGES.findIndex((x) => x.key === k);

/**
 * Cancel an order. The money already taken is kept and nothing more is owed,
 * so the price drops to what was paid (the original price goes in the log).
 * The production job is removed and any fabric still waiting to be given out
 * for it is declined. Fabric already handed over must come back first.
 */
export async function cancelOrder(id: string, reason?: string): Promise<void> {
  const s = getState();
  const o = orderOf(s, id);
  if (!o) return;
  if (!can(s, 'approve')) {
    toast('Only a manager can cancel an order.', 'Ask a manager to cancel it for you.');
    return;
  }
  if (o.status === 'cancelled') {
    toast('Order ' + id + ' is already cancelled.');
    return;
  }
  if (o.status === 'delivered') {
    toast('Order ' + id + ' has been delivered.', 'A delivered order cannot be cancelled.');
    return;
  }
  const job = s.jobs.find((j) => j.order === id);
  const out = job ? s.issues.filter((i) => i.job === job.id && i.status === 'issued' && !i.returned) : [];
  if (job && out.length && STAGE_INDEX(job.stage) >= STAGE_INDEX('fabric')) {
    toast('Bring the fabric back first.', 'Fabric was given out for ' + job.id + '. Record its return, then cancel.');
    return;
  }
  let why = (reason ?? '').trim();
  if (why.length < 4) {
    const answer = await promptDialog({
      title: 'Cancel order ' + id + '?',
      message: 'The ' + naira(o.paid) + ' already paid is kept and nothing more is owed. The job leaves the workshop.',
      placeholder: 'Why is it being cancelled?',
      confirmLabel: 'Cancel order',
    });
    if (answer === null) return;
    why = answer.trim();
  }
  if (why.length < 4) {
    toast('Say why it is being cancelled.', 'A few words is enough.');
    return;
  }
  /* The state may have moved on while the dialog was open. */
  const now = orderOf(getState(), id);
  if (!now || now.status !== 'making') return;
  update((d) => {
    const rec = orderOf(d, id)!;
    const price = rec.total;
    rec.status = 'cancelled';
    rec.cancelReason = why;
    rec.total = rec.paid;
    const j = d.jobs.find((x) => x.order === id);
    if (j) {
      d.issues.forEach((i) => {
        if (i.job === j.id && (i.status === 'needs_approval' || i.status === 'approved')) i.status = 'declined';
      });
      d.jobs = d.jobs.filter((x) => x.id !== j.id);
    }
    addLog(d, 'Cancelled order ' + id, customerOf(d, rec.customer).name + ' · was ' + naira(price) + ', kept ' + naira(rec.paid) + ' · ' + why);
  });
  toast('Order ' + id + ' cancelled.', o.paid > 0 ? naira(o.paid) + ' already paid is kept.' : 'Nothing had been paid.');
}

export function exportOrders(): void {
  const s = getState();
  const rows: (string | number)[][] = [['Order', 'Client', 'Phone', 'Style', 'Size', 'Branch', 'Came from', 'Total', 'Paid', 'Owing', 'Ready by', 'Status']];
  branchOrders(s).forEach((o) => {
    const c = customerOf(s, o.customer);
    rows.push([o.id, c.name, c.phone, styleOf(s, o.style).name, o.size, branchName(s, o.branch), o.channel,
      o.total / 100, o.paid / 100, balanceOf(o) / 100, o.due, o.status]);
  });
  downloadText('orders.csv', toCSV(rows));
  update((d) => addLog(d, 'Exported orders to a spreadsheet', rows.length - 1 + ' rows'));
  toast('Downloaded ' + (rows.length - 1) + ' orders.', 'Opens in Excel or Google Sheets.');
}
