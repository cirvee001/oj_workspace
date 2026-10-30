import { useSheetStore, type SheetRef } from '@/store/ui/sheetStore';
import { useAppStore } from '@/store/appStore';
import { ForgotPasswordSheet } from '@/features/auth/ForgotPasswordSheet';
import { OrderSheet } from '@/features/orders/OrderSheet';
import { NewOrderSheet } from '@/features/orders/NewOrderSheet';
import { EnquirySheet } from '@/features/enquiries/EnquirySheet';
import { NewEnquirySheet } from '@/features/enquiries/NewEnquirySheet';
import { ChatSheet } from '@/features/messages/ChatSheet';
import { InfluencerSheet } from '@/features/influencers/InfluencerSheet';
import { JobSheet } from '@/features/production/JobSheet';
import { AskFabricSheet } from '@/features/fabric/AskFabricSheet';
import { ReturnFabricSheet } from '@/features/fabric/ReturnFabricSheet';
import { StartCountSheet } from '@/features/stock-counts/StartCountSheet';
import { NewTransferSheet } from '@/features/branches/NewTransferSheet';
import { StaffSheet } from '@/features/staff/StaffSheet';
import { AskLeaveSheet } from '@/features/leave/AskLeaveSheet';
import { AddExpenseSheet } from '@/features/money/AddExpenseSheet';
import { CustomerFormSheet } from '@/features/customers/CustomerFormSheet';
import { NewPurchaseOrderSheet } from '@/features/suppliers/NewPurchaseOrderSheet';
import { SupplierFormSheet } from '@/features/suppliers/SupplierFormSheet';
import { PaySupplierSheet } from '@/features/suppliers/PaySupplierSheet';
import { MaterialFormSheet } from '@/features/fabric/MaterialFormSheet';
import { ProductFormSheet } from '@/features/products/ProductFormSheet';
import { RestockSheet } from '@/features/products/RestockSheet';
import { StaffFormSheet } from '@/features/staff/StaffFormSheet';
import { InfluencerFormSheet } from '@/features/influencers/InfluencerFormSheet';

function renderSheet(ref: SheetRef) {
  /* Exhaustive: adding a SheetRef without a case here is a type error. */
  switch (ref.type) {
    case 'order': return <OrderSheet id={ref.id} />;
    case 'newOrder': return <NewOrderSheet customerId={ref.customerId} enquiryId={ref.enquiryId} />;
    case 'enquiry': return <EnquirySheet id={ref.id} />;
    case 'newEnquiry': return <NewEnquirySheet />;
    case 'chat': return <ChatSheet id={ref.id} />;
    case 'influencer': return <InfluencerSheet id={ref.id} />;
    case 'job': return <JobSheet id={ref.id} />;
    case 'askFabric': return <AskFabricSheet jobId={ref.jobId} />;
    case 'returnFabric': return <ReturnFabricSheet issueId={ref.issueId} />;
    case 'startCount': return <StartCountSheet />;
    case 'newTransfer': return <NewTransferSheet />;
    case 'staff': return <StaffSheet id={ref.id} />;
    case 'askLeave': return <AskLeaveSheet />;
    case 'addExpense': return <AddExpenseSheet />;
    case 'customerForm': return <CustomerFormSheet id={ref.id} then={ref.then} />;
    case 'newPurchaseOrder': return <NewPurchaseOrderSheet materialId={ref.materialId} />;
    case 'supplierForm': return <SupplierFormSheet id={ref.id} />;
    case 'paySupplier': return <PaySupplierSheet id={ref.id} />;
    case 'materialForm': return <MaterialFormSheet id={ref.id} />;
    case 'productForm': return <ProductFormSheet id={ref.id} />;
    case 'restock': return <RestockSheet productId={ref.productId} />;
    case 'staffForm': return <StaffFormSheet id={ref.id} />;
    case 'influencerForm': return <InfluencerFormSheet id={ref.id} />;
    case 'forgotPassword': return <ForgotPasswordSheet />;
    default: {
      const missing: never = ref;
      return missing;
    }
  }
}

/** Renders whichever sheet is open. Signed-in sheets only show while someone is signed in. */
export function SheetHost() {
  const current = useSheetStore((s) => s.current);
  const signedIn = useAppStore((s) => s.actor !== null);
  if (!current) return null;
  if (!signedIn && current.type !== 'forgotPassword') return null;
  /* key remounts the sheet (fresh form state) when switching between sheets */
  return <div key={JSON.stringify(current)}>{renderSheet(current)}</div>;
}
