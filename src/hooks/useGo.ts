import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS, type ScreenKey } from '@/config/navigation';
import type { Target } from '@/store/derived';
import { closeSheet, openSheet } from '@/store/ui/sheetStore';

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

/** Follow a derived item's target: a screen or a sheet. */
export function useOpenTarget() {
  const go = useGo();
  return useCallback(
    (target: Target) => {
      if (!target) return;
      if ('screen' in target) go(target.screen);
      else openSheet(target.sheet);
    },
    [go],
  );
}
