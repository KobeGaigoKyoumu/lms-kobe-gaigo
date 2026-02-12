'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

export const getCachedCourses = unstable_cache(
    async () => {
        const supabase = await createClient()
        console.log('Cache MISS: Fetching Courses...')

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
    return await getCachedCourses()
}
