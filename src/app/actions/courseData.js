'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

const _getCachedCourses = unstable_cache(
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
    { tags: ['courses'] }
)

export async function getCachedCourses() {
    return _getCachedCourses()
}

export async function fetchCachedCourses() {
    // Auth Check: Allow both Supabase Auth users (students for some views) AND Admin Members
    const adminMember = await getAdminMemberSession()
    if (!adminMember) return []

    return await getCachedCourses()
}

export async function createCourse(formData) {
    const adminMember = await getAdminMemberSession()

    if (!adminMember) throw new Error('Unauthorized')

    // Use admin client to ensure we can insert regardless of RLS, 
    // but try to associate with a teacher_id if possible
    const adminSupabase = getSupabaseAdmin()
    const { data, error } = await adminSupabase
        .from('courses')
        .insert({
            title: formData.title,
            description: formData.description,
            syllabus: formData.syllabus,
            is_published: formData.is_published,
            teacher_id: null, // Can be null if created by adminMember without profile
            // We could add admin_member_id here if we update the schema
        })
        .select()
        .single()

    if (error) throw error

    revalidateTag('courses', 'max')
    return data
}

export async function updateCourse(id, updates) {
    const supabase = await createClient()
    const adminMember = await getAdminMemberSession()
    // Validation logic here...
    
    const adminSupabase = getSupabaseAdmin()
    const { error } = await adminSupabase
        .from('courses')
        .update(updates)
        .eq('id', id)

    if (error) throw error
    revalidateTag('courses', 'max')
    return { success: true }
}

export async function deleteCourse(id) {
    const adminSupabase = getSupabaseAdmin()
    const { error } = await adminSupabase
        .from('courses')
        .delete()
        .eq('id', id)

    if (error) throw error
    revalidateTag('courses', 'max')
    return { success: true }
}
