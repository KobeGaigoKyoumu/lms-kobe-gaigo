-- Add is_archived to homework_assignments
ALTER TABLE public.homework_assignments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Update existing rows to false
UPDATE public.homework_assignments SET is_archived = false WHERE is_archived IS NULL;

-- Add index to speed up archiving queries
CREATE INDEX IF NOT EXISTS idx_assignments_is_archived ON public.homework_assignments(is_archived);
