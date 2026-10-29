import type { WasteCategory } from '@/types/domain';
import { qty } from '@/lib/format';
import { downloadText, toCSV } from '@/lib/csv';
import { getState, update } from '../appStore';
import { can, jobOf, materialOf, myBranch, nameOf, orderOf, stockOf, styleOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { promptDialog } from '../ui/dialogStore';
import { addAlert, addLog, addStock, setStock } from './core';

/** What a job's style and size needs, and how much is allowed without asking. */
export function fabricAllowance(jobId: string) {
  const s = getState();
  const j = jobOf(s, jobId);
  const o = j && orderOf(s, j.order);
  if (!o) return null;
  const st = styleOf(s, o.style);
  const need = st.specs[o.size];
  return {
    order: o,
    style: st,
    material: materialOf(s, o.material),
    need,
    allow: Math.round(need * (1 + st.tol / 100) * 100) / 100,
    inStore: stockOf(s, o.material, myBranch(s)),
  };
}

/** Hand approved fabric over: stock goes down and stays against the job. */
export function handOver(issueId: string): void {
  const s = getState();
  const i = s.issues.find((x) => x.id === issueId);
  if (!i) return;
  const m = materialOf(s, i.material);
  const have = stockOf(s, i.material, i.branch);
  if (have < i.requested) {
    toast('Only ' + qty(have) + ' yards of ' + m.name + ' left now.', 'Someone else may have just taken some.');
    return;
  }
  update((d) => {
    setStock(d, i.material, i.branch, have - i.requested);
    const rec = d.issues.find((x) => x.id === issueId)!;
    rec.issued = rec.requested;
    rec.status = 'issued';
    addLog(d, 'Gave out ' + qty(rec.issued) + ' yards of ' + m.name, 'to ' + nameOf(d, rec.to) + ' for job ' + rec.job);
  });
  toast(qty(i.requested) + ' yards of ' + m.name + ' given to ' + nameOf(s, i.to) + '.',
    'It stays against job ' + i.job + ' until the leftovers come back.');
}

export interface FabricRequestInput {
  jobId: string;
  collector: string;
  yards: number;
}

/**
 * Ask for fabric against one job and one person. Within the style allowance it
 * is handed over at once; over it, a reason is required and someone else must approve.
 */
export async function requestFabric(input: FabricRequestInput): Promise<boolean> {
  const a = fabricAllowance(input.jobId);
  if (!a) return false;
  const want = input.yards;
  if (want <= 0) {
    toast('How many yards?');
    return false;
  }
  if (want > a.inStore) {
    toast('Only ' + qty(a.inStore) + ' yards of ' + a.material.name + ' left — you asked for ' + qty(want) + '.',
      'Reduce the amount, or ask for a purchase.');
    return false;
  }
  const over = want > a.need * (1 + a.style.tol / 100);
  let reason: string | undefined;
  if (over) {
    const why = await promptDialog({
      title: 'That is more than this style needs',
      message: a.style.name + ' size ' + a.order.size + ' takes ' + qty(a.need) + ' yards. You are asking for ' +
        qty(want) + '. Why do you need extra?',
      confirmLabel: 'Ask for approval',
    });
    if (why === null) return false;
    if (why.trim().length < 4) {
      toast('Give a real reason before asking for extra.');
      return false;
    }
    reason = why.trim();
  }

  let id = '';
  update((d) => {
    id = 'is' + ++d.counter.issue;
    d.issues.push({ id, job: input.jobId, material: a.order.material, branch: myBranch(d), expected: a.need,
      requested: want, issued: null, to: input.collector, by: d.actor!, status: over ? 'needs_approval' : 'approved',
      returned: false, reason });
    if (over) {
      addAlert(d, nameOf(d, input.collector) + ' asked for extra fabric on ' + input.jobId,
        qty(want) + ' yards instead of ' + qty(a.need) + '. Reason: "' + reason + '"');
      addLog(d, 'Asked for ' + qty(want) + ' yards on ' + input.jobId, 'over the ' + qty(a.need) + ' yard allowance');
    } else {
      addLog(d, 'Asked for ' + qty(want) + ' yards on ' + input.jobId, 'within the allowance');
    }
  });
  closeSheet();
  if (over) {
    toast('Sent for approval.', 'Someone else has to agree before the store hands it over.');
  } else {
    handOver(id);
  }
  return true;
}

/** Approve or turn down a request for extra fabric. */
export function decideIssue(issueId: string, ok: boolean): void {
  const s = getState();
  const i = s.issues.find((x) => x.id === issueId);
  if (!i) return;
  /* Separation of duties is checked FIRST, before permissions — in the real
     system this is a database constraint that fires whoever you are, and the
     specific message is more useful than a generic "no permission". */
  if (i.by === s.actor) {
    toast('You cannot approve your own request for extra fabric.', 'Someone else has to agree to it.');
    return;
  }
  if (!can(s, 'approve')) {
    toast('You do not have permission to approve extra fabric.', 'Ask your manager.');
    return;
  }
  if (!ok) {
    update((d) => {
      d.issues.find((x) => x.id === issueId)!.status = 'declined';
      addLog(d, 'Turned down the extra fabric on ' + i.job);
    });
    toast('Turned down.');
    return;
  }
  update((d) => {
    d.issues.find((x) => x.id === issueId)!.status = 'approved';
    addLog(d, 'Approved ' + qty(i.requested) + ' yards on ' + i.job, 'asked by ' + nameOf(d, i.to));
  });
  handOver(issueId);
}

export interface ReturnInput {
  used: number;
  back: number;
  waste: number;
  cat: WasteCategory;
  reason: string;
}

/** Yards that nobody has accounted for yet. Negative means over-accounted. */
export const unaccounted = (issued: number, r: Pick<ReturnInput, 'used' | 'back' | 'waste'>): number =>
  Math.round((issued - r.used - r.back - r.waste) * 1000) / 1000;

/** Close off fabric that went out: what was used, returned, wasted — and what is missing. */
export function saveReturn(issueId: string, input: ReturnInput): boolean {
  const s = getState();
  const i = s.issues.find((x) => x.id === issueId);
  if (!i || i.issued == null) return false;
  const gap = unaccounted(i.issued, input);
  if (gap < 0) {
    toast('That is more than was given out. ' + qty(i.issued) + ' yards went out but ' +
      qty(input.used + input.back + input.waste) + ' has been accounted for.', 'Check the numbers.');
    return false;
  }
  const reason = gap > 0 ? input.reason.trim() : '';
  if (gap > 0 && reason.length < 4) {
    toast('Say what happened to the missing ' + qty(gap) + ' yards.', 'It cannot just disappear from the store.');
    return false;
  }
  update((d) => {
    addStock(d, i.material, i.branch, input.back);
    const rec = d.issues.find((x) => x.id === issueId)!;
    rec.returned = true;
    rec.result = { used: input.used, back: input.back, waste: input.waste, gap, reason, cat: input.cat };
    addLog(d, 'Closed off fabric on ' + i.job,
      'used ' + qty(input.used) + ', returned ' + qty(input.back) + ', waste ' + qty(input.waste) +
        (gap > 0 ? ', MISSING ' + qty(gap) + ' — "' + reason + '"' : ''));
    if (gap > 0) {
      addAlert(d, nameOf(d, i.to) + ' could not account for ' + qty(gap) + ' yards on ' + i.job,
        'Reason given: "' + reason + '". It is on the variance report against their name.', true);
    }
  });
  closeSheet();
  if (gap > 0) toast('Closed, but ' + qty(gap) + ' yards is unaccounted for.', 'It has gone on the report against ' + nameOf(s, i.to) + '.');
  else toast('All ' + qty(i.issued) + ' yards accounted for.', qty(input.back) + ' yards went back into the store.');
  return true;
}

export function exportFabric(): void {
  const s = getState();
  const rows: (string | number)[][] = [['Job', 'Fabric', 'Issued to', 'Expected', 'Issued', 'Used', 'Returned', 'Waste', 'Unaccounted', 'Reason']];
  s.issues.filter((i) => i.issued).forEach((i) =>
    rows.push([i.job, materialOf(s, i.material).name, nameOf(s, i.to), i.expected, i.issued ?? '',
      i.result?.used ?? '', i.result?.back ?? '', i.result?.waste ?? '', i.result?.gap ?? '', i.result?.reason ?? '']),
  );
  downloadText('fabric-usage.csv', toCSV(rows));
  update((d) => addLog(d, 'Exported fabric usage to a spreadsheet', rows.length - 1 + ' rows'));
  toast('Downloaded ' + (rows.length - 1) + ' fabric records.');
}
