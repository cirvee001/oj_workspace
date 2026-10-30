/**
 * Work queues derived from the business data: what needs approving, what to
 * be notified about, what is on my plate, and what needs attention today.
 * Each item carries a `target` saying where tapping it should go.
 */
import type { AppState, Permission } from '@/types/domain';
import type { IconName } from '@/components/ui/Icon';
import type { ScreenKey } from '@/config/navigation';
import type { SheetRef } from './ui/sheetStore';
import { YARD_VALUE_KOBO, isEnquiryClosed, stageName } from '@/config/constants';
import { dueDate, isBirthdayToday, niceDate, TODAY } from '@/lib/dates';
import { naira, nairaShort, plural, qty, round1 } from '@/lib/format';
import {
  branchJobs,
  branchName,
  branchOrders,
  can,
  customerOf,
  isLate,
  lowStock,
  materialOf,
  myBranch,
  nameOf,
  orderOf,
  stockOf,
  styleOf,
  balanceOf,
} from './selectors';
import { decideIssue } from './actions/fabric';
import { acceptCount, approveTransfer, declineTransfer } from './actions/stock';
import { approvePayroll, decideExpense, decideLeave } from './actions/people';

/** Where tapping an item goes: a screen, a sheet, or a page by URL (e.g. a customer's profile). */
export type Target = { screen: ScreenKey } | { sheet: SheetRef } | { path: string } | null;

/* ---------------- approvals (PRD §37) ---------------- */

export interface ApprovalItem {
  id: string;
  kind: 'Extra material' | 'Stock transfer' | 'Leave' | 'Expense' | 'Stock difference' | 'Payroll';
  icon: IconName;
  urgent: boolean;
  what: string;
  detail: string;
  /** Who asked. You cannot approve your own request. */
  by: string | null;
  branch: string;
  perm: Permission;
  approve: () => void;
  decline?: () => void;
}

export function pendingApprovals(s: AppState): ApprovalItem[] {
  const list: ApprovalItem[] = [];
  s.issues.filter((i) => i.status === 'needs_approval').forEach((i) =>
    list.push({
      id: i.id, kind: 'Extra material', icon: 'layers', urgent: true,
      what: nameOf(s, i.to) + ' wants ' + qty(i.requested) + ' yards of ' + materialOf(s, i.material).name,
      detail: 'Job ' + i.job + ' · this style takes ' + qty(i.expected) + ' yards. Reason: "' + (i.reason || '—') + '"',
      by: i.by, branch: i.branch, perm: 'approve',
      approve: () => decideIssue(i.id, true), decline: () => decideIssue(i.id, false),
    }),
  );
  s.transfers.filter((t) => t.status === 'requested').forEach((t) => {
    const m = materialOf(s, t.material);
    list.push({
      id: t.id, kind: 'Stock transfer', icon: 'truck', urgent: false,
      what: qty(t.qty) + ' ' + m.unit + ' of ' + m.name + ' from ' + branchName(s, t.from) + ' to ' + branchName(s, t.to),
      detail: t.note || 'No reason given.', by: t.by, branch: t.from, perm: 'approve',
      approve: () => approveTransfer(t.id), decline: () => declineTransfer(t.id),
    });
  });
  s.leave.filter((l) => l.status === 'requested').forEach((l) =>
    list.push({
      id: l.id, kind: 'Leave', icon: 'cal', urgent: false,
      what: nameOf(s, l.staff) + ' wants ' + plural(l.days, 'day') + ' off',
      detail: l.kind + ' · ' + niceDate(l.from) + ' to ' + niceDate(l.to) + ' · "' + l.reason + '"',
      by: l.staff, branch: s.staff.find((x) => x.id === l.staff)?.branch ?? '', perm: 'staff',
      approve: () => decideLeave(l.id, true), decline: () => decideLeave(l.id, false),
    }),
  );
  s.expensesPending.forEach((x) =>
    list.push({
      id: x.id, kind: 'Expense', icon: 'coins', urgent: x.amount > 5_000_000,
      what: x.what + ' — ' + naira(x.amount),
      detail: x.cat + ' at ' + branchName(s, x.branch) + ' · submitted by ' + nameOf(s, x.by) + ' ' + niceDate(x.when),
      by: x.by, branch: x.branch, perm: 'money',
      approve: () => decideExpense(x.id, true), decline: () => decideExpense(x.id, false),
    }),
  );
  s.stockCounts.filter((c) => c.status === 'review').forEach((c) => {
    const diff = c.lines.reduce((n, l) => n + (l.counted - l.system), 0);
    list.push({
      id: c.id, kind: 'Stock difference', icon: 'layers', urgent: Math.abs(diff) > 3,
      what: 'Stock count at ' + branchName(s, c.branch) + ' is out by ' + qty(round1(diff)) + ' yards',
      detail: c.lines.filter((l) => l.counted !== l.system)
        .map((l) => materialOf(s, l.material).name + ': system ' + qty(l.system) + ', counted ' + qty(l.counted)).join(' · '),
      by: c.by, branch: c.branch, perm: 'approve',
      approve: () => acceptCount(c.id),
    });
  });
  if (s.payroll.status === 'pending') {
    list.push({
      id: 'payroll', kind: 'Payroll', icon: 'wallet', urgent: true,
      what: 'Payroll for ' + s.payroll.month + ' — ' + nairaShort(s.payroll.lines.reduce((n, l) => n + l.net, 0)),
      detail: 'Prepared by ' + nameOf(s, s.payroll.preparedBy) + ' for ' + s.payroll.lines.length + ' staff.',
      by: s.payroll.preparedBy, branch: myBranch(s), perm: '*',
      approve: approvePayroll,
    });
  }
  return list;
}

/** Approvals this person may decide (excluding their own requests). */
export const approvalsForMe = (s: AppState): ApprovalItem[] =>
  pendingApprovals(s).filter((a) => can(s, a.perm) && a.by !== s.actor);

/* ---------------- notifications (PRD §32) ---------------- */

export type NoticeLevel = 'Urgent' | 'Important' | 'Normal';

export interface Notice {
  level: NoticeLevel;
  icon: IconName;
  title: string;
  body: string;
  target: Target;
}

const followUpsDue = (s: AppState) =>
  s.enquiries.filter((e) => e.nextFollowUp && e.nextFollowUp <= TODAY && !isEnquiryClosed(e.stage));

export function buildNotifications(s: AppState): Notice[] {
  const out: Notice[] = [];
  const here = myBranch(s);
  branchJobs(s).filter(isLate).forEach((j) =>
    out.push({ level: 'Urgent', icon: 'clock',
      title: 'Order ' + j.order + ' is ' + dueDate(j.due).toLowerCase(),
      body: customerOf(s, orderOf(s, j.order)?.customer ?? '').name + ' · sitting at ' + stageName(j.stage),
      target: { sheet: { type: 'job', id: j.id } } }),
  );
  s.issues.filter((i) => i.status === 'needs_approval').forEach((i) =>
    out.push({ level: 'Urgent', icon: 'layers', title: 'Extra fabric request is holding up job ' + i.job,
      body: nameOf(s, i.to) + ' asked for ' + qty(i.requested) + ' yards instead of ' + qty(i.expected) + '.',
      target: { screen: 'approvals' } }),
  );
  s.stockCounts.filter((c) => c.status === 'review').forEach((c) =>
    out.push({ level: 'Urgent', icon: 'layers', title: 'Stock count at ' + branchName(s, c.branch) + ' does not match',
      body: 'Counted ' + niceDate(c.when) + ' by ' + nameOf(s, c.by) + '. Needs a decision.', target: { screen: 'approvals' } }),
  );
  lowStock(s).forEach((m) =>
    out.push({ level: 'Important', icon: 'layers', title: m.name + ' is low — ' + qty(stockOf(s, m.id, here)) + ' ' + m.unit + ' left',
      body: 'You reorder at ' + qty(m.reorder) + '.', target: { screen: 'buying' } }),
  );
  branchOrders(s).filter((o) => balanceOf(o) > 0).slice(0, 5).forEach((o) =>
    out.push({ level: 'Important', icon: 'coins', title: customerOf(s, o.customer).name + ' owes ' + naira(balanceOf(o)),
      body: 'Order ' + o.id + ' · due ' + dueDate(o.due), target: { sheet: { type: 'order', id: o.id } } }),
  );
  s.leave.filter((l) => l.status === 'requested').forEach((l) =>
    out.push({ level: 'Important', icon: 'cal', title: nameOf(s, l.staff) + ' asked for ' + l.days + ' days off',
      body: l.kind + ' from ' + niceDate(l.from), target: { screen: 'approvals' } }),
  );
  s.chats.filter((c) => !c.assigned).forEach((c) =>
    out.push({ level: 'Important', icon: 'chat', title: customerOf(s, c.customer).name + ' is waiting for a reply',
      body: c.channel + ' · "' + c.messages[c.messages.length - 1].text.slice(0, 50) + '"',
      target: { sheet: { type: 'chat', id: c.id } } }),
  );
  followUpsDue(s).slice(0, 5).forEach((e) =>
    out.push({ level: 'Normal', icon: 'chat', title: 'Follow up ' + e.name,
      body: styleOf(s, e.style).name + ' · worth about ' + naira(e.value), target: { sheet: { type: 'enquiry', id: e.id } } }),
  );
  s.customers.filter((c) => isBirthdayToday(c.birthday)).forEach((c) =>
    out.push({ level: 'Normal', icon: 'star', title: c.name + '’s birthday is today',
      body: 'The automatic message goes out at 9am.', target: { path: '/customers/' + c.id } }),
  );
  s.alerts.forEach((a) => out.push({ level: a.hot ? 'Urgent' : 'Normal', icon: 'bell', title: a.title, body: a.body, target: null }));
  return out;
}

/* ---------------- my work today (PRD §31) ---------------- */

export interface WorkItem {
  icon: IconName;
  title: string;
  body: string;
  urgent: boolean;
  target: Target;
}

export function myWorkToday(s: AppState): WorkItem[] {
  const out: WorkItem[] = [];
  branchJobs(s).filter((j) => j.assigned === s.actor && j.stage !== 'delivery').forEach((j) => {
    const o = orderOf(s, j.order);
    out.push({ icon: 'scissors',
      title: stageName(j.stage) + ' — ' + styleOf(s, o?.style ?? '').name + ' for ' + customerOf(s, o?.customer ?? '').name,
      body: j.id + ' · due ' + dueDate(j.due) + (isLate(j) ? ' · LATE' : ''), urgent: isLate(j),
      target: { sheet: { type: 'job', id: j.id } } });
  });
  s.issues.filter((i) => i.to === s.actor && i.status === 'issued' && !i.returned).forEach((i) =>
    out.push({ icon: 'layers', title: 'Bring back what is left of ' + materialOf(s, i.material).name,
      body: qty(i.issued) + ' yards went out for job ' + i.job, urgent: false,
      target: { sheet: { type: 'returnFabric', issueId: i.id } } }),
  );
  followUpsDue(s).filter((e) => e.owner === s.actor).forEach((e) =>
    out.push({ icon: 'chat', title: 'Follow up ' + e.name, body: styleOf(s, e.style).name + ' · worth about ' + naira(e.value),
      urgent: false, target: { sheet: { type: 'enquiry', id: e.id } } }),
  );
  s.chats.filter((c) => c.assigned === s.actor && c.status === 'open').forEach((c) =>
    out.push({ icon: 'chat', title: 'Reply to ' + customerOf(s, c.customer).name, body: c.channel, urgent: false,
      target: { sheet: { type: 'chat', id: c.id } } }),
  );
  approvalsForMe(s).forEach((a) =>
    out.push({ icon: 'check', title: 'Decide: ' + a.what, body: a.kind, urgent: a.urgent, target: { screen: 'approvals' } }),
  );
  return out.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

/* ---------------- needs your attention (dashboard) ---------------- */

export function attentionItems(s: AppState): WorkItem[] {
  const out: WorkItem[] = [];
  const here = myBranch(s);
  const late = branchJobs(s).filter(isLate);
  if (late.length) {
    out.push({ urgent: true, icon: 'clock',
      title: late.length + ' order' + (late.length === 1 ? ' is' : 's are') + ' overdue.',
      body: late.slice(0, 3).map((j) => customerOf(s, orderOf(s, j.order)?.customer ?? '').name).join(', ') +
        (late.length > 3 ? ' and ' + (late.length - 3) + ' more' : '') + '.',
      target: { screen: 'workshop' } });
  }
  s.issues.filter((i) => i.status === 'needs_approval').forEach((i) =>
    out.push({ urgent: true, icon: 'layers',
      title: nameOf(s, i.to) + ' requested ' + qty(i.requested - i.expected) + ' additional yards for an order already allocated ' +
        qty(i.expected) + ' yards.',
      body: 'Job ' + i.job + ' · reason given: "' + (i.reason || '—') + '"', target: { screen: 'approvals' } }),
  );
  lowStock(s).forEach((m) =>
    out.push({ urgent: false, icon: 'layers', title: m.name + ' has only ' + qty(stockOf(s, m.id, here)) + ' ' + m.unit + ' remaining.',
      body: s.pos.some((p) => p.material === m.id && p.status !== 'received') ? 'An order is already on the way.' : 'Nothing is on order.',
      target: { screen: 'buying' } }),
  );
  const owing = branchOrders(s).filter((o) => balanceOf(o) > 0);
  if (owing.length) {
    out.push({ urgent: false, icon: 'coins',
      title: owing.length + ' customer' + (owing.length === 1 ? ' has' : 's have') + ' outstanding balances.',
      body: nairaShort(owing.reduce((n, o) => n + balanceOf(o), 0)) + ' owed in total.', target: { screen: 'money' } });
  }
  s.stockCounts.filter((c) => c.status === 'review').forEach((c) =>
    out.push({ urgent: true, icon: 'layers', title: branchName(s, c.branch) + ' has a stock count waiting to be accepted.',
      body: 'Counted ' + niceDate(c.when) + ' by ' + nameOf(s, c.by) + '.', target: { screen: 'stockcount' } }),
  );
  if (s.payroll.status === 'pending') {
    out.push({ urgent: true, icon: 'wallet', title: 'Payroll for ' + s.payroll.month + ' is waiting for approval.',
      body: 'Prepared by ' + nameOf(s, s.payroll.preparedBy) + '. Nobody is paid until it is approved.', target: { screen: 'payroll' } });
  }
  s.leave.filter((l) => l.status === 'requested').forEach((l) =>
    out.push({ urgent: false, icon: 'cal', title: nameOf(s, l.staff) + ' has requested ' + l.days + ' days of leave.',
      body: l.kind + ' from ' + niceDate(l.from) + '.', target: { screen: 'approvals' } }),
  );
  const follow = followUpsDue(s);
  if (follow.length) {
    out.push({ urgent: false, icon: 'chat',
      title: follow.length + ' enquir' + (follow.length === 1 ? 'y needs' : 'ies need') + ' following up today.',
      body: 'Worth about ' + nairaShort(follow.reduce((n, e) => n + e.value, 0)) + ' if they all ordered.',
      target: { screen: 'enquiries' } });
  }
  const closed = s.issues.filter((i) => i.returned && i.result);
  const unusual = closed.filter((i) => i.result!.gap > 0).length;
  const missing = closed.reduce((n, i) => n + i.result!.gap, 0);
  if (unusual) {
    out.push({ urgent: true, icon: 'layers',
      title: unusual + ' job' + (unusual === 1 ? ' has' : 's have') + ' unexplained fabric differences.',
      body: qty(round1(missing)) + ' yards unaccounted for, worth about ' + nairaShort(missing * YARD_VALUE_KOBO) + '.',
      target: { screen: 'reports' } });
  }
  s.chats.filter((c) => !c.assigned).forEach((c) =>
    out.push({ urgent: false, icon: 'chat', title: customerOf(s, c.customer).name + ' is waiting for a reply.',
      body: c.channel + ' · nobody has picked it up.', target: { sheet: { type: 'chat', id: c.id } } }),
  );
  s.alerts.forEach((a) => out.push({ urgent: a.hot, icon: 'bell', title: a.title, body: a.body, target: null }));
  return out.sort((a, b) => Number(b.urgent) - Number(a.urgent));
}

/* ---------------- sidebar counters ---------------- */

export function navBadge(s: AppState, key: ScreenKey): number {
  switch (key) {
    case 'approvals': return approvalsForMe(s).length;
    case 'notifications': return buildNotifications(s).filter((n) => n.level === 'Urgent').length;
    case 'enquiries': return followUpsDue(s).length;
    case 'leave': return s.leave.filter((l) => l.status === 'requested').length;
    case 'stockcount': return s.stockCounts.filter((c) => c.status === 'review').length;
    case 'fabric': return s.issues.filter((i) => i.status === 'needs_approval').length;
    case 'chat': return s.chats.filter((c) => !c.assigned).length;
    case 'branches': return s.transfers.filter((t) => t.status !== 'received').length;
    case 'payroll': return s.payroll.status === 'pending' ? 1 : 0;
    case 'workshop': return branchJobs(s).filter(isLate).length;
    default: return 0;
  }
}

/** The number on the top-bar bell. */
export const bellCount = (s: AppState): number =>
  s.issues.filter((i) => i.status === 'needs_approval').length +
  s.chats.filter((c) => !c.assigned).length +
  (s.payroll.status === 'pending' ? 1 : 0);
