'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const createAdminClient = () => {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )
}

// ===== Column CRUD =====
export async function addKanbanColumn(title, position, createdBy) {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('kanban_columns')
        .insert({ title, position, created_by: createdBy })
        .select()
        .single()
    if (error) return { error: error.message }
    return { data }
}

export async function updateKanbanColumnTitle(colId, title) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_columns')
        .update({ title })
        .eq('id', colId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function deleteKanbanColumn(colId) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', colId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function updateKanbanColumnPosition(colId, position) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_columns')
        .update({ position })
        .eq('id', colId)
    if (error) return { error: error.message }
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
    return { data }
}

export async function updateKanbanCard(cardId, updates) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_cards')
        .update(updates)
        .eq('id', cardId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function deleteKanbanCard(cardId) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_cards')
        .delete()
        .eq('id', cardId)
    if (error) return { error: error.message }
    return { success: true }
}

export async function updateKanbanCardPosition(cardId, columnId, position) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('kanban_cards')
        .update({ column_id: columnId, position })
        .eq('id', cardId)
    if (error) return { error: error.message }
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
    return { success: true }
}
