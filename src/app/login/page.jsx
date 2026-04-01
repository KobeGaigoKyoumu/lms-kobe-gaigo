import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminMemberSession, getAdminMemberNames } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }) {
    const params = await searchParams
    const nextPath = params?.next || '/student/dashboard'

    // 1. Cookie-based checks first (NO DB access, very fast)
    // adminMemberSession includes roles ('admin' or 'teacher')
    const [studentSession, adminMemberSession] = await Promise.all([
        getStudentSessionLight(),
        getAdminMemberSession()
    ])

    if (studentSession) {
        const isStudentTarget = nextPath.startsWith('/student') || nextPath.startsWith('/auth')
        redirect(isStudentTarget ? nextPath : '/student/dashboard')
    }

    if (adminMemberSession) {
        // Redirect to dashboard (or nextPath) if already logged in as admin/teacher
        redirect(nextPath.startsWith('/student') ? '/' : (nextPath || '/'))
    }

    // Fetch member names (admins and teachers) for the login dropdown
    const memberNames = await getAdminMemberNames()

    return <LoginForm memberNames={memberNames} />
}

