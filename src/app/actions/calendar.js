'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'

const createAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
        console.error('Calendar Action: Missing Supabase Environment Variables');
    }
    return createSupabaseClient(url, key)
}

const isUUID = (str) => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

// パッケージ一覧取得（全アカウント共有）
export const getEventPackages = async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('event_packages')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getEventPackages error:', error)
        return { error: 'Failed to fetch packages' }
    }
    return { data }
}

// 適用済みクラス取得
export const getAppliedClassesForPackages = async (packageIds) => {
    if (!packageIds || packageIds.length === 0) return { data: [] }
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('calendar_events')
        .select('package_id, target_class')
        .in('package_id', packageIds)
        .not('target_class', 'is', null)

    if (error) {
        console.error('getAppliedClasses error:', error)
        return { error: 'Failed to fetch applied classes' }
    }
    return { data }
}

// クラス一覧取得
export const getClassesForPackages = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('students')
            .select('class_name')
            .not('class_name', 'is', null)
            .order('class_name')

        if (error) {
            console.error('getClasses error:', error)
            return { error: 'Failed to fetch classes' }
        }

        const unique = [...new Set(data?.map(s => s.class_name))].filter(Boolean)
        return { data: unique }
    },
    ['event-packages-classes'],
    { tags: ['students'] } // classes や students テーブルの更新時にタグ指定すればリロード可能（今回は念のため）
)

// 入学期一覧取得
export const getTermsForPackages = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('students')
            .select('enrollment_period')
            .not('enrollment_period', 'is', null)
            .order('enrollment_period', { ascending: false })

        if (error) {
            console.error('getTerms error:', error)
            return { error: 'Failed to fetch terms' }
        }

        const unique = [...new Set(data?.map(s => s.enrollment_period))].filter(Boolean)
        return { data: unique }
    },
    ['event-packages-terms'],
    { tags: ['students'] }
)

// パッケージ作成
export async function createEventPackage(packageData) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('event_packages')
        .insert(packageData)
        .select()

    if (error) {
        console.error('createEventPackage error:', error)
        return { error: 'Failed to create package' }
    }
    revalidateTag('event-packages')
    return { success: true, data }
}

// パッケージ更新
export async function updateEventPackage(id, packageData) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('event_packages')
        .update(packageData)
        .eq('id', id)
        .select()

    if (error) {
        console.error('updateEventPackage error:', error)
        return { error: 'Failed to update package' }
    }
    revalidateTag('event-packages')
    return { success: true, data }
}

// パッケージ削除
export async function deleteEventPackage(id) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('event_packages')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('deleteEventPackage error:', error)
        return { error: 'Failed to delete package' }
    }
    revalidateTag('event-packages')
    return { success: true }
}

// パッケージの複製
export async function copyEventPackage(id) {
    const supabase = createAdminClient()
    
    // 1. Get the original
    const { data: original, error: fetchErr } = await supabase
        .from('event_packages')
        .select('*')
        .eq('id', id)
        .single()
        
    if (fetchErr || !original) {
        console.error('Fetch error for copy:', fetchErr)
        return { error: 'Failed to fetch original package' }
    }
    
    // 2. Prepare the clone
    const clone = {
        title: `${original.title} - コピー`,
        description: original.description,
        events: original.events
    }
    
    const { data, error: insertErr } = await supabase
        .from('event_packages')
        .insert(clone)
        .select()
        
    if (insertErr) {
        console.error('Insert error for copy:', insertErr)
        return { error: 'Failed to clone package' }
    }
    
    revalidateTag('event-packages')
    return { success: true, data: data[0] }
}

// パッケージの適用
export async function applyPackageToTarget(newEvents) {
    const supabase = createAdminClient()
    
    // Sanitize created_by for all events since staff accounts are not in profiles table
    const sanitizedEvents = (newEvents || []).map(e => ({
        ...e,
        created_by: isUUID(e.created_by) ? e.created_by : null
    }))

    const { error } = await supabase.from('calendar_events').insert(sanitizedEvents)
    if (error) {
        console.error('applyPackageToTarget Database error:', error)
        return { error: `Failed to apply package: ${error.message}` }
    }
    revalidateTag('calendar-events')
    return { success: true }
}

// パッケージの適用解除
export async function unapplyPackageFromTarget(packageId, targetClass) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('package_id', packageId)
        .eq('target_class', targetClass)

    if (error) {
        console.error('unapplyPackageFromTarget error:', error)
        return { error: 'Failed to unapply package' }
    }
    
    // イベント削除されたためカレンダー関連のキャッシュを無効化
    revalidateTag('calendar-events')
    return { success: true }
}

// === 単独イベントの管理アクション ===
export async function createSingleEvent(eventData) {
    const supabase = createAdminClient()
    
    // Sanitize created_by for staff accounts
    const sanitizedData = {
        ...eventData,
        created_by: isUUID(eventData.created_by) ? eventData.created_by : null
    }

    const { data, error } = await supabase.from('calendar_events').insert(sanitizedData).select()
    if (error) {
        console.error('createSingleEvent error:', error)
        return { error: 'Failed to create event' }
    }
    revalidateTag('calendar-events')
    return { success: true, data: data[0] }
}

export async function updateSingleEvent(id, eventData) {
    const supabase = createAdminClient()
    
    // Sanitize created_by for staff accounts
    const sanitizedData = {
        ...eventData,
        created_by: isUUID(eventData.created_by) ? eventData.created_by : null
    }

    const { data, error } = await supabase.from('calendar_events').update(sanitizedData).eq('id', id).select()
    if (error) {
        console.error('updateSingleEvent error:', error)
        return { error: 'Failed to update event' }
    }
    revalidateTag('calendar-events')
    return { success: true, data: data[0] }
}

export async function deleteSingleEvent(id) {
    const supabase = createAdminClient()
    const { error } = await supabase.from('calendar_events').delete().eq('id', id)
    if (error) {
        console.error('deleteSingleEvent error:', error)
        return { error: 'Failed to delete event' }
    }
    revalidateTag('calendar-events')
    return { success: true }
}
