'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

export const getCachedClasses = unstable_cache(
    async () => {
        const supabase = getSupabaseAdmin()
        console.log('Cache MISS: Fetching Classes (Admin)...')

        const { data, error } = await supabase
            .from('classes')
            .select(`
                *,
                teacher:profiles!teacher_id (
                    id,
                    full_name,
                    avatar_url
                ),
                course:courses!course_id (
                    id,
                    title
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch Classes Error:', error)
            throw error
        }

        return data
    },
    ['classes-list-v1'],
    { revalidate: 86400, tags: ['classes'] }
)

export const getCachedStudentClassCounts = unstable_cache(
    async () => {
        const supabase = getSupabaseAdmin()
        console.log('Cache MISS: Fetching Student Class Counts (Admin)...')

        const { data, error } = await supabase
            .from('students')
            .select('class_name')
            .eq('status', 'active')

        if (error) {
            console.error('Fetch Student Counts Error:', error)
            throw error
        }

        const counts = {}
        data.forEach(s => {
            if (s.class_name) {
                counts[s.class_name] = (counts[s.class_name] || 0) + 1
            }
        })

        return counts
    },
    ['student-class-counts-v1'],
    { revalidate: 86400, tags: ['students', 'classes'] }
)

export async function fetchCachedClassesData() {
    const [classes, studentCounts] = await Promise.all([
        getCachedClasses(),
        getCachedStudentClassCounts()
    ])

    return { classes, studentCounts }
}
