import type { ComponentType } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { PATHS, canSeeScreen, firstVisibleScreen, type ScreenKey } from '@/config/navigation';
import { useApp } from '@/store/hooks';
import { SignInPage } from '@/features/auth/SignInPage';

export function RequireAuth() {
  const signedIn = useApp().actor !== null;
  return signedIn ? <Outlet /> : <Navigate to="/sign-in" replace />;
}

export function RedirectIfSignedIn() {
  const signedIn = useApp().actor !== null;
  return signedIn ? <Navigate to="/" replace /> : <SignInPage />;
}

/** Each role sees only the screens its job needs; anything else bounces to their first screen. */
export function ScreenGuard({ screen, page: Page }: { screen: ScreenKey; page: ComponentType }) {
  const s = useApp();
  if (!canSeeScreen(s, screen)) return <Navigate to={PATHS[firstVisibleScreen(s)]} replace />;
  return <Page />;
}
