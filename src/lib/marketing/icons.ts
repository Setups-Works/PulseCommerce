import {
  BarChart3,
  Bot,
  Boxes,
  ChartColumnBig,
  Clock,
  Code2,
  Compass,
  Database,
  Download,
  FileDown,
  Fingerprint,
  Gauge,
  Inbox,
  Keyboard,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Table2,
  Users,
  Warehouse,
  Webhook,
  Wifi,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon names to components.
 *
 * Content rows store an icon *name*, and this resolves it. The allow-list is
 * the point: the alternative is storing markup in the database and rendering
 * it, which turns any write access to the CMS — or any SQL injection reaching
 * it — into stored XSS on the marketing site.
 *
 * An unknown name falls back rather than throwing. A typo in an icon field
 * should be a slightly wrong glyph on one card, not a 500 on the landing page.
 */
const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Bot,
  Boxes,
  ChartColumnBig,
  Clock,
  Code2,
  Compass,
  Database,
  Download,
  FileDown,
  Fingerprint,
  Gauge,
  Inbox,
  Keyboard,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Table2,
  Users,
  Warehouse,
  Webhook,
  Wifi,
  Workflow,
  Zap,
};

export const FALLBACK_ICON = Sparkles;

export function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return FALLBACK_ICON;
  return ICONS[name] ?? FALLBACK_ICON;
}

/** The names an editor may choose from, for the CMS icon field. */
export const ICON_NAMES = Object.keys(ICONS).sort();
