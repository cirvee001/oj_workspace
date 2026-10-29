import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AppState } from '@/types/domain';
import { createSeedData } from '@/data/seed';

export const useAppStore = create<AppState>()(
  immer(() => ({
    ...createSeedData(),
    actor: null,
    branch: 'IK',
    range: '30d',
    clockMode: 'badge',
    photos: {},
  })),
);

export const getState = (): AppState => useAppStore.getState();

/** Apply an Immer recipe to the store. */
export function update(recipe: (draft: AppState) => void): void {
  useAppStore.setState(recipe);
}
