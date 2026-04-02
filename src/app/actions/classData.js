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
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Fetch Classes Error:', error)
            throw error
        }

        return data
    },
    ['classes-list-v2'],
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
    ['student-class-counts-v2'],
    { revalidate: 86400, tags: ['students', 'classes'] }
)

export async function fetchCachedClassesData() {
    const [classes, studentCounts] = await Promise.all([
        getCachedClasses(),
        getCachedStudentClassCounts()
    ])

    return { classes, studentCounts }
}

/**
 * Cleanup duplicate classes that have no teacher and no schedules.
 * This is a one-time cleanup utility.
 */
export async function cleanupDuplicateClasses() {
    const supabase = getSupabaseAdmin()
    
    // 1. Get all classes
    const { data: allClasses, error: clsError } = await supabase
        .from('classes')
        .select('id, name, teacher_id, homeroom_teacher_name')
    
    if (clsError) return { error: clsError.message }

    // 2. Count occurrences of each name
    const nameCounts = {}
    allClasses.forEach(c => {
        nameCounts[c.name] = (nameCounts[c.name] || 0) + 1
    })

    // 3. Find potentially duplicate names
    const duplicateNames = Object.keys(nameCounts).filter(name => nameCounts[name] > 1)

    if (duplicateNames.length === 0) {
        return { success: true, count: 0, message: 'No duplicate names found.' }
    }

    // 4. Get all schedules to check for empty classes
    const { data: allSchedules, error: schError } = await supabase
        .from('schedules')
        .select('class_id')
    
    if (schError) return { error: schError.message }

    const scheduleMap = {}
    allSchedules.forEach(s => {
        scheduleMap[s.class_id] = (scheduleMap[s.class_id] || 0) + 1
    })

    // 5. Identify IDs to delete
    const idsToDelete = allClasses.filter(c => {
        const isDuplicate = nameCounts[c.name] > 1
        const hasNoTeacher = !c.teacher_id && !c.homeroom_teacher_name
        const hasNoSchedules = !scheduleMap[c.id]
        
        return isDuplicate && hasNoTeacher && hasNoSchedules
    }).map(c => c.id)

    if (idsToDelete.length === 0) {
        return { success: true, count: 0, message: 'No "empty" duplicates found matching criteria.' }
    }

    // 6. Delete
    const { error: delError } = await supabase
        .from('classes')
        .delete()
        .in('id', idsToDelete)
    
    if (delError) return { error: delError.message }

    return { success: true, deletedCount: idsToDelete.length }
}
