-- Calendar Templates Master
CREATE TABLE IF NOT EXISTS public.calendar_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events belonging to a Template
CREATE TABLE IF NOT EXISTS public.calendar_template_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.calendar_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  event_type TEXT CHECK (event_type IN ('class', 'exam', 'holiday', 'other')) DEFAULT 'other',
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link Classes to Templates
CREATE TABLE IF NOT EXISTS public.class_template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL,
  template_id UUID REFERENCES public.calendar_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_name, template_id) -- Prevent duplicate assignment of same template to same class
);

-- RLS Policies
ALTER TABLE public.calendar_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_template_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_template_assignments ENABLE ROW LEVEL SECURITY;

-- Admins/Teachers have full access
CREATE POLICY "Admins manage templates" ON public.calendar_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Admins manage template events" ON public.calendar_template_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);
CREATE POLICY "Admins manage assignments" ON public.class_template_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

-- Students differ: they read mainly via server actions/api with service role or logic, 
-- but if direct RLS is needed:
CREATE POLICY "Public read templates" ON public.calendar_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read template events" ON public.calendar_template_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read assignments" ON public.class_template_assignments FOR SELECT TO authenticated USING (true);
