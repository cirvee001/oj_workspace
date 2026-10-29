/**
 * Domain model for OJ Clothing.
 *
 * Money is always stored in kobo (1/100 naira) as an integer, so ₦150,000
 * is `15000000`. Dates are ISO `YYYY-MM-DD` strings; timestamps are epoch ms.
 */

export type BranchId = string;
export type StaffId = string;
export type IsoDate = string;

export type Role =
  | 'owner'
  | 'ops'
  | 'manager'
  | 'hr'
  | 'finance'
  | 'prod'
  | 'store'
  | 'tailor'
  | 'sales';

export type Permission =
  | '*'
  | 'approve'
  | 'approve.expense'
  | 'issue'
  | 'order'
  | 'sell'
  | 'production'
  | 'production.view'
  | 'production.own'
  | 'staff'
  | 'money'
  | 'correct'
  | 'market'
  | 'transfer'
  | 'buy'
  | 'chat'
  | 'customer'
  | 'payroll.prepare'
  | 'branch.view_all'
  | 'request'
  | 'return';

export type Channel =
  | 'Instagram'
  | 'WhatsApp'
  | 'Snapchat'
  | 'Website'
  | 'Walk-in'
  | 'Phone'
  | 'Referral';

export type Size = 'S' | 'M' | 'L' | 'XL' | '2XL';

export type Stage =
  | 'measurement'
  | 'fabric'
  | 'cutting'
  | 'sewing'
  | 'finishing'
  | 'qc'
  | 'ready'
  | 'delivery';

export type EnquiryStage =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'awaiting_payment'
  | 'converted'
  | 'lost';

export type PaymentMethod = 'Cash' | 'Transfer' | 'Card' | 'Online';

export interface Branch {
  id: BranchId;
  name: string;
  address: string;
  opens: string;
  lat: number | null;
  lng: number | null;
}

export interface Staff {
  id: StaffId;
  name: string;
  role: Role;
  roleName: string;
  branch: BranchId;
  dept: string;
  pin: string;
  badge: string;
  /** Monthly salary in kobo. */
  salary: number;
  hired: IsoDate;
  /** Set when they leave. Leavers keep their history but drop off rosters. */
  left?: IsoDate;
}

export interface Style {
  id: string;
  name: string;
  price: number;
  /** Percent of extra fabric allowed before approval is needed. */
  tol: number;
  /** Usual days to make. */
  days: number;
  /** Yards of fabric needed per size. */
  specs: Record<Size, number>;
}

export interface Material {
  id: string;
  name: string;
  kind: 'Fabric' | 'Trim';
  unit: string;
  patterned: boolean;
  reorder: number;
  cost: number;
  supplier: string;
  stock: Record<BranchId, number>;
  /** Swatch photo, e.g. '/materials/gold-lace.jpg'. */
  photo?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  channel: Channel;
  birthday: IsoDate;
  branch: BranchId;
  since: IsoDate;
  tags: string[];
  sizes: Record<string, number>;
  notes: string;
}

export interface Order {
  id: string;
  customer: string;
  style: string;
  size: Size;
  material: string;
  branch: BranchId;
  total: number;
  paid: number;
  channel: Channel;
  due: IsoDate;
  created: IsoDate;
  status: 'making' | 'delivered' | 'cancelled';
  /** Why it was cancelled. A cancelled order owes nothing and has no job. */
  cancelReason?: string;
  fromEnquiry?: string;
  salesperson?: StaffId;
}

export interface Job {
  id: string;
  order: string;
  stage: Stage;
  assigned: StaffId | null;
  due: IsoDate;
  reworks: number;
}

export interface Payment {
  order: string;
  amount: number;
  when: IsoDate;
  method: PaymentMethod;
}

export interface Sale {
  what: string;
  amount: number;
  when: IsoDate;
  branch: BranchId;
  by: StaffId;
  at: string;
}

export type WasteCategory = 'Normal offcuts' | 'Machine damage' | 'Cutting mistake' | 'Fabric fault';

export interface IssueResult {
  used: number;
  back: number;
  waste: number;
  /** Yards nobody could account for. */
  gap: number;
  reason: string;
  cat: WasteCategory;
}

/** Fabric given out against one job and one person. */
export interface FabricIssue {
  id: string;
  job: string;
  material: string;
  branch: BranchId;
  expected: number;
  requested: number;
  issued: number | null;
  to: StaffId;
  by: StaffId;
  status: 'needs_approval' | 'approved' | 'issued' | 'declined';
  returned: boolean;
  reason?: string;
  result?: IssueResult;
}

export interface Attendance {
  staff: StaffId;
  date: IsoDate;
  in: string;
  out: string | null;
  late: boolean;
  how: string;
}

export interface Expense {
  id: string;
  what: string;
  cat: string;
  amount: number;
  branch: BranchId;
  when: IsoDate;
}

export interface PendingExpense extends Expense {
  by: StaffId;
}

export type GarmentShape = 'dress' | 'shirt' | 'wrap';

export interface Variant {
  size: string;
  colour: string;
  stock: Record<BranchId, number>;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  shape: GarmentShape;
  patterned: boolean;
  sold: number;
  variants: Variant[];
  /** Catalogue photo, e.g. '/products/agbada-set.jpg'. A photo taken in the shop overrides it. */
  photo?: string;
}

export interface Transfer {
  id: string;
  from: BranchId;
  to: BranchId;
  material: string;
  qty: number;
  status: 'requested' | 'approved' | 'sent' | 'received' | 'declined';
  by: StaffId;
  note: string;
  received?: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  terms: string;
  owed: number;
  rating: number;
}

/** Money paid out to a supplier against what we owe them. */
export interface SupplierPayment {
  id: string;
  supplier: string;
  amount: number;
  method: PaymentMethod;
  when: IsoDate;
  by: StaffId;
  note: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  branch: BranchId;
  material: string;
  ordered: number;
  received: number;
  cost: number;
  status: 'sent' | 'partly' | 'received';
  when: IsoDate;
  expected: IsoDate;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  segment: string;
  status: 'automatic' | 'draft' | 'sent';
  sent: number;
  replies: number;
}

export interface Automation {
  id: string;
  trigger: string;
  msg: string;
  on: boolean;
}

export interface InfluencerPost {
  platform: string;
  when: IsoDate;
  reach: number;
}

export interface Influencer {
  id: string;
  name: string;
  handle: string;
  tier: string;
  followers: string;
  gifted: number;
  giftCost: number;
  fee: number;
  paid: number;
  promised: number;
  posts: InfluencerPost[];
  code: string;
  sales: number;
  salesValue: number;
  status: 'agreed' | 'running';
}

export interface ChatMessage {
  from: 'us' | 'them';
  text: string;
  at: string;
}

export interface Chat {
  id: string;
  customer: string;
  channel: Channel;
  assigned: StaffId | null;
  status: 'open' | 'closed';
  messages: ChatMessage[];
}

export interface Enquiry {
  id: string;
  customer: string;
  name: string;
  phone: string;
  source: Channel;
  style: string;
  value: number;
  stage: EnquiryStage;
  owner: StaffId;
  lastContact: IsoDate;
  /** Empty string once the enquiry is closed. */
  nextFollowUp: IsoDate | '';
  branch: BranchId;
  note: string;
}

export type LeaveKind = 'Annual leave' | 'Sick leave' | 'Emergency leave' | 'Unpaid leave';

export interface Leave {
  id: string;
  staff: StaffId;
  kind: LeaveKind;
  from: IsoDate;
  to: IsoDate;
  days: number;
  reason: string;
  status: 'requested' | 'approved' | 'declined';
  decidedBy: StaffId | null;
}

export interface StockCountLine {
  material: string;
  system: number;
  counted: number;
}

export interface StockCount {
  id: string;
  branch: BranchId;
  when: IsoDate;
  by: StaffId;
  status: 'review' | 'closed';
  lines: StockCountLine[];
  note: string;
  closedBy?: StaffId;
}

export interface PayrollLine {
  staff: StaffId;
  base: number;
  lateMins: number;
  deduct: number;
  bonus: number;
  net: number;
}

export interface Payroll {
  month: string;
  status: 'draft' | 'pending' | 'approved';
  preparedBy: StaffId | null;
  approvedBy: StaffId | null;
  lines: PayrollLine[];
}

export interface Alert {
  title: string;
  body: string;
  hot: boolean;
  at: number;
}

export interface LogEntry {
  who: string;
  role: string;
  what: string;
  detail: string;
  at: number;
}

export interface Counters {
  order: number;
  job: number;
  issue: number;
  transfer: number;
  po: number;
}

/** Everything the business knows. In production this lives in the database. */
export interface BusinessData {
  branches: Branch[];
  staff: Staff[];
  customers: Customer[];
  styles: Style[];
  materials: Material[];
  orders: Order[];
  jobs: Job[];
  payments: Payment[];
  sales: Sale[];
  issues: FabricIssue[];
  attendance: Attendance[];
  expenses: Expense[];
  expensesPending: PendingExpense[];
  products: Product[];
  transfers: Transfer[];
  suppliers: Supplier[];
  pos: PurchaseOrder[];
  supplierPayments: SupplierPayment[];
  campaigns: Campaign[];
  automations: Automation[];
  influencers: Influencer[];
  chats: Chat[];
  enquiries: Enquiry[];
  leave: Leave[];
  leaveAllowance: number;
  stockCounts: StockCount[];
  payroll: Payroll;
  alerts: Alert[];
  log: LogEntry[];
  counter: Counters;
}

export type SalesRange = '7d' | '30d' | '12w' | '12m';
export type ClockMode = 'badge' | 'poster' | 'location' | 'number';

/** Per-device session state: who is signed in and what they are looking at. */
export interface SessionState {
  actor: StaffId | null;
  branch: BranchId;
  range: SalesRange;
  clockMode: ClockMode;
  /** Product photos as data URLs. Held in memory only, never uploaded. */
  photos: Record<string, string>;
}

export type AppState = BusinessData & SessionState;
