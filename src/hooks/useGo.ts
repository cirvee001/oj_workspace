import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS, type ScreenKey } from '@/config/navigation';
import type { Target } from '@/store/derived';
import { closeSheet, openSheet } from '@/store/ui/sheetStore';

/** URL of a customer's profile page. */
export const customerPath = (id: string): string => PATHS.customers + '/' + id;

/** Navigate to a screen by key, closing any open sheet. */
export function useGo() {
  const navigate = useNavigate();
  return useCallback(
    (screen: ScreenKey) => {
      closeSheet();
      navigate(PATHS[screen]);
    },
    [navigate],
  );
}

/** Open a customer's profile page, closing any open sheet. */
export function useOpenCustomer() {
  const navigate = useNavigate();
  return useCallback(
    (id: string) => {
      closeSheet();
      navigate(customerPath(id));
    },
    [navigate],
  );
}

/** Follow a derived item's target: a screen, a sheet or a page by URL. */
export function useOpenTarget() {
  const go = useGo();
  const navigate = useNavigate();
  return useCallback(
    (target: Target) => {
      if (!target) return;
      if ('screen' in target) go(target.screen);
      else if ('path' in target) {
        closeSheet();
        navigate(target.path);
      } else openSheet(target.sheet);
    },
    [go, navigate],
  );
}
