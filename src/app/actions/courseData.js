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

export const getCachedCourses = unstable_cache(
    async () => {
        const supabase = getSupabaseAdmin()
        console.log('Cache MISS: Fetching Courses (Admin)...')

        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                teacher:profiles!teacher_id (
                    id,
                    full_name,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch Courses Error:', error)
            throw error
        }

        return data
    },
    ['courses-list-v1'],
    { revalidate: 86400, tags: ['courses'] }
)

export async function fetchCachedCourses() {
    // Auth Check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    return await getCachedCourses()
}
