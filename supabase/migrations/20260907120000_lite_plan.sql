-- Adds "lite" as a valid plan: analytics only, no WhatsApp. Widens both
-- check constraints that currently only allow ('go', 'plus') -- profiles.plan
-- (the account's current plan) and billing_invoices.plan (the plan an
-- invoice was billed under, which must keep accepting whatever value
-- profiles.plan can hold).
alter table public.profiles
  drop constraint profiles_plan_check,
  add constraint profiles_plan_check check (plan in ('go', 'plus', 'lite'));

alter table public.billing_invoices
  drop constraint billing_invoices_plan_check,
  add constraint billing_invoices_plan_check check (plan in ('go', 'plus', 'lite'));
