import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { closeSheet } from '@/store/ui/sheetStore';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const RAIL_KEY = 'oj-nav-rail';
const readRail = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === '1';
  } catch {
    return false;
  }
};

/** Placeholder while a screen's chunk loads: the page's shape, shimmering. */
function PageSkeleton() {
  const block = 'animate-pulse rounded-card bg-surface shadow-card';
  return (
    <div aria-busy="true" aria-label="Loading" className="pt-2">
      <div className="mb-6 h-10 w-64 animate-pulse rounded-ctl bg-surface-sunken" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-32`} />
        ))}
      </div>
      <div className={`${block} mt-4 h-80`} />
    </div>
  );
}

/**
 * The signed-in frame. The page scrolls the normal way (the window), while the
 * sidebar and top bar stay put with `position: sticky`.
 */
export function AppShell() {
  const [rail, setRail] = useState(readRail);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  /* A sheet belongs to the screen it was opened on: leaving the screen closes it. */
  useEffect(() => {
    closeSheet();
    /* A new screen starts at the top. */
    window.scrollTo(0, 0);
  }, [pathname]);

  const collapse = (v: boolean) => {
    setRail(v);
    try {
      localStorage.setItem(RAIL_KEY, v ? '1' : '0');
    } catch {
      /* not remembered in private mode */
    }
  };

  return (
    <div className="no-print flex min-h-screen bg-canvas">
      <Sidebar collapsed={rail} onCollapse={collapse} drawerOpen={drawerOpen} onDrawerClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawerOpen(true)} />
        {/* key replays the fade-in when the page changes */}
        <main key={pathname} className="flex-1 animate-in">
          <div className="mx-auto w-full max-w-360 px-4 pt-2 pb-16 md:px-8">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
