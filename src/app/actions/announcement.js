"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Helper for admin client (Service Role)
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function getAnnouncements() {
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        id, title, content, is_pinned, created_at, author_id, sender_name, course_id, file_urls,
        author:profiles!author_id (
          id,
          full_name,
          avatar_url
        ),
        course:courses (
          id,
          title
        )
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error("getAnnouncements DB error:", error);
      return { data: [], error: error.message }
    }
    
    return { data: data || [], error: null }
  } catch (e) {
    console.error("getAnnouncements exception:", e);
    return { data: [], error: e.message }
  }
}
