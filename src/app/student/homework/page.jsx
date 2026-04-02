import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import HomeworkClientWrapper from './HomeworkClientWrapper'

export default async function StudentHomeworkPage() {
    const session = await getStudentSessionLight()

    if (!session) {
        redirect('/login')
    }

    // Pass session data to client side for direct Supabase fetching (Saving Vercel CPU)
    return <HomeworkClientWrapper studentId={session.studentId} className={session.className} />
}
