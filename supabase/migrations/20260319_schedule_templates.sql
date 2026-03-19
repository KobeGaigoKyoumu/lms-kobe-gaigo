-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS public.schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on schedule_templates
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

-- Policies for schedule_templates
CREATE POLICY "教師と管理者はすべてのテンプレートを閲覧可能" ON public.schedule_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

CREATE POLICY "教師と管理者はテンプレートを追加可能" ON public.schedule_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

CREATE POLICY "教師と管理者はテンプレートを更新可能" ON public.schedule_templates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

CREATE POLICY "教師と管理者はテンプレートを削除可能" ON public.schedule_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

-- Create schedule_template_items table
CREATE TABLE IF NOT EXISTS public.schedule_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.schedule_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
    period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 4),
    subject TEXT NOT NULL
);

-- Enable RLS on schedule_template_items
ALTER TABLE public.schedule_template_items ENABLE ROW LEVEL SECURITY;

-- Policies for schedule_template_items
CREATE POLICY "教師と管理者はすべてのテンプレートアイテムを閲覧可能" ON public.schedule_template_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

CREATE POLICY "教師と管理者はテンプレートアイテムを追加可能" ON public.schedule_template_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

CREATE POLICY "教師と管理者はテンプレートアイテムを更新可能" ON public.schedule_template_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

CREATE POLICY "教師と管理者はテンプレートアイテムを削除可能" ON public.schedule_template_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin')
        )
    );

-- Alter schedules table to add subject and period
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS period INTEGER;
