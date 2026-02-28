-- Create system_stats table to cache heavy computations (like storage usage)
CREATE TABLE IF NOT EXISTS public.system_stats (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated admins/teachers (or public if necessary, but restricting to auth is safer)
CREATE POLICY "Enable read access for all authenticated users" ON public.system_stats FOR SELECT TO authenticated USING (true);

-- Allow write access only for service role (used by GitHub Actions / CRON jobs)
-- This is handled automatically since service_role bypasses RLS, but we explicitly don't add public/auth insert policies.
