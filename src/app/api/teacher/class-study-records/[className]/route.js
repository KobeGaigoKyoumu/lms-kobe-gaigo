import { createClient } from '@/lib/supabase/server'
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
    // ログインユーザーの検証 (標準クライアントを使用)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 教師・管理者ロールか検証 (標準クライアントを使用)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['teacher', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const className = decodeURIComponent(resolvedParams.className)

    // これ以降のクエリは RLS をバイパスするため Admin クライアントを使用する
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

    // 2. profiles から学生の UUID (id) と学籍番号 (student_id_text) のマッピングを取得
    const { data: studentProfiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, student_id_text')
      .in('student_id_text', studentIdTexts)

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // profiles.id から student_id_text への逆引きマップを作成
    const uuidToIdText = {}
    const studentUuids = []
    if (studentProfiles) {
      studentProfiles.forEach(p => {
        uuidToIdText[p.id] = p.student_id_text
        studentUuids.push(p.id)
      })
    }

    // 3. student_play_records から学生たちのプレイ履歴を取得
    let playRecords = []
    if (studentUuids.length > 0) {
      const { data: records, error: recordsError } = await adminSupabase
        .from('student_play_records')
        .select('*')
        .in('student_id', studentUuids)
        .order('created_at', { ascending: false })

      if (recordsError) {
        // テーブルがまだ作られていないなどのエラーを避けるために優しく空配列を返す
        console.warn('student_play_records table query failed:', recordsError.message)
      } else {
        playRecords = records || []
      }
    }

    // student_id_text でマッピングされたレコード一覧に変換
    const recordsByIdText = playRecords.map(r => ({
      ...r,
      student_id_text: uuidToIdText[r.student_id]
    })).filter(r => r.student_id_text)

    return NextResponse.json({
      students,
      records: recordsByIdText
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
