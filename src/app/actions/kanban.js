"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidateTag } from "next/cache"

// Helper for admin client (Service Role)
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}


export async function getKanbanReminders(cardId) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_reminders")
    .select("*")
    .eq("card_id", cardId)
  
  return { data: data || [], error: error?.message }
}

// ===== Column CRUD =====

export async function addKanbanColumn(title, position, userId) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_columns")
    .insert({ title, order_index: position, user_id: userId })
    .select()
    .single()
  
  if (!error) revalidateTag("kanban")
  return { data, error: error?.message }
}

export async function updateKanbanColumnTitle(colId, title) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_columns")
    .update({ title })
    .eq("id", colId)
    .select()
    .single()
  
  if (!error) revalidateTag("kanban")
  return { success: !error, data, error: error?.message }
}

export async function deleteKanbanColumn(colId) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("kanban_columns")
    .delete()
    .eq("id", colId)
  
  if (!error) revalidateTag("kanban")
  return { success: !error, error: error?.message }
}

export async function updateKanbanColumnPosition(colId, newPosition, userId) {
  const supabase = createAdminClient()
  // Simplified position update: just update the one or handle full reordering
  const { error } = await supabase
    .from("kanban_columns")
    .update({ order_index: newPosition })
    .eq("id", colId)
  
  if (!error) revalidateTag("kanban")
  return { success: !error, error: error?.message }
}

// ===== Card CRUD =====

export async function addKanbanCard(columnId, title, position, userId) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_cards")
    .insert({
      column_id: columnId,
      title,
      position,
      user_id: userId
    })
    .select()
    .single()
  
  if (!error) revalidateTag("kanban")
  return { data, error: error?.message }
}

export async function createKanbanCard(cardData) {
  // Alias for compatibility
  return addKanbanCard(cardData.column_id, cardData.title, cardData.position || 0, cardData.user_id)
}

export async function updateKanbanCard(cardId, updates) {
  const supabase = createAdminClient()
  
  // Map any camelCase to snake_case if necessary
  const dbUpdates = { ...updates }
  
  const { data, error } = await supabase
    .from("kanban_cards")
    .update(dbUpdates)
    .eq("id", cardId)
    .select()
    .single()
    
  if (!error) revalidateTag("kanban")
  return { success: !error, data, error: error?.message }
}

export async function deleteKanbanCard(cardId) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("kanban_cards")
    .delete()
    .eq("id", cardId)
    
  if (!error) revalidateTag("kanban")
  return { success: !error, error: error?.message }
}

export async function updateKanbanCardPosition(cardId, columnId, newPosition) {
  const supabase = createAdminClient()
  
  try {
    // If newPosition is an object with {prev, next}, calculate midpoint here
    // or if it's already a number, just use it.
    let position = newPosition

    const { data, error } = await supabase
      .from("kanban_cards")
      .update({ 
        column_id: columnId,
        position: position
      })
      .eq("id", cardId)
      .select()
      .single()

    if (error) throw error

    revalidateTag("kanban")
    return { success: true, data }
  } catch (err) {
    console.error("updateKanbanCardPosition error:", err)
    return { success: false, error: err.message }
  }
}

// ===== Reminder CRUD =====

export async function addKanbanReminder(cardId, reminderType, remindTime, remindDays, remindDate, userId) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_reminders")
    .insert({
      card_id: cardId,
      reminder_type: reminderType,
      remind_time: remindTime,
      remind_days: remindDays,
      remind_date: remindDate,
      user_id: userId
    })
    .select()
    .single()
  
  if (!error) revalidateTag("kanban")
  return { data, error: error?.message }
}

export async function updateKanbanReminder(reminderId, updates) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_reminders")
    .update(updates)
    .eq("id", reminderId)
    .select()
    .single()
  
  if (!error) revalidateTag("kanban")
  return { data, error: error?.message }
}

export async function deleteKanbanReminder(reminderId) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("kanban_reminders")
    .delete()
    .eq("id", reminderId)
  
  if (!error) revalidateTag("kanban")
  return { success: !error, error: error?.message }
}

// ===== Label CRUD =====

export async function updateKanbanLabelName(labelId, newName) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_labels")
    .update({ name: newName })
    .eq("id", labelId)
    .select()
    .single()
  
  if (!error) revalidateTag("kanban")
  return { success: !error, data, error: error?.message }
}
