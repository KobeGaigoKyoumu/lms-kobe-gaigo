import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import CalendarView from './CalendarView'

export default async function CalendarPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

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
        .gte('due_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .order('due_date', { ascending: true })

    // イベントデータに変換
    const events = (assignments || []).map(a => ({
        id: a.id,
        title: a.title,
        date: a.due_date,
        type: 'assignment',
        course: a.course?.title
    }))

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>カレンダー</h1>
                <p className={styles.subtitle}>課題の締切とスケジュール</p>
            </header>

            <CalendarView events={events} />
        </div>
    )
}
