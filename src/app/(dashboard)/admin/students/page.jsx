import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import StudentList from './StudentList'

export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 現在のユーザーのプロファイル取得
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    // 管理者・教師以外はアクセス拒否
    if (!['admin', 'teacher'].includes(currentProfile?.role)) {
        redirect('/')
    }

    // 全学生マスター取得
    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .order('class_name', { ascending: true })
        .order('student_id_text', { ascending: true })

    // クラス一覧を抽出
    const classes = [...new Set((students || []).map(s => s.class_name).filter(Boolean))].sort()

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>学生マスター管理</h1>
                    <p className={styles.subtitle}>
                        学生情報の一括登録・管理を行います
                    </p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {students?.filter(s => s.status === 'active').length || 0}
                        </span>
                        <span className={styles.statLabel}>在籍中</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {classes.length}
                        </span>
                        <span className={styles.statLabel}>クラス数</span>
                    </div>
                </div>
            </header>

            {error && (
                <div className={styles.error}>
                    学生マスターの取得に失敗しました。テーブルが作成されているか確認してください。
                </div>
            )}

            <StudentList students={students || []} classes={classes} />
        </div>
    )
}
