
-- Enable the pg_net extension to make HTTP requests
create extension if not exists pg_net;

-- Function to trigger the Edge Function
create or replace function public.trigger_chat_push()
returns trigger as $$
declare
  service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
  url text := 'https://mwtlfyhkzkfagvmdwgii.supabase.co/functions/v1/chat-push';
begin
  -- Call the Edge Function using pg_net
  perform net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', new
    )
  );
  return new;
end;
$$ language plpgsql;

-- Trigger definition
drop trigger if exists on_chat_message_created on public.messages;
create trigger on_chat_message_created
  after insert on public.messages
  for each row
  execute function public.trigger_chat_push();
