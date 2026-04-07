import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import CalendarView from './CalendarView'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { getAdminCalendarDataCached } from '@/app/actions/calendar'

export const dynamic = 'force-dynamic'
export default async function CalendarPage() {
    const adminMember = await getAdminMemberSession()
    
    let isTeacherOrAdmin = false
    let userId = null

    if (adminMember) {
        isTeacherOrAdmin = true
        userId = 'admin'
    } else {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'
            userId = user.id
        }
    }

    // キャッシュ付きのアクションを使用して一括取得 (Service Roleを使用)
    const { events: calendarEvents, assignments } = await getAdminCalendarDataCached()

    // 課題データに変換
    const assignmentEvents = (assignments || []).map(a => ({
        id: a.id,
        title: a.title,
        date: a.due_date,
        type: 'assignment',
        course: a.course?.title,
        color: '#f59e0b'
    }))

    // 同じパッケージから複数クラスに適用されたイベントの重複排除
    // title + start_date + event_type が同じものは1つにまとめる
    const deduplicatedCalendarEvents = []
    const seen = new Set()
    for (const e of (calendarEvents || [])) {
        const key = `${e.title}|${e.start_date}|${e.event_type}`
        if (seen.has(key)) continue
        seen.add(key)
        deduplicatedCalendarEvents.push(e)
    }

    const customEvents = deduplicatedCalendarEvents.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.start_date,
        end_date: e.end_date,
        all_day: e.all_day,
        type: e.event_type,
        course: e.course?.title,
        course_id: e.course_id,
        target_class: e.target_class,
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
                userId={userId}
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
