import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import GradeUploader from './GradeUploader'
import GradeHistoryBoard from './GradeHistoryBoard'
import Link from 'next/link'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export default async function ReportCardsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    // 現在のユーザーのプロファイル取得
    let isTeacherOrAdmin = !!adminMember
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin'
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div>
                        <h1 className={styles.title}>成績</h1>
                        <p className={styles.subtitle}>
                            成績評価シートをアップロードして学生の成績を管理します
                        </p>
                    </div>

                </div>
            </header>

            {isTeacherOrAdmin ? (
                <>
                    <GradeUploader />
                    <div style={{ marginTop: '40px', borderTop: '1px solid #e5e7eb', paddingTop: '40px' }}>
                        <GradeHistoryBoard />
                    </div>
                </>
            ) : (
                <div className={styles.studentView}>
                    <p>成績の閲覧権限がありません。担当教師にお問い合わせください。</p>
                </div>
            )}
        </div>
    )
}

