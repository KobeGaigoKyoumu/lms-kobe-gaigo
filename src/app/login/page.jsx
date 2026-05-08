import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminMemberSession, getAdminMemberNames } from '@/app/actions/adminAuth'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }) {
    // Standard defaults for failure cases
    let nextPath = '/student/dashboard'
    let errorType = null
    let errorMsg = null
    let errorDesc = null
    let memberNames = []

    try {
        // Safe searchParams extraction (Promise in Next.js 15)
        const params = await searchParams
        if (params) {
            nextPath = params.next || '/student/dashboard'
            errorType = params.error || null
            errorMsg = params.msg || null
            errorDesc = params.desc || null
        }

        // 1. Session checks (wrapped individually to prevent cascading failure)
        let studentSession = null
        let adminMemberSession = null

        try {
            const sessions = await Promise.allSettled([
                getStudentSessionLight(),
                getAdminMemberSession()
            ])
            studentSession = sessions[0].status === 'fulfilled' ? sessions[0].value : null
            adminMemberSession = sessions[1].status === 'fulfilled' ? sessions[1].value : null
        } catch (sessionErr) {
            console.error('LoginPage: Session fetch failed', sessionErr)
        }

        // 2. Redirect logic (Next.js redirect is special as it throws an error that must NOT be caught by a generic try-catch)
        if (studentSession) {
            const isStudentTarget = nextPath.startsWith('/student') || nextPath.startsWith('/auth')
            redirect(isStudentTarget ? nextPath : '/student/dashboard')
        }

        if (adminMemberSession) {
            redirect(nextPath.startsWith('/student') ? '/' : (nextPath || '/'))
        }

        // 3. Fetch member names for the dropdown (Throttled or cached)
        try {
            memberNames = await getAdminMemberNames() || []
        } catch (namesErr) {
            console.error('LoginPage: Failed to fetch member names', namesErr)
        }

    } catch (e) {
        // If it's a redirect error, re-throw it so Next.js can handle it
        if (e.digest?.includes('NEXT_REDIRECT')) throw e
        
        console.error('LoginPage: Critical Render Error', e)
        errorType = 'error'
        errorMsg = 'エラーが発生しました'
        errorDesc = 'しばらくしてからもう一度お試しください。'
    }

    return (
        <LoginForm 
            memberNames={memberNames} 
            nextPath={nextPath}
            errorType={errorType}
            errorMsg={errorMsg}
            errorDesc={errorDesc}
        />
    )
}

