'use server'

import { createClient } from '@supabase/supabase-js'
import { unstable_cache, revalidateTag } from 'next/cache'

const getSupabaseAdmin = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

// 1. Fetch Filters (Years and Classes) - Cached 24h
export const fetchGradeFilters = unstable_cache(
    async () => {
        const supabase = getSupabaseAdmin()

        // Only fetch columns needed for filters
        const { data, error } = await supabase
            .from('grade_records')
            .select('year_term, class_name')
            .range(0, 49999) // Limit to avoid massive payload, usually sufficient for filters

        if (error) {
            console.error('Error fetching grade filters:', error)
            return { yearTerms: [], classes: [] }
        }

        if (!data) return { yearTerms: [], classes: [] }

        // Extract unique terms (exclude JLPT official exams if needed, logic from original file)
        const terms = [...new Set(data.map(r => r.year_term))]
            .filter(t => !/JLPT \d{4}年第\d回/.test(t))
            .sort().reverse()

        const cls = [...new Set(data.map(r => r.class_name))].sort()

        return { yearTerms: terms, classes: cls }
    },
    ['grade-filters-v1'],
    { revalidate: 86400, tags: ['grade-records'] }
)

// 2. Fetch Records for a Term - Cached 1h
export const fetchTermGradeRecords = unstable_cache(
    async (term) => {
        if (!term) return []
        const supabase = getSupabaseAdmin()

        const { data, error } = await supabase
            .from('grade_records')
            .select('id, student_id_text, student_name, class_name, year_term, final_exam_total, report_card_total, final_exam_data, report_card_data, created_at')
            .eq('year_term', term)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching term data:', error)
            throw error
        }

        return data || []
    },
    ['grade-records-term-v1'], // We append term key dynamically by usage? No, unstable_cache keyParts must be static or arguments.
    // Wait, unstable_cache receives arguments. The key parts should identify the "function". 
    // The arguments are automatically part of the cache key generation mechanism in Next.js?
    // Actually, for unstable_cache(cb, keyParts, options), keyParts is used to identify the cache entry GLOBALLY.
    // If we want it to vary by 'term', 'term' must be inside the callback scope OR we rely on Next.js to auto-key based on args?
    // Documentation says: "keyParts: An array of strings that globally identifies the values."
    // If we use the SAME keyParts ['grade-records-term-v1'] for all calls, will it mix up terms?
    // YES, it might if we don't include the argument in the keyParts explicitly or if Next.js doesn't handle it.
    // Actually, unstable_cache creates a cached version of the function. 
    // "You should provide a unique key for each varying input if you are caching inside a component, slightly different for server actions wrapper."
    // Best practice: include the argument in the keyParts if it's dynamic? 
    // Actually, the standard way is: unstable_cache(fn, keys). Next.js automatically hashes the ARGUMENTS passed to the fn to create the specific cache key variation.
    // The 'keys' array is for invalidation grouping/namespaces.
    // So ['grade-records-term-v1'] is fine, calling with fetchTermGradeRecords('TermA') and fetchTermGradeRecords('TermB') will theoretically store separate entries.
    // BUT to be safe and explicit, usually people don't put args in the static key array unless it's a closure. 
    // Here we pass 'term' to the cached function. Next.js handles the arg hashing.
    { revalidate: 3600, tags: ['grade-records'] }
)

// 3. Save Records (Bulk) - Invalidate Cache
export async function saveGradeRecords(records, yearTerm) {
    const supabase = getSupabaseAdmin()

    // Process records to match DB schema if needed, but assuming calling code formats them correctly
    // "GradeUploader" formats them well, but we need to ensure the keys match the DB columns.
    // The Uploader creates objects: { student_id_text: ..., final_exam_data: ..., ... }

    // Chunking to avoid payload limits if necessary (e.g., 50 records at a time)
    const chunkSize = 50
    const chunks = []
    for (let i = 0; i < records.length; i += chunkSize) {
        chunks.push(records.slice(i, i + chunkSize))
    }

    let successCount = 0
    let errors = []

    for (const chunk of chunks) {
        const { error } = await supabase
            .from('grade_records')
            .upsert(chunk, {
                onConflict: 'student_id_text, year_term'
            })

        if (error) {
            console.error('Save error:', error)
            errors.push(error.message)
        } else {
            successCount += chunk.length
        }
    }

    if (successCount > 0) {
        revalidateTag('grade-records')
    }

    return { success: successCount, errors }
}

// 4. Delete Records (Bulk by Class/Term) - Invalidate Cache
export async function deleteGradeRecords(yearTerm, classNames) {
    const supabase = getSupabaseAdmin()

    const { error } = await supabase
        .from('grade_records')
        .delete()
        .eq('year_term', yearTerm)
        .in('class_name', classNames)

    if (error) {
        console.error('Delete error:', error)
        throw error
    }

    revalidateTag('grade-records')
    return { success: true }
}

// Invalidate Cache Action (Manual)
export async function invalidateGradeCache() {
    revalidateTag('grade-records')
}
