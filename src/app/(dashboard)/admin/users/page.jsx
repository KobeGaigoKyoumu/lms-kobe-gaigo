import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import UserList from './UserList'

export default async function UsersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 現在のユーザーのプロファイル取得
    const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    // 管理者以外はアクセス拒否
    if (currentProfile?.role !== 'admin') {
        redirect('/')
    }

    // 全ユーザー取得
    const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>ユーザー管理</h1>
                    <p className={styles.subtitle}>
                        ユーザーのロールと情報を管理します
                    </p>
                </div>
                <div className={styles.stats}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {users?.filter(u => u.role === 'student').length || 0}
                        </span>
                        <span className={styles.statLabel}>学生</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {users?.filter(u => u.role === 'teacher').length || 0}
                        </span>
                        <span className={styles.statLabel}>教師</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {users?.filter(u => u.role === 'admin').length || 0}
                        </span>
                        <span className={styles.statLabel}>管理者</span>
                    </div>
                </div>
            </header>

            {error && (
                <div className={styles.error}>
                    ユーザーの取得に失敗しました。データベーステーブルが作成されているか確認してください。
                </div>
            )}

            <UserList users={users || []} currentUserId={user?.id} />
        </div>
    )
}
