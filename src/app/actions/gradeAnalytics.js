'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

// Cache the grade analytics data for 1 hour
// Key: 'grade-analytics-v1'
const getCachedGradeAnalytics = unstable_cache(
    async () => {
        console.log('Cache MISS: Fetching Grade Analytics from DB...')
        const supabase = await createClient()

        try {
            const { data, error } = await supabase
                .from('grade_records')
                .select('id, student_id_text, student_name, class_name, year_term, final_exam_total, report_card_total, final_exam_data, report_card_data')
                .order('year_term', { ascending: false })

            if (error) throw error

            // Filter out JLPT data on the server side to reduce payload
            const filteredData = (data || []).filter(item => {
                const isJlptTerm = item.year_term?.startsWith('JLPT')
                const isJlptType = item.final_exam_data?.type === 'JLPT'
                return !isJlptTerm && !isJlptType
            })

            console.log(`Server Action: Fetched and filtered ${filteredData.length} grade records.`)
            return { data: filteredData }
        } catch (error) {
            console.error('Grade Analytics Fetch Error:', error)
            return { error: error.message }
        }
    },
    ['grade-analytics-v1'],
    { revalidate: 3600, tags: ['grade-analytics'] } // 1 hour cache
)

export async function fetchGradeAnalytics() {
    return await getCachedGradeAnalytics()
}
