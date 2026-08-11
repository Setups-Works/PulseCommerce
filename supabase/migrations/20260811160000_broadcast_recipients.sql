-- Recipients carry what a template needs, not just who they are.
--
-- A broadcast message is a template: "Hi {{name}}, your {{last_product}} is
-- back in stock." The values are resolved once, when the audience is built,
-- because resolving them at send time would mean re-deriving analytics for
-- every recipient in the batch.
--
-- The first cut of this table stored only the customer key, which lost the
-- resolved variables and the chat id — so a broadcast reloaded from the
-- database could not actually be sent.

alter table public.whatsapp_broadcast_recipients
  add column if not exists chat_id text,
  add column if not exists name    text,
  -- Resolved template variables. jsonb because the set differs per message and
  -- nothing queries inside it.
  add column if not exists vars    jsonb not null default '{}'::jsonb;
