import { getStudentSession } from '@/app/actions/studentAuth'
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
    // 1. 学籍番号ログインセッション (カスタムクッキー) を検証
    const studentSession = await getStudentSession()
    
    if (!studentSession || !studentSession.studentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const studentIdText = studentSession.studentId
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
