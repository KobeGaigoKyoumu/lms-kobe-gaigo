import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminMemberSession, getAdminMemberNames } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { createClient } from '@/lib/supabase/server'



export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }) {
    const params = await searchParams
    const nextPath = params?.next || '/student/dashboard'

    // 1. Cookie-based checks first (NO DB access, very fast)
    const [studentSession, adminMemberSession] = await Promise.all([
        getStudentSessionLight(),
        getAdminMemberSession()
    ])

    if (studentSession) {
        const isStudentTarget = nextPath.startsWith('/student') || nextPath.startsWith('/auth')
        redirect(isStudentTarget ? nextPath : '/student/dashboard')
    }

    if (adminMemberSession) {
        redirect(nextPath.startsWith('/student') ? '/' : (nextPath || '/'))
    }

    // 2. Only check Supabase Auth if no cookie session found (slower - API call)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const isStudentTarget = nextPath.startsWith('/student')
        const adminNext = isStudentTarget ? '/' : nextPath
        redirect(adminNext)
    }

    // Fetch member names for the login dropdown
    const memberNames = await getAdminMemberNames()

    return <LoginForm memberNames={memberNames} />
}
