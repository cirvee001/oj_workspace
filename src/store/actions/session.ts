import type { BranchId, ClockMode, SalesRange, Staff } from '@/types/domain';
import { DEFAULT_ROLE_INTRO, ROLE_INTRO } from '@/config/permissions';
import { firstName } from '@/lib/format';
import { niceDate } from '@/lib/dates';
import { getState, update } from '../appStore';
import { branchName, me, myBranch } from '../selectors';
import { toast } from '../ui/toastStore';
import { closeSheet } from '../ui/sheetStore';
import { clearPrint } from '../ui/printStore';
import { addLog } from './core';

export type SignInResult = { ok: true } | { ok: false; error: string };

/** Leavers keep their history, but their account is closed. */
const closedAccount = (x: Staff): string | null =>
  x.left ? x.name + ' left on ' + niceDate(x.left) + ', so this account is closed. See a manager if this is wrong.' : null;

function completeSignIn(id: string, how: string): void {
  update((d) => {
    d.actor = id;
    const role = me(d).role;
    if (role !== 'owner' && role !== 'ops') d.branch = me(d).branch;
    addLog(d, 'Signed in', 'via ' + how);
  });
  const s = getState();
  const who = me(s);
  toast(
    'Welcome back, ' + firstName(who.name) + '.',
    who.roleName + ' · ' + (who.role === 'owner' ? 'every branch' : branchName(s, myBranch(s))),
  );
}

/** Demo rule: username is the person's id or first name, the password is "fashion". */
export function signInWithPassword(username: string, password: string): SignInResult {
  const u = username.trim().toLowerCase();
  if (!u || !password) return { ok: false, error: 'Enter your username and password.' };
  const found = getState().staff.find(
    (x) =>
      x.id === u ||
      x.name.toLowerCase().split(' ')[0] === u ||
      x.name.toLowerCase().replace(/\s+/g, '.') + '@ojclothing.com' === u,
  );
  if (!found || password.toLowerCase() !== 'fashion') {
    return { ok: false, error: 'That username or password is not right. (For the demo the password is "fashion".)' };
  }
  const closed = closedAccount(found);
  if (closed) return { ok: false, error: closed };
  completeSignIn(found.id, 'password');
  return { ok: true };
}

export function signInWithBadge(badge: string): SignInResult {
  const found = getState().staff.find((x) => x.badge === badge);
  if (!found) return { ok: false, error: 'That badge number was not recognised.' };
  const closed = closedAccount(found);
  if (closed) return { ok: false, error: closed };
  completeSignIn(found.id, 'badge number');
  return { ok: true };
}

export function signInWithSso(provider: 'google' | 'microsoft'): void {
  completeSignIn('tunde', provider === 'google' ? 'Google Workspace' : 'Microsoft 365');
}

export function signInAs(id: string): SignInResult {
  const found = getState().staff.find((x) => x.id === id);
  if (!found) return { ok: false, error: 'That account was not found.' };
  const closed = closedAccount(found);
  if (closed) {
    toast(closed);
    return { ok: false, error: closed };
  }
  completeSignIn(id, 'demo account');
  return { ok: true };
}

export function signOut(): void {
  update((d) => {
    addLog(d, 'Signed out');
    d.actor = null;
  });
  closeSheet();
  clearPrint();
}

/** The demo user switcher in the top bar. */
export function switchUser(id: string): void {
  const found = getState().staff.find((x) => x.id === id);
  const closed = found ? closedAccount(found) : 'That account was not found.';
  if (closed) {
    toast(closed);
    return;
  }
  update((d) => {
    d.actor = id;
    if (me(d).role !== 'owner') d.branch = me(d).branch;
  });
  const who = me(getState());
  toast('Signed in as ' + who.name + ', ' + who.roleName + '.', ROLE_INTRO[who.role] ?? DEFAULT_ROLE_INTRO);
}

export const setBranch = (branch: BranchId): void => update((d) => void (d.branch = branch));
export const setSalesRange = (range: SalesRange): void => update((d) => void (d.range = range));
export const setClockMode = (mode: ClockMode): void => update((d) => void (d.clockMode = mode));
