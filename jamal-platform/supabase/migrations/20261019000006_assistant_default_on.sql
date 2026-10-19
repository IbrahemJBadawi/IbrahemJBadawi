-- The shopping assistant now follows the deployment: it appears only when a
-- GEMINI_API_KEY is configured. The admin switch stays as a way to turn it off.
alter table public.store_settings alter column ai_assistant_enabled set default true;
update public.store_settings set ai_assistant_enabled = true where id = 1;
