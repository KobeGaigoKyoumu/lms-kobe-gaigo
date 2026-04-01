export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './page.module.css'
import StudentList from './StudentList'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

import { getCachedStudentList } from '@/app/actions/studentData'
import { getAllStudentSubmissionStats } from '@/app/actions/homework'



export default async function StudentsPage() {
    const adminMember = await getAdminMemberSession()

    // 管理者・教職員以外はアクセス拒否 (cookie-based only)
    if (!adminMember) {
        redirect('/login')
    }

    const supabase = await createClient()

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
