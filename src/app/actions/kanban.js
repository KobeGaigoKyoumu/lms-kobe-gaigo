"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

// Helper for admin client (Service Role)
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// ===== Fetching Functions =====

export async function getKanbanColumns() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_columns")
    .select("*")
    .order("order_index")
  
  if (error) console.error("getKanbanColumns error:", error);
  return { data: data || [], error: error?.message }
}

export async function getKanbanCards() {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("kanban_cards")
    .select(`
      *,
      admin_members:user_id(name)
    `)
    .order("position")
  
  if (error) return { data: [], error: error.message }

  const formattedData = data.map(card => ({
    ...card,
    student_name: card.admin_members?.name || "Unknown"
  }))

  return { data: formattedData, error: null }
}

export async function getKanbanLabels() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_labels")
    .select("*")
    .order("id")
  
  return { data: data || [], error: error?.message }
}

export async function getAllKanbanReminders() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_reminders")
    .select("*")
  
  return { data: data || [], error: error?.message }
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
  
  if (!error) revalidatePath("/kanban", "page")
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
  
  if (!error) revalidatePath("/kanban", "page")
  return { success: !error, data, error: error?.message }
}

export async function deleteKanbanColumn(colId) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("kanban_columns")
    .delete()
    .eq("id", colId)
  
  if (!error) revalidatePath("/kanban", "page")
  return { success: !error, error: error?.message }
}

export async function updateKanbanColumnPosition(colId, newPosition, userId) {
  const supabase = createAdminClient()
  // Simplified position update: just update the one or handle full reordering
  const { error } = await supabase
    .from("kanban_columns")
    .update({ order_index: newPosition })
    .eq("id", colId)
  
  if (!error) revalidatePath("/kanban", "page")
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
  
  if (!error) revalidatePath("/kanban", "page")
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
    
  if (!error) revalidatePath("/kanban", "page")
  return { success: !error, data, error: error?.message }
}

export async function deleteKanbanCard(cardId) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("kanban_cards")
    .delete()
    .eq("id", cardId)
    
  if (!error) revalidatePath("/kanban", "page")
  return { success: !error, error: error?.message }
}

export async function updateKanbanCardPosition(cardId, columnId, newIndex) {
  const supabase = createAdminClient()
  
  try {
    const { data: movingCard, error: fetchError } = await supabase
      .from("kanban_cards")
      .select("*")
      .eq("id", cardId)
      .single()
      
    if (fetchError || !movingCard) throw new Error("Moving card not found")
    
    // Sanitize userId and columnId - handle string "null" which might come from bad data
    const userId = movingCard.user_id === "null" ? null : movingCard.user_id
    const prevColumnId = movingCard.column_id === "null" ? null : movingCard.column_id

    const { data: targetCards, error: targetError } = await supabase
      .from("kanban_cards")
      .select("*")
      .eq("column_id", columnId)
      .order("position")

    if (targetError) throw targetError

    let reorderedCards = targetCards.filter(c => String(c.id) !== String(cardId))
    reorderedCards.splice(newIndex, 0, movingCard) // Use movingCard instead of just {id: cardId}

    const updates = reorderedCards.map((c, index) => ({
      ...c,
      column_id: columnId,
      position: index
    }))

    const { error: batchError } = await supabase
      .from("kanban_cards")
      .upsert(updates, { onConflict: 'id' })

    if (batchError) throw batchError

    if (String(prevColumnId) !== String(columnId)) {
      const { data: sourceCards } = await supabase
        .from("kanban_cards")
        .select("*")
        .eq("column_id", prevColumnId)
        .order("position")
      
      if (sourceCards && sourceCards.length > 0) {
        const sourceUpdates = sourceCards.map((c, index) => ({
          ...c,
          column_id: prevColumnId,
          position: index
        }))
        await supabase.from("kanban_cards").upsert(sourceUpdates, { onConflict: 'id' })
      }
    }

    revalidatePath("/kanban", "page")
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    console.error("Position update error:", err)
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
  
  if (!error) revalidatePath("/kanban", "page")
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
  
  if (!error) revalidatePath("/kanban", "page")
  return { data, error: error?.message }
}

export async function deleteKanbanReminder(reminderId) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("kanban_reminders")
    .delete()
    .eq("id", reminderId)
  
  if (!error) revalidatePath("/kanban", "page")
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
  
  if (!error) revalidatePath("/kanban", "page")
  return { success: !error, data, error: error?.message }
}
