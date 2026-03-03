import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import UserList from './UserList'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export default async function UsersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    // 現在のユーザーのプロファイル取得
    let isAdmin = !!adminMember
    if (user) {
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isAdmin = currentProfile?.role === 'admin'
    }

    // 管理者・教職員以外はアクセス拒否
    if (!isAdmin) {
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
