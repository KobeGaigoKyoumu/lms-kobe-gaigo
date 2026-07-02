import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { app_type, activity_type, category, score, total, detail } = body

    if (!app_type || !activity_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // DBへインサート
    const { data, error } = await supabase
      .from('student_play_records')
      .insert({
        student_id: user.id,
        app_type,
        activity_type,
        category,
        score: score !== undefined ? parseInt(score, 10) : null,
        total: total !== undefined ? parseInt(total, 10) : null,
        detail: detail || {}
      })
      .select()

    if (error) {
      console.error('Supabase DB Insert Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Study record API Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
