import { getStudentSession } from '@/app/actions/studentAuth'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service Role 用の Admin クライアント作成ヘルパー
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(req) {
  try {
    let studentIdText = null

    // 1. まずカスタムクッキーセッション (学籍番号ログイン) を検証
    const studentSession = await getStudentSession()
    if (studentSession && studentSession.studentId) {
      studentIdText = studentSession.studentId
    } else {
      // 2. なければ Supabase Auth セッション (Googleログイン) を検証
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (user && !authError) {
        // profiles から student_id_text を引く
        const adminSupabase = createAdminClient()
        const { data: profile } = await adminSupabase
          .from('profiles')
          .select('student_id_text')
          .eq('id', user.id)
          .single()
        
        if (profile && profile.student_id_text) {
          studentIdText = profile.student_id_text
        }
      }
    }

    if (!studentIdText) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { app_type, activity_type, category, score, total, detail } = body

    if (!app_type || !activity_type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Admin クライアントを使ってインサート (学籍番号に直接紐付け)
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('student_play_records')
      .insert({
        student_id_text: studentIdText,
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
