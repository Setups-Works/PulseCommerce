import {
  ChartColumnBig,
  ChartLine,
  Compass,
  FileDown,
  LayoutDashboard,
  Megaphone,
  Package,
  Warehouse,
  ReceiptText,
  Settings,
  Users,
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
        href: "/campaigns",
        label: "Campaigns",
        icon: Megaphone,
        description: "Build audiences and measure campaign and coupon performance",
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
