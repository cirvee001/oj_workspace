import { TODAY } from '@/lib/dates';
import { qty } from '@/lib/format';
import { getState, update } from '../appStore';
import { branchName, can, materialOf, me, myBranch, stockOf, supplierOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { promptDialog } from '../ui/dialogStore';
import { addAlert, addLog, addStock, setStock } from './core';

/* ---------------- transfers between branches ---------------- */

export interface TransferInput {
  material: string;
  qty: number;
  to: string;
  note: string;
}

export function requestTransfer(input: TransferInput): boolean {
  const s = getState();
  const here = myBranch(s);
  const m = materialOf(s, input.material);
  if (input.qty <= 0) {
    toast('How much are you moving?');
    return false;
  }
  if (input.qty > stockOf(s, input.material, here)) {
    toast('There is only ' + qty(stockOf(s, input.material, here)) + ' ' + m.unit + ' of ' + m.name + ' here.',
      'You cannot send more than you have.');
    return false;
  }
  update((d) => {
    const id = 'TR/' + ++d.counter.transfer;
    d.transfers.unshift({ id, from: here, to: input.to, material: input.material, qty: input.qty,
      status: 'requested', by: d.actor!, note: input.note });
    addLog(d, 'Asked to move ' + qty(input.qty) + ' ' + m.unit + ' of ' + m.name,
      branchName(d, here) + ' → ' + branchName(d, input.to));
  });
  closeSheet();
  toast('Sent for approval.', 'A manager has to agree before anything moves.');
  return true;
}

export function approveTransfer(id: string): void {
  const s = getState();
  const t = s.transfers.find((x) => x.id === id);
  if (!t) return;
  if (t.by === s.actor && me(s).role !== 'owner') {
    toast('You cannot approve your own transfer request.', 'Someone else has to agree to it.');
    return;
  }
  if (!can(s, 'approve')) {
    toast('You do not have permission to approve transfers.', 'Ask your manager.');
    return;
  }
  update((d) => {
    d.transfers.find((x) => x.id === id)!.status = 'approved';
    addLog(d, 'Approved transfer ' + id);
  });
  toast('Approved. The store can send it now.');
}

export function declineTransfer(id: string): void {
  update((d) => {
    d.transfers.find((x) => x.id === id)!.status = 'declined';
    addLog(d, 'Declined transfer ' + id);
  });
  toast('Declined.');
}

export function sendTransfer(id: string): void {
  const s = getState();
  const t = s.transfers.find((x) => x.id === id);
  if (!t) return;
  if (stockOf(s, t.material, t.from) < t.qty) {
    toast('There is not enough left at ' + branchName(s, t.from) + ' any more.');
    return;
  }
  update((d) => {
    addStock(d, t.material, t.from, -t.qty);
    d.transfers.find((x) => x.id === id)!.status = 'sent';
    addLog(d, 'Sent transfer ' + id, qty(t.qty) + ' ' + materialOf(d, t.material).unit + ' left ' + branchName(d, t.from));
  });
  toast('On its way. It now belongs to neither branch until it is confirmed.');
}

export async function receiveTransfer(id: string): Promise<void> {
  const s = getState();
  const t = s.transfers.find((x) => x.id === id);
  if (!t) return;
  const m = materialOf(s, t.material);
  const got = await promptDialog({
    title: 'How much actually arrived?',
    message: qty(t.qty) + ' ' + m.unit + ' of ' + m.name + ' was sent from ' + branchName(s, t.from) + '.',
    defaultValue: qty(t.qty),
    inputType: 'number',
    confirmLabel: 'Record it',
  });
  if (got === null) return;
  const n = Number(got);
  if (isNaN(n) || n < 0) {
    toast('Enter how much arrived.');
    return;
  }
  update((d) => {
    addStock(d, t.material, t.to, n);
    const rec = d.transfers.find((x) => x.id === id)!;
    rec.status = 'received';
    rec.received = n;
    if (n !== t.qty) {
      addAlert(d, 'Transfer ' + id + ' did not match',
        qty(t.qty) + ' was sent from ' + branchName(d, t.from) + ' but ' + qty(n) + ' arrived at ' + branchName(d, t.to) + '.', true);
      addLog(d, 'Received transfer ' + id + ' SHORT', 'sent ' + qty(t.qty) + ', got ' + qty(n));
    } else {
      addLog(d, 'Received transfer ' + id, qty(n) + ' ' + m.unit);
    }
  });
  if (n !== t.qty) toast('Recorded — but ' + qty(Math.abs(t.qty - n)) + ' is missing.', 'Both managers have been told.');
  else toast('All ' + qty(n) + ' arrived and is now in ' + branchName(s, t.to) + '.');
}

/* ---------------- deliveries from suppliers ---------------- */

/** Suppliers often send less than ordered — record what really came. */
export async function receiveGoods(poId: string): Promise<void> {
  const s = getState();
  const p = s.pos.find((x) => x.id === poId);
  if (!p) return;
  const m = materialOf(s, p.material);
  const sup = supplierOf(s, p.supplier);
  const got = await promptDialog({
    title: 'How much actually arrived?',
    message: 'You ordered ' + qty(p.ordered) + ' ' + m.unit + ' of ' + m.name + ' from ' + sup.name +
      '. Suppliers often send less than ordered — enter what really came.',
    defaultValue: qty(p.ordered - p.received),
    inputType: 'number',
    confirmLabel: 'Record it',
  });
  if (got === null) return;
  const n = Number(got);
  if (isNaN(n) || n <= 0) {
    toast('Enter how much arrived.');
    return;
  }
  if (p.received + n > p.ordered) {
    toast('That is more than you ordered.', 'You ordered ' + qty(p.ordered) + ' and ' + qty(p.received) + ' already came.');
    return;
  }
  const received = p.received + n;
  update((d) => {
    const po = d.pos.find((x) => x.id === poId)!;
    po.received = received;
    po.status = received >= po.ordered ? 'received' : 'partly';
    addStock(d, p.material, p.branch, n);
    d.suppliers.find((x) => x.id === p.supplier)!.owed += n * p.cost;
    addLog(d, 'Received ' + qty(n) + ' ' + m.unit + ' of ' + m.name, 'against ' + p.id + ' from ' + sup.name);
  });
  toast(qty(n) + ' ' + m.unit + ' added to the store.',
    received < p.ordered ? qty(p.ordered - received) + ' still to come — the order stays open.' : 'Order complete.');
}

/* ---------------- stock counts ---------------- */

/** The items included in a store count. */
export const countableMaterials = () => getState().materials.slice(0, 5);

export function submitCount(counted: Record<string, number>): void {
  const s = getState();
  const here = myBranch(s);
  const lines = countableMaterials().map((m) => ({
    material: m.id,
    system: stockOf(s, m.id, here),
    counted: counted[m.id] ?? 0,
  }));
  const diffs = lines.filter((l) => l.counted !== l.system).length;
  update((d) => {
    d.stockCounts.unshift({ id: 'SC-' + (10 + d.stockCounts.length), branch: here, when: TODAY, by: d.actor!,
      status: diffs ? 'review' : 'closed', lines, note: '' });
    addLog(d, 'Counted the store at ' + branchName(d, here), diffs ? diffs + ' items did not match' : 'everything matched');
  });
  closeSheet();
  toast(diffs ? diffs + ' item' + (diffs === 1 ? '' : 's') + ' did not match.' : 'Everything matched.',
    diffs ? 'A manager has to accept the difference before stock changes.' : 'Nothing to correct.');
}

/** Accept the physical count: stock is corrected and the decision is logged for good. */
export function acceptCount(id: string): void {
  update((d) => {
    const c = d.stockCounts.find((x) => x.id === id)!;
    c.lines.forEach((l) => {
      if (l.counted !== l.system) setStock(d, l.material, c.branch, l.counted);
    });
    c.status = 'closed';
    c.closedBy = d.actor!;
    addLog(d, 'Accepted stock count ' + id, branchName(d, c.branch) + ' — stock corrected to the physical count');
  });
  toast('Stock corrected to what was counted.', 'The difference stays in the activity log for good.');
}
