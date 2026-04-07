import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"

// Helper for admin client (Service Role)
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// ===== Fetching Functions (Server Side Only) =====

export const getKanbanColumns = unstable_cache(
  async () => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("kanban_columns")
        .select("*")
        .order("order_index")
      
      if (error) {
        console.error("getKanbanColumns DB error:", error);
        return { data: [], error: error.message }
      }
      return { data: data || [], error: null }
    } catch (e) {
      console.error("getKanbanColumns exception:", e);
      return { data: [], error: e.message }
    }
  },
  ['kanban-columns'],
  { tags: ['kanban'] }
)

export const getKanbanCards = unstable_cache(
  async () => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("kanban_cards")
        .select(`
          *,
          admin_members:user_id(name)
        `)
        .order("position")
      
      if (error) {
        console.error("getKanbanCards DB error:", error);
        return { data: [], error: error.message }
      }

      const formattedData = (data || []).map(card => ({
        ...card,
        student_name: card.admin_members?.name || "Unknown"
      }))

      return { data: formattedData, error: null }
    } catch (e) {
      console.error("getKanbanCards exception:", e);
      return { data: [], error: e.message }
    }
  },
  ['kanban-cards'],
  { tags: ['kanban'] }
)

export const getKanbanLabels = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("kanban_labels")
      .select("*")
      .order("id")
    
    return { data: data || [], error: error?.message }
  },
  ['kanban-labels'],
  { tags: ['kanban'] }
)

export const getAllKanbanReminders = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("kanban_reminders")
      .select("*")
    
    return { data: data || [], error: error?.message }
  },
  ['kanban-reminders-all'],
  { tags: ['kanban'] }
)

/**
 * Normal fetch for a single card reminders.
 * Not cached since it's used in specific details modals.
 */
export async function getKanbanReminders(cardId) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("kanban_reminders")
    .select("*")
    .eq("card_id", cardId)
  
  return { data: data || [], error: error?.message }
}
