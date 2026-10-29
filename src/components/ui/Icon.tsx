import {
  Bell,
  Building2,
  Calendar,
  ChartLine,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Download,
  Filter,
  History,
  Image,
  Layers,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageCircle,
  Plus,
  Printer,
  Receipt,
  Scissors,
  Pencil,
  Search,
  SendHorizontal,
  Sparkles,
  Star,
  Tag,
  Truck,
  User,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';

/** The app's icon vocabulary, by name, so data (nav config, work queues) can carry an icon. */
const ICONS = {
  dash: LayoutDashboard,
  receipt: Receipt,
  users: Users,
  tag: Tag,
  chat: MessageCircle,
  scissors: Scissors,
  layers: Layers,
  truck: Truck,
  staff: User,
  clock: Clock,
  wallet: Wallet,
  mega: Megaphone,
  star: Star,
  coins: Coins,
  chart: ChartLine,
  history: History,
  build: Building2,
  menu: Menu,
  search: Search,
  bell: Bell,
  check: Check,
  plus: Plus,
  x: X,
  spark: Sparkles,
  photo: Image,
  cal: Calendar,
  chevR: ChevronRight,
  chevL: ChevronLeft,
  filter: Filter,
  download: Download,
  printer: Printer,
  send: SendHorizontal,
  edit: Pencil,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
  const Cmp = ICONS[name];
  return <Cmp size={size} className={className} aria-hidden="true" />;
}
