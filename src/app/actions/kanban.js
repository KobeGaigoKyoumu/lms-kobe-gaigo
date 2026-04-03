"use server"

import { createAdminClient } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function getKanbanColumns() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_columns")
    .select("*")
    .order("order_index")
  
  if (error) {
    console.error("Error fetching kanban columns:", error)
    return []
  }
  return data
}

export async function getKanbanCards(userId) {
  const supabase = createAdminClient()
  
  // JOIN with profiles to get student name
  const { data, error } = await supabase
    .from("kanban_cards")
    .select(`
      *,
      profiles:user_id(full_name)
    `)
    .eq("user_id", userId)
    .order("position")
  
  if (error) {
    console.error("Error fetching kanban cards:", error)
    return []
  }

  // Flatten student name
  return data.map(card => ({
    ...card,
    student_name: card.profiles?.full_name || "Unknown"
  }))
}

export async function createKanbanCard(cardData) {
  const supabase = createAdminClient()
  
  // Get max position in the target column
  const { data: existingCards } = await supabase
    .from("kanban_cards")
    .select("position")
    .eq("user_id", cardData.user_id)
    .eq("column_id", cardData.column_id)
    .order("position", { ascending: false })
    .limit(1)
  
  const nextPosition = existingCards && existingCards.length > 0 
    ? existingCards[0].position + 1 
    : 0

  const { data, error } = await supabase
    .from("kanban_cards")
    .insert({
      ...cardData,
      position: nextPosition
    })
    .select()
    .single()
    
  if (error) {
    console.error("Error creating kanban card:", error)
    return { success: false, error: error.message }
  }
  
  revalidatePath("/(dashboard)/kanban", "page")
  return { success: true, data }
}

export async function updateKanbanCard(cardId, updates) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from("kanban_cards")
    .update(updates)
    .eq("id", cardId)
    .select()
    .single()
    
  if (error) {
    console.error("Error updating kanban card:", error)
    return { success: false, error: error.message }
  }
  
  revalidatePath("/(dashboard)/kanban", "page")
  return { success: true, data }
}

export async function deleteKanbanCard(cardId) {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from("kanban_cards")
    .delete()
    .eq("id", cardId)
    
  if (error) {
    console.error("Error deleting kanban card:", error)
    return { success: false, error: error.message }
  }
  
  revalidatePath("/(dashboard)/kanban", "page")
  return { success: true }
}

export async function updateKanbanCardPosition(cardId, columnId, newIndex) {
  const supabase = createAdminClient()
  
  try {
    // 1. Get the card to find out who it belongs to
    const { data: movingCard, error: fetchError } = await supabase
      .from("kanban_cards")
      .select("user_id, column_id, position")
      .eq("id", cardId)
      .single()
      
    if (fetchError || !movingCard) throw new Error("Moving card not found")

    const userId = movingCard.user_id
    const prevColumnId = movingCard.column_id

    // 2. Fetch all cards for this user in the target column
    const { data: targetCards, error: targetError } = await supabase
      .from("kanban_cards")
      .select("id, position")
      .eq("user_id", userId)
      .eq("column_id", columnId)
      .order("position")

    if (targetError) throw targetError

    // 3. Remove the card if it's already in the target column (reordering)
    let reorderedCards = targetCards.filter(c => String(c.id) !== String(cardId))
    
    // 4. Insert at the new index
    reorderedCards.splice(newIndex, 0, { id: cardId })

    // 5. Build the batch update operations for the target column
    const updates = reorderedCards.map((c, index) => ({
      id: c.id,
      user_id: userId,
      column_id: columnId,
      position: index
    }))

    // 6. Perform the upsert (which updates existing rows by ID)
    const { error: batchError } = await supabase
      .from("kanban_cards")
      .upsert(updates, { onConflict: 'id' })

    if (batchError) throw batchError

    // 7. Optional: Reindex the source column if it was different
    if (String(prevColumnId) !== String(columnId)) {
      const { data: sourceCards } = await supabase
        .from("kanban_cards")
        .select("id")
        .eq("user_id", userId)
        .eq("column_id", prevColumnId)
        .order("position")
      
      if (sourceCards && sourceCards.length > 0) {
        const sourceUpdates = sourceCards.map((c, index) => ({
          id: c.id,
          user_id: userId,
          column_id: prevColumnId,
          position: index
        }))
        await supabase.from("kanban_cards").upsert(sourceUpdates, { onConflict: 'id' })
      }
    }

    revalidatePath("/(dashboard)/kanban", "page")
    return { success: true }
  } catch (err) {
    console.error("Position update error:", err)
    return { success: false, error: err.message }
  }
}
