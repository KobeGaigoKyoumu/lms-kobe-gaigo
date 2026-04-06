'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache as next_unstable_cache, revalidateTag } from 'next/cache'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'
    return createAdminClient(supabaseUrl, supabaseServiceKey)
}

async function _getCachedCoursesInternal() {
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
}

let _cachedCoursesListFunc = null;
function getCachedCoursesList() {
    if (!_cachedCoursesListFunc) {
        _cachedCoursesListFunc = next_unstable_cache(
            _getCachedCoursesInternal,
            ['courses-list-v1'],
            { tags: ['courses'] }
        );
    }
    return _cachedCoursesListFunc();
}

export async function getCachedCourses() {
    return getCachedCoursesList()
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

    revalidateTag('courses')
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
    revalidateTag('courses')
    return { success: true }
}

export async function deleteCourse(id) {
    const adminSupabase = getSupabaseAdmin()
    const { error } = await adminSupabase
        .from('courses')
        .delete()
        .eq('id', id)

    if (error) throw error
    revalidateTag('courses')
    return { success: true }
}
