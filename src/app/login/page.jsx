import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminMemberSession, getAdminMemberNames } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import LoginForm from './LoginForm'

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

    // Fetch member names (admins and teachers) for the login dropdown
    const memberNames = await getAdminMemberNames()

    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>読み込み中...</div>}>
            <LoginForm memberNames={memberNames} />
        </Suspense>
    )
}

