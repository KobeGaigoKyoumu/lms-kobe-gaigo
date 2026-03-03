export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import StudentList from './StudentList'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

import { getCachedStudentList } from '@/app/actions/studentData'
import { getAllStudentSubmissionStats } from '@/app/actions/homework'



export default async function StudentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    // 現在のユーザーのプロファイル取得
    let isAllowed = !!adminMember
    if (user) {
        const { data: currentProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isAllowed = ['admin', 'teacher'].includes(currentProfile?.role)
    }

    // 管理者・教師・教職員以外はアクセス拒否
    if (!isAllowed) {
        redirect('/')
    }

    // Server-side Cached Fetch
    const [students, stats] = await Promise.all([
        getCachedStudentList(),
        getAllStudentSubmissionStats()
    ])

    return (
        <div className={styles.page}>
            <StudentList initialStudents={students || []} initialStats={stats || []} />
        </div>
    )
}
