import {
  ChartColumnBig,
  ChartLine,
  Compass,
  FileDown,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Package,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  Warehouse,
  Workflow,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Headline KPIs, revenue trend and generated insights",
      },
      {
        href: "/forecast",
        label: "Forecast",
        icon: ChartLine,
        description: "Projected revenue with a confidence band",
      },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        href: "/customers",
        label: "Customers",
        icon: Users,
        description: "RFM segmentation, value tiers, CLV and churn risk",
      },
      {
        href: "/acquisition",
        label: "Acquisition",
        icon: Compass,
        description: "New vs returning, channels, devices and time to second order",
      },
      {
        href: "/cohorts",
        label: "Cohorts & retention",
        icon: ChartColumnBig,
        description: "Monthly acquisition cohorts and the LTV curve",
      },
    ],
  },
  {
    label: "Catalogue & orders",
    items: [
      {
        href: "/products",
        label: "Products",
        icon: Package,
        description: "ABC analysis, stock cover and basket affinity",
      },
      {
        href: "/inventory",
        label: "Inventory",
        icon: Warehouse,
        description: "Stock cover, reorder points and a restock plan",
      },
      {
        href: "/orders",
        label: "Orders",
        icon: ReceiptText,
        description: "Order register, payments, coupons and trading patterns",
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        href: "/assistant",
        label: "Assistant",
        icon: Sparkles,
        description: "Ask about the store, and have messages drafted for approval",
      },
      {
        href: "/campaigns",
        label: "Campaigns",
        icon: Megaphone,
        description: "Build audiences and measure campaign and coupon performance",
      },
      {
        href: "/flows",
        label: "Flows",
        icon: Workflow,
        description: "Multi-step campaigns that send themselves over days",
      },
      {
        href: "/abandoned-checkouts",
        label: "Abandoned checkouts",
        icon: ShoppingCart,
        description: "WhatsApp reminders for checkouts left pending",
      },
      {
        href: "/order-confirmations",
        label: "Order confirmations",
        icon: PackageCheck,
        description: "A WhatsApp thank-you, with a product photo, the moment an order comes in",
      },
      {
        href: "/menu",
        label: "Auto-reply",
        icon: MessageSquare,
        description: "The menu a customer gets when they message you first",
      },
      {
        href: "/inbox",
        label: "Inbox",
        icon: MessageCircle,
        description: "WhatsApp conversations, with the customer behind each number",
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        href: "/reports",
        label: "Reports",
        icon: FileDown,
        description: "Build and download Excel, PDF and CSV reports",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        description: "WooCommerce connection and data window",
      },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
