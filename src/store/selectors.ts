/**
 * Pure read helpers over AppState. They take the state explicitly so they
 * work equally inside components (via hooks) and inside actions/drafts.
 */
import type {
  AppState,
  BranchId,
  Customer,
  Job,
  Material,
  Order,
  Permission,
  SalesRange,
  Staff,
  Style,
  Supplier,
} from '@/types/domain';
import { CROSS_BRANCH_ROLES, roleCan } from '@/config/permissions';
import { TODAY, daysFromToday, iso } from '@/lib/dates';

const NO_CUSTOMER: Customer = { id: '', name: '—', phone: '', channel: 'Walk-in', birthday: '', branch: '', since: '', tags: [], sizes: {}, notes: '' };
const NO_STYLE: Style = { id: '', name: '—', price: 0, tol: 0, days: 0, specs: { S: 0, M: 0, L: 0, XL: 0, '2XL': 0 } };
const NO_MATERIAL: Material = { id: '', name: '—', kind: 'Fabric', unit: '', patterned: false, reorder: 0, cost: 0, supplier: '', stock: {} };
const NO_SUPPLIER: Supplier = { id: '', name: '—', phone: '', terms: '', owed: 0, rating: 0 };

/** The signed-in staff member. Only call inside the signed-in app. */
export function me(s: AppState): Staff {
  const found = s.staff.find((x) => x.id === s.actor);
  if (!found) throw new Error('No one is signed in');
  return found;
}

export const can = (s: AppState, perm: Permission): boolean => roleCan(me(s).role, perm);
export const isOwner = (s: AppState): boolean => me(s).role === 'owner';

/** The branch whose data is on screen. Cross-branch roles follow the switcher. */
export const myBranch = (s: AppState): BranchId =>
  CROSS_BRANCH_ROLES.includes(me(s).role) ? s.branch : me(s).branch;

export const nameOf = (s: AppState, id: string | null | undefined): string =>
  s.staff.find((x) => x.id === id)?.name ?? '—';
export const staffOf = (s: AppState, id: string): Staff | undefined => s.staff.find((x) => x.id === id);
export const customerOf = (s: AppState, id: string): Customer => s.customers.find((c) => c.id === id) ?? NO_CUSTOMER;
export const styleOf = (s: AppState, id: string): Style => s.styles.find((x) => x.id === id) ?? NO_STYLE;
export const materialOf = (s: AppState, id: string): Material => s.materials.find((m) => m.id === id) ?? NO_MATERIAL;
export const supplierOf = (s: AppState, id: string): Supplier => s.suppliers.find((x) => x.id === id) ?? NO_SUPPLIER;
export const orderOf = (s: AppState, id: string): Order | undefined => s.orders.find((o) => o.id === id);
export const jobOf = (s: AppState, id: string): Job | undefined => s.jobs.find((j) => j.id === id);
export const branchName = (s: AppState, id: BranchId): string => s.branches.find((b) => b.id === id)?.name ?? id;

export const stockOf = (s: AppState, materialId: string, branch?: BranchId): number =>
  materialOf(s, materialId).stock[branch ?? myBranch(s)] ?? 0;

export const isLate = (j: Job): boolean => j.stage !== 'delivery' && j.due < TODAY;
/** What is still owed. A cancelled order owes nothing. */
export const balanceOf = (o: Order): number => (o.status === 'cancelled' ? 0 : Math.max(0, o.total - o.paid));
export const isOpenOrder = (o: Order): boolean => o.status === 'making';
export const orderBranch = (s: AppState, orderId: string): BranchId | undefined => orderOf(s, orderId)?.branch;

/** Staff still working here. Leavers keep their history but drop off rosters. */
export const isCurrentStaff = (x: Staff): boolean => !x.left;

export const branchOrders = (s: AppState): Order[] => s.orders.filter((o) => o.branch === myBranch(s));
export const branchJobs = (s: AppState): Job[] => s.jobs.filter((j) => orderBranch(s, j.order) === myBranch(s));
export const branchStaff = (s: AppState): Staff[] => s.staff.filter((x) => x.branch === myBranch(s) && isCurrentStaff(x));
export const tailors = (s: AppState): Staff[] => s.staff.filter((x) => x.role === 'tailor' && isCurrentStaff(x));

export const owedTotal = (s: AppState): number => branchOrders(s).reduce((n, o) => n + balanceOf(o), 0);
export const lowStock = (s: AppState): Material[] =>
  s.materials.filter((m) => stockOf(s, m.id, myBranch(s)) <= m.reorder);

/** Payments plus rail sales taken at a branch over a date range (inclusive). */
export function takings(s: AppState, branch: BranchId, from: string, to: string = from) {
  const inRange = (d: string) => d >= from && d <= to;
  const orders = s.payments
    .filter((p) => inRange(p.when) && orderBranch(s, p.order) === branch)
    .reduce((n, p) => n + p.amount, 0);
  const shop = s.sales.filter((x) => inRange(x.when) && x.branch === branch).reduce((n, x) => n + x.amount, 0);
  return { orders, shop, total: orders + shop };
}

const RANGE_CFG: Record<SalesRange, { n: number; step: number }> = {
  '7d': { n: 7, step: 1 },
  '30d': { n: 30, step: 1 },
  '12w': { n: 12, step: 7 },
  '12m': { n: 12, step: 30 },
};

/** Takings bucketed over a window, in naira (not kobo) for charting. */
export function salesSeries(s: AppState, range: SalesRange) {
  const cfg = RANGE_CFG[range];
  const branch = myBranch(s);
  const orders: number[] = [];
  const shop: number[] = [];
  const labels: string[] = [];
  for (let i = cfg.n - 1; i >= 0; i--) {
    const end = -i * cfg.step;
    const start = end - cfg.step + 1;
    const t = takings(s, branch, iso(daysFromToday(start)), iso(daysFromToday(end)));
    orders.push(Math.round(t.orders / 100));
    shop.push(Math.round(t.shop / 100));
    const dt = daysFromToday(end);
    labels.push(
      cfg.step === 1
        ? dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : cfg.step === 7
          ? 'w/c ' + dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : dt.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    );
  }
  return { orders, shop, labels };
}

export const customerSpent = (s: AppState, customerId: string): number =>
  s.orders.filter((o) => o.customer === customerId).reduce((n, o) => n + o.paid, 0);
export const customerOwes = (s: AppState, customerId: string): number =>
  s.orders.filter((o) => o.customer === customerId).reduce((n, o) => n + balanceOf(o), 0);

/** Customers with no order in the last six months. */
export const quietCustomers = (s: AppState): Customer[] => {
  const cutoff = iso(daysFromToday(-180));
  return s.customers.filter((c) => !s.orders.some((o) => o.customer === c.id && o.created > cutoff));
};
