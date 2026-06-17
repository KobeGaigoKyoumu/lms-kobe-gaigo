import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import { parseStudentId } from '@/lib/utils/studentId'
import SchoolSearchClient from './SchoolSearchClient'

export const dynamic = 'force-dynamic'

export default async function SchoolSearchPage() {
    const session = await getStudentSessionLight()

    if (!session) {
        redirect('/login')
    }

    // 2年生のみアクセスを許可
    const studentInfo = parseStudentId(session.studentId)
    const grade = studentInfo ? studentInfo.grade : null

    if (grade !== 2) {
        redirect('/student/dashboard')
    }

    return <SchoolSearchClient session={session} />
}
