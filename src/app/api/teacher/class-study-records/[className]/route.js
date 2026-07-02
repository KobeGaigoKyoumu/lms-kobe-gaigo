import { getAdminMemberSession } from '@/app/actions/adminAuth'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service Role 用の Admin クライアント作成ヘルパー
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(req, { params }) {
  try {
    // ログイン職員セッションの検証
    const session = await getAdminMemberSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 教師・管理者ロールか検証 (どのクラスのプレイ記録も閲覧可能)
    if (!['teacher', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const className = decodeURIComponent(resolvedParams.className)

    // これ以降ের クエリは RLS をバイパスするため Admin クライアントを使用する
    const adminSupabase = createAdminClient()

    // 1. そのクラスのアクティブな学生を取得
    const { data: students, error: studentsError } = await adminSupabase
      .from('students')
      .select('student_id_text, full_name')
      .eq('class_name', className)
      .eq('status', 'active')
      .order('full_name', { ascending: true })

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ students: [], records: [] })
    }

    const studentIdTexts = students.map(s => s.student_id_text)

    // 2. student_play_records から学生たちのプレイ履歴を学籍番号で直接取得 (profilesを介さない)
    let playRecords = []
    if (studentIdTexts.length > 0) {
      const { data: records, error: recordsError } = await adminSupabase
        .from('student_play_records')
        .select('*')
        .in('student_id_text', studentIdTexts)
        .order('created_at', { ascending: false })

      if (recordsError) {
        console.warn('student_play_records table query failed:', recordsError.message)
      } else {
        playRecords = records || []
      }
    }

    return NextResponse.json({
      students,
      records: playRecords
    })
  } catch (err) {
    console.error('Class study records API error:', err)
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: err.message,
      stack: err.stack 
    }, { status: 500 })
  }
}
