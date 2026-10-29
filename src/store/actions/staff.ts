import type { AppState, BranchId, Role, Staff } from '@/types/domain';
import { CROSS_BRANCH_ROLES } from '@/config/permissions';
import { stageName } from '@/config/constants';
import { TODAY, niceDate } from '@/lib/dates';
import { firstName, naira, qty, toKobo } from '@/lib/format';
import { getState, update } from '../appStore';
import { can, isOwner, materialOf, me, nameOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { confirmDialog, promptDialog } from '../ui/dialogStore';
import { addLog } from './core';

/* ---------------- staff records: hire, edit, leave ---------------- */

/** The job title shown for each role. Same names the seed uses. */
export const ROLE_NAMES: Record<Role, string> = {
  owner: 'Owner',
  ops: 'Operations Manager',
  manager: 'Branch Manager',
  store: 'Store Keeper',
  tailor: 'Tailor',
  sales: 'Sales',
  hr: 'HR & Admin',
  finance: 'Finance',
  prod: 'Production Manager',
};

/** The department a new hire in each role usually sits in. */
export const ROLE_DEPTS: Record<Role, string> = {
  owner: 'Management',
  ops: 'Management',
  manager: 'Management',
  store: 'Store',
  tailor: 'Production',
  sales: 'Sales',
  hr: 'Admin',
  finance: 'Finance',
  prod: 'Production',
};

export interface StaffInput {
  name: string;
  role: Role;
  branch: BranchId;
  dept: string;
  /** Monthly salary in naira, as typed. */
  salaryNaira: string | number;
  hired: string;
}

/** Who may set pay: anyone with money rights (the owner has every right). */
export const canSetSalary = (s: AppState): boolean => can(s, 'money');

/** Whether the signed-in person may pick any branch for a staff record. */
export const canPickAnyBranch = (s: AppState): boolean => CROSS_BRANCH_ROLES.includes(me(s).role);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (v: string): boolean => ISO_DATE.test(v) && !isNaN(new Date(v).getTime());

function sixDigits(taken: Set<string>): string {
  for (;;) {
    const n = String(100000 + Math.floor(Math.random() * 900000));
    if (!taken.has(n)) return n;
  }
}

function newStaffId(s: AppState, name: string): string {
  const base = firstName(name).toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff';
  const ids = new Set(s.staff.map((x) => x.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(base + n)) n++;
  return base + n;
}

/** Shared checks for add and edit. Returns the cleaned values, or null after a toast. */
function checkInput(s: AppState, input: StaffInput, existing?: Staff) {
  if (!can(s, 'staff')) {
    toast('Only HR or a manager can change staff records.');
    return null;
  }
  const name = input.name.trim().replace(/\s+/g, ' ');
  const dept = input.dept.trim();
  if (name.length < 3 || !name.includes(' ')) {
    toast('Enter their full name.', 'First name and surname.');
    return null;
  }
  if (!ROLE_NAMES[input.role]) {
    toast('Pick a role.');
    return null;
  }
  if ((input.role === 'owner' || existing?.role === 'owner') && !isOwner(s)) {
    toast('Only the owner can give or change the owner role.');
    return null;
  }
  if (existing && existing.id === s.actor && existing.role !== input.role) {
    toast('You cannot change your own role.', 'Someone else has to.');
    return null;
  }
  if (!s.branches.some((b) => b.id === input.branch)) {
    toast('Pick a branch.');
    return null;
  }
  if (!canPickAnyBranch(s)) {
    const own = me(s).branch;
    if (input.branch !== own || (existing && existing.branch !== own)) {
      toast('You can only manage staff at your own branch.', 'Ask operations to move someone between branches.');
      return null;
    }
  }
  if (!dept) {
    toast('Enter their department.');
    return null;
  }
  if (!isIsoDate(input.hired)) {
    toast('Enter the date they started.');
    return null;
  }
  let salary = existing?.salary ?? 0;
  if (canSetSalary(s)) {
    salary = toKobo(input.salaryNaira);
    if (salary < 0 || isNaN(salary)) {
      toast('Check the salary.');
      return null;
    }
    if (existing && existing.id === s.actor && salary !== existing.salary && !isOwner(s)) {
      toast('You cannot change your own pay.', 'Someone else has to.');
      return null;
    }
  }
  return { name, dept, salary };
}

/** Add someone to staff. Returns their new id, or null if the input was refused. */
export function addStaff(input: StaffInput): string | null {
  const s = getState();
  const ok = checkInput(s, input);
  if (!ok) return null;
  const id = newStaffId(s, ok.name);
  const badge = sixDigits(new Set(s.staff.map((x) => x.badge)));
  const pin = sixDigits(new Set(s.staff.map((x) => x.pin)));
  update((d) => {
    d.staff.push({
      id, name: ok.name, role: input.role, roleName: ROLE_NAMES[input.role], branch: input.branch, dept: ok.dept,
      pin, badge, salary: ok.salary, hired: input.hired,
    });
    addLog(d, 'Added ' + ok.name + ' to staff', ROLE_NAMES[input.role] + ' · badge ' + badge);
  });
  closeSheet();
  toast(ok.name + ' added.', 'Badge ' + badge + '. Print their badge from Clock in.');
  return id;
}

export function updateStaff(id: string, input: StaffInput): boolean {
  const s = getState();
  const x = s.staff.find((v) => v.id === id);
  if (!x) return false;
  if (x.left) {
    toast(x.name + ' has left.', 'Their record is kept as it was.');
    return false;
  }
  const ok = checkInput(s, input, x);
  if (!ok) return false;
  const changes: string[] = [];
  if (x.name !== ok.name) changes.push('name');
  if (x.role !== input.role) changes.push('role to ' + ROLE_NAMES[input.role]);
  if (x.branch !== input.branch) changes.push('branch');
  if (x.dept !== ok.dept) changes.push('department');
  if (x.hired !== input.hired) changes.push('start date');
  if (x.salary !== ok.salary) changes.push('salary to ' + naira(ok.salary));
  if (!changes.length) {
    closeSheet();
    toast('Nothing changed.');
    return true;
  }
  update((d) => {
    const rec = d.staff.find((v) => v.id === id)!;
    rec.name = ok.name;
    rec.role = input.role;
    rec.roleName = ROLE_NAMES[input.role];
    rec.branch = input.branch;
    rec.dept = ok.dept;
    rec.hired = input.hired;
    rec.salary = ok.salary;
    addLog(d, 'Updated ' + ok.name + '’s record', 'Changed ' + changes.join(', '));
  });
  closeSheet();
  toast('Saved.', ok.name + '’s record is up to date.');
  return true;
}

/** What someone still holds: open jobs and fabric not brought back. */
export function outstandingFor(s: AppState, id: string): string[] {
  const fab = s.issues.filter((i) => i.to === id && i.status === 'issued' && !i.returned);
  const jobs = s.jobs.filter((j) => j.assigned === id && j.stage !== 'delivery');
  return [
    ...fab.map((i) => qty(i.issued) + ' yards of ' + materialOf(s, i.material).name + ' not brought back (job ' + i.job + ')'),
    ...jobs.map((j) => 'Job ' + j.id + ' still with them at ' + stageName(j.stage)),
  ];
}

/** Checks that apply before anyone types a date. Returns false after a toast. */
function canMarkLeft(s: AppState, x: Staff): boolean {
  if (!can(s, 'staff')) {
    toast('Only HR or a manager can mark someone as left.');
    return false;
  }
  if (x.id === s.actor) {
    toast('You cannot mark yourself as left.', 'Someone else has to.');
    return false;
  }
  if (x.left) {
    toast(x.name + ' already left on ' + niceDate(x.left) + '.');
    return false;
  }
  if (x.role === 'owner' && !isOwner(s)) {
    toast('Only the owner can do that.');
    return false;
  }
  if (!canPickAnyBranch(s) && x.branch !== me(s).branch) {
    toast('You can only manage staff at your own branch.');
    return false;
  }
  const owed = outstandingFor(s, x.id);
  if (owed.length) {
    toast(firstName(x.name) + ' still has things to settle first.', owed.join(' · '));
    return false;
  }
  return true;
}

export function markLeft(id: string, date: string, reason: string): boolean {
  const s = getState();
  const x = s.staff.find((v) => v.id === id);
  if (!x || !canMarkLeft(s, x)) return false;
  const why = reason.trim();
  if (!isIsoDate(date)) {
    toast('Enter their last day as YYYY-MM-DD.');
    return false;
  }
  if (date > TODAY) {
    toast('Mark them as left on or after their last day.', 'Until then they are still on the roster.');
    return false;
  }
  if (date < x.hired) {
    toast('Their last day cannot be before they started.');
    return false;
  }
  if (why.length < 3) {
    toast('Say why they are leaving.');
    return false;
  }
  update((d) => {
    const rec = d.staff.find((v) => v.id === id)!;
    rec.left = date;
    addLog(d, nameOf(d, id) + ' left', niceDate(date) + ' · ' + why);
  });
  closeSheet();
  toast(x.name + ' is marked as left.', 'Their badge and sign-in no longer work. Their history is kept.');
  return true;
}

/** The "Mark as left" button: check first, then ask for the last day and the reason, then confirm. */
export async function confirmMarkLeft(id: string): Promise<void> {
  const s = getState();
  const x = s.staff.find((v) => v.id === id);
  if (!x || !canMarkLeft(s, x)) return;
  const date = await promptDialog({
    title: 'When was ' + firstName(x.name) + '’s last day?',
    defaultValue: TODAY,
    inputType: 'date',
    confirmLabel: 'Next',
  });
  if (date === null) return;
  const reason = await promptDialog({
    title: 'Why are they leaving?',
    placeholder: 'Resigned, moved to Abuja',
    confirmLabel: 'Next',
  });
  if (reason === null) return;
  const ok = await confirmDialog({
    title: 'Mark ' + x.name + ' as left?',
    message: 'They drop off rosters and payroll, and their badge and sign-in stop working. Their history is kept.',
    confirmLabel: 'Mark as left',
  });
  if (!ok) return;
  markLeft(id, date.trim(), reason);
}
