import type { AppState, Permission } from '@/types/domain';
import type { IconName } from '@/components/ui/Icon';
import { can, isOwner } from '@/store/selectors';

export type ScreenKey =
  | 'today'
  | 'customers'
  | 'enquiries'
  | 'orders'
  | 'workshop'
  | 'fabric'
  | 'shop'
  | 'buying'
  | 'stockcount'
  | 'branches'
  | 'staff'
  | 'kiosk'
  | 'leave'
  | 'payroll'
  | 'marketing'
  | 'influencers'
  | 'money'
  | 'reports'
  | 'approvals'
  | 'notifications'
  | 'chat'
  | 'history';

/** URL for each screen. */
export const PATHS: Record<ScreenKey, string> = {
  today: '/',
  customers: '/customers',
  enquiries: '/enquiries',
  orders: '/orders',
  workshop: '/production',
  fabric: '/fabric',
  shop: '/products',
  buying: '/suppliers',
  stockcount: '/stock-counts',
  branches: '/branches',
  staff: '/staff',
  kiosk: '/clock-in',
  leave: '/leave',
  payroll: '/payroll',
  marketing: '/marketing',
  influencers: '/influencers',
  money: '/money',
  reports: '/reports',
  approvals: '/approvals',
  notifications: '/notifications',
  chat: '/messages',
  history: '/activity',
};

export interface NavItem {
  key: ScreenKey;
  label: string;
  icon: IconName;
  perm: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Main menu',
    items: [
      { key: 'today', label: 'Home', icon: 'dash', perm: '*' },
      { key: 'customers', label: 'Customers', icon: 'users', perm: 'customer' },
      { key: 'enquiries', label: 'Enquiries', icon: 'chat', perm: 'order' },
      { key: 'orders', label: 'Orders', icon: 'receipt', perm: 'order' },
      { key: 'workshop', label: 'Production', icon: 'scissors', perm: 'production.view' },
    ],
  },
  {
    label: 'Stock',
    items: [
      { key: 'fabric', label: 'Fabric & materials', icon: 'layers', perm: 'request' },
      { key: 'shop', label: 'Finished products', icon: 'tag', perm: 'sell' },
      { key: 'buying', label: 'Suppliers', icon: 'truck', perm: 'buy' },
      { key: 'stockcount', label: 'Stock counts', icon: 'check', perm: 'issue' },
      { key: 'branches', label: 'Branches', icon: 'build', perm: 'branch.view_all' },
    ],
  },
  {
    label: 'People',
    items: [
      { key: 'staff', label: 'Staff', icon: 'staff', perm: 'staff' },
      { key: 'kiosk', label: 'Clock in', icon: 'clock', perm: '*' },
      { key: 'leave', label: 'Leave', icon: 'cal', perm: '*' },
      { key: 'payroll', label: 'Payroll', icon: 'wallet', perm: 'payroll.prepare' },
    ],
  },
  {
    label: 'Business',
    items: [
      { key: 'marketing', label: 'Marketing', icon: 'mega', perm: 'market' },
      { key: 'influencers', label: 'Influencers', icon: 'star', perm: 'market' },
      { key: 'money', label: 'Money', icon: 'coins', perm: 'money' },
      { key: 'reports', label: 'Reports', icon: 'chart', perm: '*' },
    ],
  },
  {
    label: '',
    items: [
      { key: 'approvals', label: 'Approvals', icon: 'check', perm: '*' },
      { key: 'notifications', label: 'Notifications', icon: 'bell', perm: '*' },
      { key: 'chat', label: 'Messages', icon: 'chat', perm: 'chat' },
      { key: 'history', label: 'Activity', icon: 'history', perm: '*' },
    ],
  },
];

/** In the nav, `'*'` means "everyone", not "owner only". */
const OPEN_TO_ALL: Permission = '*';

/** Screens a role can read even without the nav item's main permission. */
const READABLE: Partial<Record<ScreenKey, Permission[]>> = {
  workshop: ['production.own', 'production.view', 'production'],
  fabric: ['request', 'issue'],
  orders: ['order', 'sell', 'production'],
  customers: ['customer', 'order', 'chat'],
  chat: ['chat'],
  shop: ['sell'],
  staff: ['staff'],
};

const ITEMS = NAV.flatMap((g) => g.items);

export function canSeeScreen(s: AppState, key: ScreenKey): boolean {
  if (isOwner(s)) return true;
  const item = ITEMS.find((i) => i.key === key);
  if (!item) return false;
  if (item.perm === OPEN_TO_ALL || can(s, item.perm)) return true;
  return (READABLE[key] ?? []).some((p) => can(s, p));
}

/** The first screen this person is allowed to see. */
export const firstVisibleScreen = (s: AppState): ScreenKey =>
  ITEMS.find((i) => canSeeScreen(s, i.key))?.key ?? 'today';
