import { STAGES } from '@/config/constants';
import { naira, qty } from '@/lib/format';
import { getState, update } from '../appStore';
import { can, customerOf, jobOf, me, nameOf, orderOf, styleOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { confirmDialog, promptDialog } from '../ui/dialogStore';
import { addAlert, addLog } from './core';

export function assignJob(jobId: string, who: string | null): void {
  update((d) => {
    jobOf(d, jobId)!.assigned = who || null;
    addLog(d, 'Gave job ' + jobId + ' to ' + (who ? nameOf(d, who) : 'nobody'));
  });
}

/** Can the signed-in person move this job on? */
export function canMoveJob(jobId: string): boolean {
  const s = getState();
  const j = jobOf(s, jobId);
  return can(s, 'production') || (can(s, 'production.own') && j?.assigned === s.actor);
}

/** Move a job to the next stage, enforcing the workshop rules. */
export async function advanceJob(jobId: string): Promise<void> {
  const s = getState();
  const j = jobOf(s, jobId);
  const o = j && orderOf(s, j.order);
  if (!j || !o) return;
  const st = styleOf(s, o.style);
  const idx = STAGES.findIndex((x) => x.key === j.stage);
  const next = STAGES[idx + 1];
  if (!next) return;

  /* The deposit rule — usually the difference between a workshop that is
     busy and one that is profitable. */
  let overrode = false;
  if (next.key === 'cutting' && o.paid < o.total / 2) {
    if (!can(s, 'approve')) {
      toast('This order needs half paid before cutting starts.',
        'Only ' + naira(o.paid) + ' of ' + naira(o.total) + ' has come in. Ask a manager.');
      return;
    }
    const ok = await confirmDialog({
      title: 'Start cutting before the deposit?',
      message: 'Only ' + naira(o.paid) + ' of ' + naira(o.total) + ' has been paid. This is recorded against your name.',
      confirmLabel: 'Start cutting anyway',
    });
    if (!ok) return;
    overrode = true;
  }
  if (next.key === 'cutting' && !s.issues.some((i) => i.job === jobId && i.status === 'issued')) {
    toast('No fabric has been given out for this job yet.', 'Ask the store for ' + qty(st.specs[o.size]) + ' yards first.');
    return;
  }
  if (!j.assigned && !['measurement', 'fabric', 'delivery'].includes(next.key)) {
    toast('Say who is doing this job first.');
    return;
  }
  const open = s.issues.filter((i) => i.job === jobId && i.status === 'issued' && !i.returned);
  if (next.key === 'ready' && open.length) {
    toast('The leftover fabric has not been brought back yet.', 'Account for it before this goes out.');
    return;
  }

  const customer = customerOf(s, o.customer).name;
  update((d) => {
    if (overrode) {
      addAlert(d, 'Cutting started before the deposit on ' + o.id,
        me(d).name + ' allowed it with ' + naira(o.total - o.paid) + ' still owing.', true);
      addLog(d, 'Overrode the deposit rule on ' + o.id, naira(o.total - o.paid) + ' still owing');
    }
    jobOf(d, jobId)!.stage = next.key;
    addLog(d, 'Moved ' + jobId + ' to ' + next.label, customer);
    if (next.key === 'ready') addAlert(d, 'Job ' + jobId + ' is ready', customer + ' can be told to collect.');
    if (next.key === 'delivery') orderOf(d, o.id)!.status = 'delivered';
  });
  closeSheet();

  if (next.key === 'ready') {
    const a = s.automations.find((x) => x.trigger === 'Order moved to Ready' && x.on);
    toast(jobId + ' is ready.', a ? '"' + a.msg + '" was sent to ' + customer + '.' : '');
    return;
  }
  toast(jobId + ' is now at ' + next.label + '.');
}

/** Quality check failed: send it back to sewing with a reason. */
export async function failQC(jobId: string): Promise<void> {
  const why = await promptDialog({ title: 'Not good enough', message: 'What is wrong with it?', confirmLabel: 'Send back' });
  if (why === null) return;
  if (why.trim().length < 4) {
    toast('Say what is wrong before sending it back.');
    return;
  }
  let reworks = 0;
  update((d) => {
    const j = jobOf(d, jobId)!;
    j.stage = 'sewing';
    j.reworks++;
    reworks = j.reworks;
    addLog(d, 'Sent ' + jobId + ' back to Sewing', why.trim());
    if (reworks >= 3) {
      addAlert(d, 'Job ' + jobId + ' has been redone ' + reworks + ' times',
        'That is a process problem, not one person’s mistake. Worth looking at.', true);
    }
  });
  closeSheet();
  toast('Sent back to Sewing.', reworks >= 3 ? 'This is the ' + reworks + 'rd time — the owner has been told.' : '');
}
