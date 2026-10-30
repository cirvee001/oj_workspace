import { create } from 'zustand';

/**
 * Every modal sheet in the app, by name. Keeping these as plain data (not
 * React elements) means anything — actions, notifications, search — can open
 * a sheet without importing UI code. <SheetHost /> maps each to a component.
 */
export type SheetRef =
  | { type: 'order'; id: string }
  /** Prefill from a customer, or from an enquiry being turned into an order. */
  | { type: 'newOrder'; customerId?: string; enquiryId?: string }
  /** Add a customer (no id) or edit one. `then: 'newOrder'` returns to a new order for them. */
  | { type: 'customerForm'; id?: string; then?: 'newOrder' }
  | { type: 'newPurchaseOrder'; materialId?: string }
  | { type: 'paySupplier'; id: string }
  | { type: 'supplierForm'; id?: string }
  | { type: 'materialForm'; id?: string }
  | { type: 'productForm'; id?: string }
  | { type: 'restock'; productId: string }
  | { type: 'staffForm'; id?: string }
  | { type: 'influencerForm'; id?: string }
  | { type: 'job'; id: string }
  | { type: 'askFabric'; jobId?: string }
  | { type: 'returnFabric'; issueId: string }
  | { type: 'staff'; id: string }
  | { type: 'chat'; id: string }
  | { type: 'enquiry'; id: string }
  | { type: 'newEnquiry' }
  | { type: 'influencer'; id: string }
  | { type: 'newTransfer' }
  | { type: 'addExpense' }
  | { type: 'askLeave' }
  | { type: 'startCount' }
  | { type: 'forgotPassword' };

interface SheetState {
  current: SheetRef | null;
}

export const useSheetStore = create<SheetState>(() => ({ current: null }));

export const openSheet = (ref: SheetRef): void => useSheetStore.setState({ current: ref });
export const closeSheet = (): void => useSheetStore.setState({ current: null });
