import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import GradeUploader from './GradeUploader'

export default async function ReportCardsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 現在のユーザーのプロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>成績</h1>
                <p className={styles.subtitle}>
                    成績評価シートをアップロードして学生の成績を管理します
                </p>
            </header>

            {isTeacherOrAdmin ? (
                <GradeUploader />
            ) : (
                <div className={styles.studentView}>
                    <p>成績の閲覧権限がありません。担当教師にお問い合わせください。</p>
                </div>
            )}
        </div>
    )
}
