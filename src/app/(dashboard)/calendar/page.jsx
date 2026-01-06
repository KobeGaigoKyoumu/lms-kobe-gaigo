import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import CalendarView from './CalendarView'

export default async function CalendarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 現在のユーザーのプロファイル
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'

    // 課題（締切のあるもの）を取得
    const { data: assignments } = await supabase
        .from('assignments')
        .select(`
      id,
      title,
      due_date,
      course:courses (
        title
      )
    `)
        .not('due_date', 'is', null)
        .gte('due_date', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString())
        .order('due_date', { ascending: true })

    // カレンダーイベントを取得
    const { data: calendarEvents } = await supabase
        .from('calendar_events')
        .select(`
      id,
      title,
      description,
      start_date,
      end_date,
      all_day,
      event_type,
      color,
      course:courses (
        title
      ),
      created_by
    `)
        .gte('start_date', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString())
        .order('start_date', { ascending: true })

    // イベントデータに変換
    const assignmentEvents = (assignments || []).map(a => ({
        id: a.id,
        title: a.title,
        date: a.due_date,
        type: 'assignment',
        course: a.course?.title,
        color: '#f59e0b'
    }))

    const customEvents = (calendarEvents || []).map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.start_date,
        endDate: e.end_date,
        allDay: e.all_day,
        type: e.event_type,
        course: e.course?.title,
        color: e.color || getEventColor(e.event_type),
        createdBy: e.created_by,
        isCustomEvent: true
    }))

    const events = [...assignmentEvents, ...customEvents]

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>カレンダー</h1>
                    <p className={styles.subtitle}>課題の締切とスケジュール</p>
                </div>
            </header>

            <CalendarView
                events={events}
                canCreateEvent={isTeacherOrAdmin}
                userId={user?.id}
            />
        </div>
    )
}

function getEventColor(eventType) {
    switch (eventType) {
        case 'class': return '#3b82f6'
        case 'exam': return '#ef4444'
        case 'holiday': return '#22c55e'
        default: return '#8b5cf6'
    }
}
