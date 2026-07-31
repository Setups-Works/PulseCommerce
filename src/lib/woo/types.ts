/**
 * Normalised shapes for the WooCommerce REST API (v3) resources we consume.
 * These are intentionally narrower than the full Woo payloads — only the
 * fields the analytics engine reads are modelled.
 */

export interface WooAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  email?: string;
  phone?: string;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  subtotal: string;
  total: string;
  total_tax: string;
  sku?: string;
  price: number;
}

export interface WooCouponLine {
  id: number;
  code: string;
  discount: string;
}

export type WooOrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "trash"
  | "checkout-draft";

/**
 * WooCommerce Order Attribution (core since Woo 8.5). Stored as `_wc_order_
 * attribution_*` meta; normalised here so the analytics layer never touches
 * raw meta keys.
 */
export interface OrderAttribution {
  /** utm | organic | referral | typein | admin | mobile_app | web_admin */
  sourceType: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  referrer: string;
  deviceType: string;
  sessionPages: number | null;
  sessionCount: number | null;
}

export interface WooOrder {
  id: number;
  number: string;
  status: WooOrderStatus;
  currency: string;
  date_created: string;
  date_created_gmt: string;
  date_paid: string | null;
  date_completed: string | null;
  discount_total: string;
  shipping_total: string;
  total_tax: string;
  total: string;
  customer_id: number;
  billing: WooAddress;
  shipping: WooAddress;
  payment_method: string;
  payment_method_title: string;
  line_items: WooLineItem[];
  coupon_lines: WooCouponLine[];
  refunds?: { id: number; reason: string; total: string }[];
  meta_data?: { key: string; value: unknown }[];
  /** Populated at ingest from meta_data; absent on stores without attribution. */
  attribution?: OrderAttribution;
}

export interface WooCustomer {
  id: number;
  date_created: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  billing: WooAddress;
  shipping: WooAddress;
  is_paying_customer: boolean;
  avatar_url: string;
  role?: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  type: string;
  status: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  total_sales: number;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
  categories: { id: number; name: string; slug: string }[];
  tags: { id: number; name: string; slug: string }[];
  images: { id: number; src: string; alt: string }[];
  average_rating: string;
  rating_count: number;
}

/**
 * Everything the analytics engine needs, in one payload. Built either from a
 * live WooCommerce store or from the demo generator.
 */
export interface StoreSnapshot {
  storeUrl: string;
  storeName: string;
  currency: string;
  fetchedAt: string;
  orders: WooOrder[];
  customers: WooCustomer[];
  products: WooProduct[];
  /** Non-fatal problems hit while loading (e.g. a resource the key can't read). */
  warnings: string[];
}
