import { createClient } from '@/lib/supabase/server'
import ClientTemplateDetail from './ClientTemplateDetail'

export default async function TemplateDetailPage({ params }) {
    const { id } = params
    const supabase = await createClient()

    // Fetch template details
    const { data: template } = await supabase
        .from('calendar_templates')
        .select('*')
        .eq('id', id)
        .single()

    if (!template) {
        return <div>テンプレートが見つかりません。</div>
    }

    // Fetch template events
    const { data: templateEvents } = await supabase
        .from('calendar_template_events')
        .select('*')
        .eq('template_id', id)
        .order('start_date', { ascending: true })

    // Map to CalendarView format
    const events = (templateEvents || []).map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.start_date,
        endDate: e.end_date,
        allDay: e.all_day,
        type: e.event_type,
        color: e.color || '#3b82f6',
        isTemplateEvent: true, // Marker to distinguish
        templateId: id
    }))

    return (
        <ClientTemplateDetail
            template={template}
            initialEvents={events}
        />
    )
}
