import type { AppState, BranchId } from '@/types/domain';
import { me } from '../selectors';

/**
 * Append to the activity log. The log is append-only by design: nothing in the
 * app edits or deletes an entry, whoever you are.
 */
export function addLog(d: AppState, what: string, detail = ''): void {
  const actor = me(d);
  d.log.unshift({ who: actor.name, role: actor.roleName, what, detail, at: Date.now() });
}

/** Raise an alert that shows on the dashboard and in Notifications. */
export function addAlert(d: AppState, title: string, body: string, hot = false): void {
  d.alerts.unshift({ title, body, hot, at: Date.now() });
}

export function setStock(d: AppState, materialId: string, branch: BranchId, value: number): void {
  const m = d.materials.find((x) => x.id === materialId);
  if (m) m.stock[branch] = Math.round(value * 1000) / 1000;
}

export function addStock(d: AppState, materialId: string, branch: BranchId, delta: number): void {
  const m = d.materials.find((x) => x.id === materialId);
  if (m) setStock(d, materialId, branch, (m.stock[branch] ?? 0) + delta);
}
