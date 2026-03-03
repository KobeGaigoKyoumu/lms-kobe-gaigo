'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const createAdminClient = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

// パッケージ一覧取得（全アカウント共有）
export async function getEventPackages() {
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
export async function getAppliedClassesForPackages(packageIds) {
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
export async function getClassesForPackages() {
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
}

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
    return { success: true }
}
