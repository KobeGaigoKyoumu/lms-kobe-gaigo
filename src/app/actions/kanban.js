'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidateTag, unstable_cache } from 'next/cache'

const createAdminClient = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

// Helper to check if a string is a valid UUID
const isUUID = (str) => {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

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
    { revalidate: 86400, tags: ['kanban'] }
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
    { revalidate: 86400, tags: ['kanban'] }
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
    { revalidate: 86400, tags: ['kanban'] }
)

export const getAllKanbanReminders = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('kanban_reminders')
            .select('id, card_id, enabled')
        if (error) return { error: error.message }
        return { data }
    },
    ['kanban-all-reminders'],
    { revalidate: 86400, tags: ['kanban'] }
)

// ===== Column CRUD =====
export async function addKanbanColumn(title, position, createdBy) {
    const supabase = createAdminClient()
    const validCreatedBy = isUUID(createdBy) ? createdBy : null;
    const { data, error } = await supabase
        .from('kanban_columns')
        .insert({ title, position, created_by: validCreatedBy })
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
    const validCreatedBy = isUUID(createdBy) ? createdBy : null;
    const { data, error } = await supabase
        .from('kanban_cards')
        .insert({ column_id: columnId, title, position, created_by: validCreatedBy })
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

export async function updateKanbanCardPosition(cardId, columnId, newIndex) {
    const supabase = createAdminClient()

    // 1. Get all cards in the target column except the moving card
    const { data: otherCards, error: fetchError } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('column_id', columnId)
        .neq('id', cardId)
        .order('position', { ascending: true })

    if (fetchError) return { error: fetchError.message }

    // 2. Get the moving card's data if it needs to change column
    const { data: movingCard, error: cardError } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('id', cardId)
        .single()
    
    if (cardError) return { error: cardError.message }

    // 3. Construct the new order list
    const sortedCards = [...otherCards]
    sortedCards.splice(newIndex, 0, { ...movingCard, column_id: columnId })

    // 4. Update all cards in this column with sequential positions
    const updates = sortedCards.map((c, idx) => ({
        id: c.id,
        column_id: columnId,
        position: idx
    }))

    // Use upsert to update multiple rows (using id as the unique key)
    const { error: upsertError } = await supabase
        .from('kanban_cards')
        .upsert(updates)

    if (upsertError) return { error: upsertError.message }

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
    const validCreatedBy = isUUID(createdBy) ? createdBy : null;
    const { data, error } = await supabase
        .from('kanban_reminders')
        .insert({
            card_id: cardId,
            reminder_type: reminderType,
            remind_time: remindTime,
            remind_days: remindDays || [],
            remind_date: remindDate || null,
            created_by: validCreatedBy
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
