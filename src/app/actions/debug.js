'use server'

import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@/lib/supabase/client'
import { cookies } from 'next/headers'

export async function getSessionDebug() {
    try {
        const session = await getStudentSession()
        const cookieStore = await cookies()
        const allCookies = cookieStore.getAll().map(c => ({ name: c.name, value: c.value }))

        // Also fetch raw student data if ID exists
        let studentData = null
        if (session?.studentId) {
            const supabase = createClient()
            const { data } = await supabase
                .from('students')
                .select('*')
                .eq('student_id_text', session.studentId)
                .single()
            studentData = data
        }

        return {
            session,
            cookies: allCookies,
            studentData
        }
    } catch (e) {
        return { error: e.message }
    }
}
