-- Order confirmations were sending on WooCommerce's order.created event
-- alone, which fires the moment checkout is submitted -- for any gateway
-- that redirects off-site to confirm payment (UPI, cards, most non-COD
-- methods), the order exists with status 'pending' well before the customer
-- has actually paid. The fix (src/app/api/webhooks/woo/[storeId]/order-created/route.ts)
-- now also registers order.updated and gates the actual send on the order's
-- status reaching 'processing' or 'completed' -- so it needs a second
-- webhook id to track and clean up on disable, alongside the existing one.
--
-- COD and other immediately-paid orders are created directly as 'processing'
-- and are unaffected: the order.created event alone already passes the
-- status gate, so the send stays just as fast as before for those.

alter table public.stores
  add column if not exists order_confirmation_update_webhook_id bigint;
