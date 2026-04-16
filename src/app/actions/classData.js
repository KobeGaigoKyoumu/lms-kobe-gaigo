'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache, revalidateTag } from 'next/cache'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

const _getCachedClasses = unstable_cache(
    async () => {
        const supabase = getSupabaseAdmin()
        console.log('Cache MISS: Fetching Classes (Admin)...')

        const { data, error } = await supabase
            .from('classes')
            .select(`
                *,
                homeroom_teacher_name,
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
            .eq('academic_year', 2026)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch Classes Error:', error)
            throw error
        }

        return data
    },
    ['classes-list-v2'],
    { tags: ['classes'] }
)

export async function getCachedClasses() {
    return _getCachedClasses()
}

const _getCachedStudentClassCounts = unstable_cache(
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
    ['student-class-counts-v2'],
    { tags: ['students', 'classes'] }
)

export async function getCachedStudentClassCounts() {
    return _getCachedStudentClassCounts()
}

export async function fetchCachedClassesData() {
    const [classes, studentCounts] = await Promise.all([
        _getCachedClasses(),
        _getCachedStudentClassCounts()
    ])

    return { classes, studentCounts }
}

