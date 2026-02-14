import { getStudentSession } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { createClient } from '@/lib/supabase/server'



export default async function LoginPage({ searchParams }) {
    const params = await searchParams
    const nextPath = params?.next || '/student/dashboard'

    // 1. Check for Student Session (Unified: Passcode or Google Student)
    const studentSession = await getStudentSession()
    if (studentSession) {
        // Only allow redirect to student paths or auth callback
        const isStudentTarget = nextPath.startsWith('/student') || nextPath.startsWith('/auth')
        redirect(isStudentTarget ? nextPath : '/student/dashboard')
    }

    // 2. Check for Supabase Session (Teacher/Admin)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        // Prevent teachers from being redirected to student paths
        const isStudentTarget = nextPath.startsWith('/student')
        const adminNext = isStudentTarget ? '/' : nextPath
        redirect(adminNext)
    }

    return <LoginForm />
}
