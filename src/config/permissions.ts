import type { Permission, Role } from '@/types/domain';

/**
 * Each role sees only what that job needs (PRD §4).
 * The real system reads these from the database per user.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ['*'],
  ops: ['approve', 'issue', 'order', 'sell', 'production', 'staff', 'money', 'correct', 'market',
    'transfer', 'buy', 'chat', 'customer', 'payroll.prepare', 'branch.view_all'],
  manager: ['approve', 'issue', 'order', 'sell', 'production', 'staff', 'money', 'correct',
    'transfer', 'buy', 'chat', 'customer', 'payroll.prepare'],
  hr: ['staff', 'payroll.prepare', 'correct', 'customer'],
  finance: ['money', 'payroll.prepare', 'buy', 'order', 'customer', 'approve.expense'],
  prod: ['production', 'approve', 'request', 'return', 'production.view', 'order'],
  store: ['issue', 'production.view', 'buy', 'transfer', 'request'],
  tailor: ['request', 'return', 'production.own'],
  sales: ['order', 'sell', 'chat', 'customer'],
};

export function roleCan(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  const list = ROLE_PERMISSIONS[role];
  return list.includes('*') || list.includes(perm);
}

/** Roles that look across every branch rather than being pinned to their own. */
export const CROSS_BRANCH_ROLES: readonly Role[] = ['owner', 'ops', 'finance'];

/** What each role is shown on first sign-in or when switching user. */
export const ROLE_INTRO: Partial<Record<Role, string>> = {
  tailor: 'A tailor sees their own jobs and fabric — no takings, no wages, no client numbers.',
  store: 'The store keeper issues fabric and takes in deliveries.',
  sales: 'Sales take orders and payments and answer messages.',
  manager: 'A manager runs one branch and can approve requests.',
};
export const DEFAULT_ROLE_INTRO = 'The owner sees every branch and approves everything.';
