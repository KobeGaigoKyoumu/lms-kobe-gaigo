'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidateTag, unstable_cache } from 'next/cache'

const createAdminClient = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

// ===== Readers (Cached) =====
export const getKanbanColumns = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('kanban_columns')
            .select('*')
            .order('position', { ascending: true })
        if (error) return { error: error.message }
        return { data }
    },
    ['kanban-columns'],
    { tags: ['kanban'] }
)

export const getKanbanCards = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('kanban_cards')
            .select('*')
            .order('position', { ascending: true })
        if (error) return { error: error.message }
        return { data }
    },
    ['kanban-cards'],
    { tags: ['kanban'] }
)

export const getKanbanLabels = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('kanban_labels')
            .select('*')
            .order('position', { ascending: true })
        if (error) return { error: error.message }
        return { data }
    },
    ['kanban-labels'],
    { tags: ['kanban'] }
)

// ===== Column CRUD =====
export async function addKanbanColumn(title, position, createdBy) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('kanban_columns')
        .insert({ title, position, created_by: createdBy })
        .select()
        .single()
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { data }
}

export async function updateKanbanColumnTitle(colId, title) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_columns')
        .update({ title })
        .eq('id', colId)
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { success: true }
}

export async function deleteKanbanColumn(colId) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', colId)
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { success: true }
}

export async function updateKanbanColumnPosition(colId, position) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_columns')
        .update({ position })
        .eq('id', colId)
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { success: true }
}

// ===== Card CRUD =====
export async function addKanbanCard(columnId, title, position, createdBy) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('kanban_cards')
        .insert({ column_id: columnId, title, position, created_by: createdBy })
        .select()
        .single()
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { data }
}

export async function updateKanbanCard(cardId, updates) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_cards')
        .update(updates)
        .eq('id', cardId)
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { success: true }
}

export async function deleteKanbanCard(cardId) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_cards')
        .delete()
        .eq('id', cardId)
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { success: true }
}

export async function updateKanbanCardPosition(cardId, columnId, position) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_cards')
        .update({ column_id: columnId, position })
        .eq('id', cardId)
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { success: true }
}

// ===== Label CRUD =====
export async function updateKanbanLabelName(labelId, name) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_labels')
        .update({ name })
        .eq('id', labelId)
    if (error) return { error: error.message }
    revalidateTag('kanban')
    return { success: true }
}

// ===== Reminder CRUD =====
export async function getKanbanReminders(cardId) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('kanban_reminders')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true })
    if (error) return { error: error.message }
    return { data }
}

export async function addKanbanReminder(cardId, reminderType, remindTime, remindDays, remindDate, createdBy) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('kanban_reminders')
        .insert({
            card_id: cardId,
            reminder_type: reminderType,
            remind_time: remindTime,
            remind_days: remindDays || [],
            remind_date: remindDate || null,
            created_by: createdBy
        })
        .select()
        .single()
    if (error) return { error: error.message }
    return { data }
}

export async function updateKanbanReminder(reminderId, updates) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_reminders')
        .update(updates)
        .eq('id', reminderId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function deleteKanbanReminder(reminderId) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_reminders')
        .delete()
        .eq('id', reminderId)
    if (error) return { error: error.message }
    return { success: true }
}
