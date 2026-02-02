import { getStudentSession } from '@/app/actions/studentAuth'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage({ searchParams }) {
    const params = await searchParams
    const nextPath = params?.next || '/student/dashboard'

    // 1. Check for Student Session
    const studentSession = await getStudentSession()
    if (studentSession) {
        redirect(nextPath)
    }

    // 2. Check for Supabase Session (Teacher/Admin)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const adminNext = params?.next || '/'
        redirect(adminNext)
    }

    return <LoginForm />
}
