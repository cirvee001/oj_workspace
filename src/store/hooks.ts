import { useShallow } from 'zustand/react/shallow';
import type { AppState, Permission, Staff } from '@/types/domain';
import { useAppStore } from './appStore';
import { can, me, myBranch } from './selectors';

/**
 * Subscribe to the whole state. The business data is small and most screens
 * derive from several collections at once, so this keeps views simple.
 */
export const useApp = (): AppState => useAppStore((s) => s);

/** Subscribe to a derived object/array with shallow comparison. */
export const useAppSelector = <T,>(selector: (s: AppState) => T): T => useAppStore(useShallow(selector));

export const useMe = (): Staff => useAppStore(me);
export const useMyBranch = (): string => useAppStore(myBranch);
export const useCan = (perm: Permission): boolean => useAppStore((s) => can(s, perm));
