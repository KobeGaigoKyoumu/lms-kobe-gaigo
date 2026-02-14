export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import StudentList from './StudentList'

import { getCachedStudentList } from '@/app/actions/studentData'
import { getAllStudentSubmissionStats } from '@/app/actions/homework'



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
