import { Outlet } from 'react-router-dom';
import { DialogHost, Toaster } from '@/components/ui';
import { SheetHost } from './SheetHost';
import { PrintHost } from './PrintHost';

/** Top-level route: the page plus the app-wide overlays, all inside the router so they can navigate. */
export function RootLayout() {
  return (
    <>
      <Outlet />
      <SheetHost />
      <DialogHost />
      <Toaster />
      <PrintHost />
    </>
  );
}
