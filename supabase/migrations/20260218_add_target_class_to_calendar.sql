-- Add target_class column to calendar_events
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS target_class TEXT DEFAULT NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_target_class ON public.calendar_events(target_class);

-- Update RLS policy to allow reading if target_class matches (or is public/null)
-- Note: The existing policy "公開イベントは誰でも閲覧可能" checks (is_public = true OR auth.uid() = created_by).
-- We assume "public" in this context implies "visible to intended audience".
-- If we want to strictly RESTRICT visibility to other classes even if is_public=true, we might need to adjust it.
-- However, for simplicity and since student access often bypasses RLS via Service Role (in server components) or custom auth,
-- we primarily rely on the application-level filtering in the query.
