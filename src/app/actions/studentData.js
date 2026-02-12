'use server'

import { createClient } from '@/lib/supabase/client'
import { unstable_cache } from 'next/cache'

const getSupabase = async () => {
    return createClient()
}

// Cached Student List for Main Table
// Includes fields used for Display AND Client-side Search
export const getCachedStudentList = unstable_cache(
    async () => {
        const supabase = await getSupabase()
        console.log('Cache MISS: Fetching Student List...')

        const { data, error } = await supabase
            .from('students')
            .select(`
                id,
                student_id_text,
                full_name,
                name_kana,
                name_romaji,
                academic_year,
                class_name,
                status,
                course,
                email,
                nationality,
                visa_status,
                phone,
                destination
            `)
            .order('class_name', { ascending: true })
            .order('student_id_text', { ascending: true })

        if (error) {
            console.error('Fetch Student List Error:', error)
            throw error
        }

        return data
    },
    ['student-list-v1'],
    { revalidate: 86400, tags: ['students'] }
)

// Fetch Full Student Detail (On Demand)
// Not heavily cached (1 hour or less) or just standard fetch
export const getStudentDetail = async (studentId) => {
    const supabase = await getSupabase()

    // We can use simple fetch here because it's triggered on user action (modal open)
    // But if we want to protect DB, we can cache it too for a short time
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', studentId)
        .single()

    if (error) throw error
    return data
}

// Allow cache revalidation manually if needed
import { revalidateTag } from 'next/cache'
export const revalidateStudents = async () => {
    revalidateTag('students')
}
