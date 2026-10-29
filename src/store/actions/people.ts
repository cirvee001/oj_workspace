import type { LeaveKind } from '@/types/domain';
import { DAY_MS, TODAY } from '@/lib/dates';
import { naira, toKobo } from '@/lib/format';
import { downloadText, toCSV } from '@/lib/csv';
import { getState, update } from '../appStore';
import { branchName, branchStaff, can, me, myBranch, nameOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { addAlert, addLog } from './core';

/* ---------------- leave (PRD §8) ---------------- */

export interface LeaveInput {
  kind: LeaveKind;
  from: string;
  to: string;
  reason: string;
}

export function requestLeave(input: LeaveInput): boolean {
  const why = input.reason.trim();
  if (!input.from || !input.to || input.to < input.from) {
    toast('Check the dates.', 'The last day cannot be before the first.');
    return false;
  }
  if (why.length < 3) {
    toast('Say why you need the time off.');
    return false;
  }
  const days = Math.round((new Date(input.to).getTime() - new Date(input.from).getTime()) / DAY_MS) + 1;
  update((d) => {
    d.leave.unshift({ id: 'L-' + (22 + d.leave.length), staff: d.actor!, kind: input.kind, from: input.from, to: input.to,
      days, reason: why, status: 'requested', decidedBy: null });
    addLog(d, 'Asked for ' + days + ' days off', why);
  });
  closeSheet();
  toast('Sent to your manager.', 'It shows in Approvals until someone decides.');
  return true;
}

export function decideLeave(id: string, ok: boolean): void {
  const s = getState();
  const l = s.leave.find((x) => x.id === id);
  if (!l) return;
  if (l.staff === s.actor) {
    toast('You cannot approve your own leave.', 'Someone else has to.');
    return;
  }
  if (!can(s, 'staff')) {
    toast('Only HR or a manager can approve leave.');
    return;
  }
  update((d) => {
    const rec = d.leave.find((x) => x.id === id)!;
    rec.status = ok ? 'approved' : 'declined';
    rec.decidedBy = d.actor;
    addLog(d, (ok ? 'Approved' : 'Declined') + ' leave for ' + nameOf(d, l.staff), l.kind + ' · ' + l.days + ' days');
  });
  toast(ok ? nameOf(s, l.staff) + '’s leave is approved.' : 'Leave declined.',
    ok ? 'Those days will not count as absence in payroll.' : '');
}

/* ---------------- payroll ---------------- */

/** Worked out from what the system already knows: salaries, lateness, finished jobs. */
export function preparePayroll(): void {
  update((d) => {
    d.payroll.lines = branchStaff(d)
      .filter((x) => x.salary > 0)
      .map((x) => {
        const lateMins = d.attendance.filter((a) => a.staff === x.id && a.late).length * 22;
        const deduct = Math.round(lateMins * 1500);
        const bonus = x.role === 'tailor' ? d.jobs.filter((j) => j.assigned === x.id && j.stage === 'delivery').length * 500000 : 0;
        return { staff: x.id, base: x.salary, lateMins, deduct, bonus, net: x.salary - deduct + bonus };
      });
    d.payroll.status = 'draft';
    addLog(d, 'Worked out payroll for ' + d.payroll.month, d.payroll.lines.length + ' staff');
  });
  toast('Payroll worked out.', 'Check it, then send it for approval.');
}

export function submitPayroll(): void {
  update((d) => {
    d.payroll.status = 'pending';
    d.payroll.preparedBy = d.actor;
    addAlert(d, 'Payroll for ' + d.payroll.month + ' needs your approval',
      'Prepared by ' + me(d).name + '. Nothing is paid until you approve it.', true);
    addLog(d, 'Sent payroll for approval', d.payroll.month);
  });
  toast('Sent to the owner.', 'Nobody is paid until it is approved.');
}

/** Whoever prepares payroll cannot be the one who approves it. */
export function approvePayroll(): void {
  const s = getState();
  if (s.payroll.preparedBy === s.actor) {
    toast('You prepared this payroll, so you cannot approve it.', 'Someone else has to check it.');
    return;
  }
  if (!can(s, '*')) {
    toast('Only the owner can approve payroll.', 'Ask them to look at it.');
    return;
  }
  update((d) => {
    d.payroll.status = 'approved';
    d.payroll.approvedBy = d.actor;
    addLog(d, 'Approved payroll for ' + d.payroll.month, naira(d.payroll.lines.reduce((n, l) => n + l.net, 0)));
  });
  toast('Approved. Payslips issued.', 'This month is now locked.');
}

/* ---------------- money ---------------- */

export interface ExpenseInput {
  what: string;
  cat: string;
  amountNaira: string | number;
}

/** Shared checks for recording or submitting a cost. Returns null after a toast. */
function checkExpense(input: ExpenseInput): { what: string; amt: number } | null {
  const what = input.what.trim();
  const amt = toKobo(input.amountNaira);
  if (!what) {
    toast('Say what it was for.');
    return null;
  }
  if (!(amt > 0)) {
    toast('Enter the amount.');
    return null;
  }
  return { what, amt };
}

export function recordExpense(input: ExpenseInput): boolean {
  if (!can(getState(), 'money')) return submitExpense(input);
  const ok = checkExpense(input);
  if (!ok) return false;
  const { what, amt } = ok;
  update((d) => {
    d.expenses.unshift({ id: 'e' + Date.now(), what, cat: input.cat, amount: amt, branch: myBranch(d), when: TODAY });
    addLog(d, 'Recorded a cost: ' + what, naira(amt));
  });
  closeSheet();
  toast('Recorded.', naira(amt) + ' added to this month’s costs.');
  return true;
}

/** Staff without money rights send a cost for approval instead of recording it. */
export function submitExpense(input: ExpenseInput): boolean {
  const ok = checkExpense(input);
  if (!ok) return false;
  const { what, amt } = ok;
  update((d) => {
    const n = [...d.expensesPending, ...d.expenses]
      .filter((x) => x.id.startsWith('X-'))
      .reduce((max, x) => Math.max(max, Number(x.id.slice(2)) || 0), 0) + 1;
    d.expensesPending.unshift({ id: 'X-' + n, what, cat: input.cat, amount: amt, branch: myBranch(d), when: TODAY, by: d.actor! });
    addLog(d, 'Submitted a cost for approval: ' + what, naira(amt));
  });
  closeSheet();
  toast('Sent for approval.', naira(amt) + ' shows in Approvals until finance or a manager decides.');
  return true;
}

export function decideExpense(id: string, ok: boolean): void {
  const s = getState();
  const x = s.expensesPending.find((e) => e.id === id);
  if (!x) return;
  if (x.by === s.actor) {
    toast('You cannot approve your own expense.', 'Someone else has to.');
    return;
  }
  if (!can(s, 'money')) {
    toast('Only finance or a manager can decide on costs.');
    return;
  }
  update((d) => {
    if (ok) d.expenses.unshift({ id: x.id, what: x.what, cat: x.cat, amount: x.amount, branch: x.branch, when: x.when });
    d.expensesPending = d.expensesPending.filter((e) => e.id !== id);
    addLog(d, (ok ? 'Approved' : 'Declined') + ' expense: ' + x.what, naira(x.amount));
  });
  toast(ok ? 'Approved and added to costs.' : 'Expense declined.');
}

/* ---------------- exports ---------------- */

export function exportStaff(): void {
  const s = getState();
  const rows: (string | number)[][] = [['Staff', 'Role', 'Branch', 'Department', 'Badge', 'Started', 'Days present (30d)', 'Times late']];
  s.staff.forEach((x) => {
    const a = s.attendance.filter((r) => r.staff === x.id);
    rows.push([x.name, x.roleName, branchName(s, x.branch), x.dept, x.badge, x.hired, a.length, a.filter((r) => r.late).length]);
  });
  downloadText('staff.csv', toCSV(rows));
  update((d) => addLog(d, 'Exported the staff list', rows.length - 1 + ' rows'));
  toast('Downloaded ' + (rows.length - 1) + ' staff records.');
}
