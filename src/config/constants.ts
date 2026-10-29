import type { Channel, EnquiryStage, LeaveKind, PaymentMethod, Size, Stage, WasteCategory } from '@/types/domain';

export const BRAND_NAME = 'OJ Clothing';

export const STAGES: readonly { key: Stage; label: string }[] = [
  { key: 'measurement', label: 'Measurement' },
  { key: 'fabric', label: 'Fabric' },
  { key: 'cutting', label: 'Cutting' },
  { key: 'sewing', label: 'Sewing' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'qc', label: 'Quality check' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivery', label: 'Delivered' },
];
export const stageName = (k: Stage): string => STAGES.find((s) => s.key === k)?.label ?? '—';

export const ENQUIRY_STAGES: readonly { key: EnquiryStage; label: string }[] = [
  { key: 'new', label: 'New enquiry' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'interested', label: 'Interested' },
  { key: 'awaiting_payment', label: 'Awaiting payment' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Not interested' },
];
export const enquiryStageName = (k: EnquiryStage): string =>
  ENQUIRY_STAGES.find((s) => s.key === k)?.label ?? '—';
export const isEnquiryClosed = (k: EnquiryStage): boolean => k === 'converted' || k === 'lost';

export const ORDER_CHANNELS: readonly Channel[] = ['Instagram', 'WhatsApp', 'Snapchat', 'Website', 'Walk-in', 'Phone'];
export const ENQUIRY_CHANNELS: readonly Channel[] = [...ORDER_CHANNELS, 'Referral'];

export const CHANNEL_CHIP: Record<Channel, { code: string; colour: string }> = {
  Instagram: { code: 'IG', colour: '#E1306C' },
  WhatsApp: { code: 'WA', colour: '#25D366' },
  Snapchat: { code: 'SC', colour: '#F7C948' },
  Website: { code: 'WB', colour: '#4A8FE7' },
  'Walk-in': { code: 'WK', colour: '#7A8090' },
  Phone: { code: 'PH', colour: '#7C5CFF' },
  Referral: { code: 'RF', colour: '#12A150' },
};

export const SIZES: readonly Size[] = ['S', 'M', 'L', 'XL', '2XL'];
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['Cash', 'Transfer', 'Card', 'Online'];
export const WASTE_CATEGORIES: readonly WasteCategory[] = ['Normal offcuts', 'Machine damage', 'Cutting mistake', 'Fabric fault'];
export const LEAVE_KINDS: readonly LeaveKind[] = ['Annual leave', 'Sick leave', 'Emergency leave', 'Unpaid leave'];
export const EXPENSE_CATEGORIES = ['Rent', 'Power', 'Transport', 'Repairs', 'Packaging', 'Staff welfare', 'Marketing', 'Other'] as const;

/** Garment colours for the ready-to-wear rail. */
export const SWATCH: Record<string, string> = {
  Blue: '#2D5B8A',
  White: '#EEF1EE',
  Gold: '#B08528',
  Black: '#24282B',
  Rust: '#9C4A2A',
  Emerald: '#2E6B4E',
  Cream: '#E7DFCE',
  Wine: '#A3304F',
};

/** Chart series colours (tokens in index.css). */
export const SERIES_COLOURS = { orders: 'var(--color-series-1)', shop: 'var(--color-series-2)' } as const;

/** Rough value of a yard of fabric, used to price stock differences. */
export const YARD_VALUE_KOBO = 250_000;

/** Cost of one outbound marketing message, in naira. */
export const MESSAGE_COST_NAIRA = 4;
