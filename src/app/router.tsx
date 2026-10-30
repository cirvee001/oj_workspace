import { lazy, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RootLayout } from './RootLayout';
import { RouteError } from './RouteError';
import { RedirectIfSignedIn, RequireAuth, ScreenGuard } from './guards';
import { PATHS, type ScreenKey } from '@/config/navigation';
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const EnquiriesPage = lazy(() => import('@/features/enquiries/EnquiriesPage').then((m) => ({ default: m.EnquiriesPage })));
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const ProductionPage = lazy(() => import('@/features/production/ProductionPage').then((m) => ({ default: m.ProductionPage })));
const FabricPage = lazy(() => import('@/features/fabric/FabricPage').then((m) => ({ default: m.FabricPage })));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const StockCountsPage = lazy(() => import('@/features/stock-counts/StockCountsPage').then((m) => ({ default: m.StockCountsPage })));
const BranchesPage = lazy(() => import('@/features/branches/BranchesPage').then((m) => ({ default: m.BranchesPage })));
const StaffPage = lazy(() => import('@/features/staff/StaffPage').then((m) => ({ default: m.StaffPage })));
const ClockInPage = lazy(() => import('@/features/clock-in/ClockInPage').then((m) => ({ default: m.ClockInPage })));
const LeavePage = lazy(() => import('@/features/leave/LeavePage').then((m) => ({ default: m.LeavePage })));
const PayrollPage = lazy(() => import('@/features/payroll/PayrollPage').then((m) => ({ default: m.PayrollPage })));
const MarketingPage = lazy(() => import('@/features/marketing/MarketingPage').then((m) => ({ default: m.MarketingPage })));
const InfluencersPage = lazy(() => import('@/features/influencers/InfluencersPage').then((m) => ({ default: m.InfluencersPage })));
const MoneyPage = lazy(() => import('@/features/money/MoneyPage').then((m) => ({ default: m.MoneyPage })));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ApprovalsPage = lazy(() => import('@/features/approvals/ApprovalsPage').then((m) => ({ default: m.ApprovalsPage })));
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const MessagesPage = lazy(() => import('@/features/messages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const CustomerProfilePage = lazy(() =>
  import('@/features/customers/CustomerProfilePage').then((m) => ({ default: m.CustomerProfilePage })),
);
const ActivityPage = lazy(() => import('@/features/activity/ActivityPage').then((m) => ({ default: m.ActivityPage })));

/* Each screen is its own chunk, loaded the first time it is visited. */
const SCREENS: Record<ScreenKey, ComponentType> = {
  today: DashboardPage,
  customers: CustomersPage,
  enquiries: EnquiriesPage,
  orders: OrdersPage,
  workshop: ProductionPage,
  fabric: FabricPage,
  shop: ProductsPage,
  buying: SuppliersPage,
  stockcount: StockCountsPage,
  branches: BranchesPage,
  staff: StaffPage,
  kiosk: ClockInPage,
  leave: LeavePage,
  payroll: PayrollPage,
  marketing: MarketingPage,
  influencers: InfluencersPage,
  money: MoneyPage,
  reports: ReportsPage,
  approvals: ApprovalsPage,
  notifications: NotificationsPage,
  chat: MessagesPage,
  history: ActivityPage,
};

const screen = (key: ScreenKey) => <ScreenGuard screen={key} page={SCREENS[key]} />;

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { path: '/sign-in', element: <RedirectIfSignedIn /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              ...(Object.keys(PATHS) as ScreenKey[]).map((key) =>
                key === 'today'
                  ? { index: true, element: screen(key) }
                  : { path: PATHS[key].slice(1), element: screen(key) },
              ),
              /* A customer's profile is a page of its own, readable by whoever can see the customers list. */
              { path: PATHS.customers.slice(1) + '/:id', element: <ScreenGuard screen="customers" page={CustomerProfilePage} /> },
              { path: '*', element: <Navigate to="/" replace /> },
            ],
          },
        ],
      },
    ],
  },
], {
  /* Opt in to React Router v7 behaviour now, so the upgrade is a no-op. */
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
