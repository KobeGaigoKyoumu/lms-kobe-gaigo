'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getStudentSession } from './studentAuth'
import { getAdminMemberSession } from './adminAuth'
import { revalidatePath } from 'next/cache'

// Admin Client (Service Role)
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Server configurations not found')
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

// ----------------------------------------------------
// 教師側アクション (認証チェック: getAdminMemberSession)
// ----------------------------------------------------

// 1. テンプレートの取得
export async function getTeacherTemplates() {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interview_templates')
      .select('*')
      .eq('teacher_id', session.memberId)
      .order('day_of_week', { ascending: true })

    if (error) throw error
    return { success: true, templates: data || [] }
  } catch (e) {
    console.error('getTeacherTemplates error:', e)
    return { success: false, error: e.message }
  }
}

// 2. テンプレートの保存 (配列で一括登録/更新)
export async function saveTeacherTemplates(templates) {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    // 既存のテンプレートを削除して差し替え
    const { error: deleteError } = await supabase
      .from('interview_templates')
      .delete()
      .eq('teacher_id', session.memberId)

    if (deleteError) throw deleteError

    if (templates && templates.length > 0) {
      const recordsToInsert = templates.map(t => ({
        teacher_id: session.memberId,
        day_of_week: parseInt(t.day_of_week, 10),
        start_time: t.start_time,
        end_time: t.end_time
      }))

      const { error: insertError } = await supabase
        .from('interview_templates')
        .insert(recordsToInsert)

      if (insertError) throw insertError
    }

    return { success: true }
  } catch (e) {
    console.error('saveTeacherTemplates error:', e)
    return { success: false, error: e.message }
  }
}

// 3. 教師用：指定期間内の全予約枠 (予約済み・空き・ブロックすべて) の取得
export async function getTeacherSlots(startDateStr, endDateStr) {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { data: slots, error: slotError } = await supabase
      .from('interview_slots')
      .select(`
        *,
        student:students(student_id_text, full_name, class_name)
      `)
      .eq('teacher_id', session.memberId)
      .gte('slot_date', startDateStr)
      .lte('slot_date', endDateStr)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (slotError) throw slotError

    return { success: true, slots: slots || [] }
  } catch (e) {
    console.error('getTeacherSlots error:', e)
    return { success: false, error: e.message }
  }
}

// 4. 曜日テンプレートに基づいた 15分刻みスロットの自動生成
export async function generateSlots(startDateStr, endDateStr) {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    // 1. 教師の全テンプレートを取得
    const { data: templates, error: tempError } = await supabase
      .from('interview_templates')
      .select('*')
      .eq('teacher_id', session.memberId)

    if (tempError) throw tempError
    if (!templates || templates.length === 0) {
      throw new Error('テンプレートが設定されていません。先にテンプレートを保存してください。')
    }

    // テンプレートを曜日(1-5)でマッピング
    const templateMap = {}
    templates.forEach(t => {
      templateMap[t.day_of_week] = t
    })

    const start = new Date(startDateStr)
    const end = new Date(endDateStr)
    const newSlots = []

    // 日付範囲を1日ずつループ
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) continue // 土日はスキップ

      const template = templateMap[dayOfWeek]
      if (!template) continue // その曜日にテンプレートがなければスキップ

      const dateStr = d.toISOString().split('T')[0]

      // 15分刻みスロット生成処理
      // 例: '09:00:00' -> 分に変換して計算
      const [sh, sm] = template.start_time.split(':').map(Number)
      const [eh, em] = template.end_time.split(':').map(Number)

      let startMinutes = sh * 60 + sm
      const endMinutes = eh * 60 + em

      while (startMinutes + 15 <= endMinutes) {
        const currentStartMin = startMinutes
        const currentEndMin = startMinutes + 15

        const formatTime = (totalMin) => {
          const h = Math.floor(totalMin / 60).toString().padStart(2, '0')
          const m = (totalMin % 60).toString().padStart(2, '0')
          return `${h}:${m}:00`
        }

        newSlots.push({
          teacher_id: session.memberId,
          slot_date: dateStr,
          start_time: formatTime(currentStartMin),
          end_time: formatTime(currentEndMin),
          status: 'available'
        })

        startMinutes += 15
      }
    }

    if (newSlots.length === 0) {
      return { success: true, count: 0, message: '生成対象の平日枠がありませんでした。' }
    }

    // 重複を無視(ON CONFLICT DO NOTHING)して一括インサート
    const { error: insertError } = await supabase
      .from('interview_slots')
      .insert(newSlots)
      .select()

    if (insertError) {
      // 一部重複によるエラー回避用（または個別upsert）
      if (!insertError.message.includes('duplicate key')) {
        throw insertError
      }
    }

    return { success: true, count: newSlots.length }
  } catch (e) {
    console.error('generateSlots error:', e)
    return { success: false, error: e.message }
  }
}

// 5. 特定スロットの個別更新 (時間変更、ステータス変更、 notes 追加等)
export async function updateSlot(slotId, data) {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('interview_slots')
      .update({
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status,
        notes: data.notes,
        student_id_text: data.student_id_text || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId)
      .eq('teacher_id', session.memberId)

    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('updateSlot error:', e)
    return { success: false, error: e.message }
  }
}

// 6. スロットの完全削除
export async function deleteSlot(slotId) {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('interview_slots')
      .delete()
      .eq('id', slotId)
      .eq('teacher_id', session.memberId)

    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('deleteSlot error:', e)
    return { success: false, error: e.message }
  }
}


// ----------------------------------------------------
// 学生側アクション (認証チェック: getStudentSession)
// ----------------------------------------------------

// 7. 教師リスト（面談対象の選択用）の取得
export async function getTeachersList() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['teacher', 'admin'])
      .order('full_name', { ascending: true })

    if (error) throw error
    return { success: true, teachers: data || [] }
  } catch (e) {
    console.error('getTeachersList error:', e)
    return { success: false, error: e.message }
  }
}

// 8. 学生用：特定の教師・日付の空き予約枠一覧の取得
export async function getAvailableSlots(teacherId, dateStr) {
  try {
    const session = await getStudentSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interview_slots')
      .select('id, start_time, end_time, status')
      .eq('teacher_id', teacherId)
      .eq('slot_date', dateStr)
      .eq('status', 'available')
      .order('start_time', { ascending: true })

    if (error) throw error
    return { success: true, slots: data || [] }
  } catch (e) {
    console.error('getAvailableSlots error:', e)
    return { success: false, error: e.message }
  }
}

// 9. 学生用：予約を実行する
export async function bookSlot(slotId, notes) {
  try {
    const session = await getStudentSession()
    if (!session || !session.studentId) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    // 予約対象枠がまだ available か検証
    const { data: slot, error: fetchError } = await supabase
      .from('interview_slots')
      .select('status')
      .eq('id', slotId)
      .single()

    if (fetchError || !slot) throw new Error('指定された枠が見つかりませんでした。')
    if (slot.status !== 'available') throw new Error('この時間枠はすでに別の予約が入ったか、予約不可になっています。')

    // 予約を更新
    const { error: updateError } = await supabase
      .from('interview_slots')
      .update({
        status: 'booked',
        student_id_text: session.studentId,
        notes: notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId)

    if (updateError) throw updateError
    return { success: true }
  } catch (e) {
    console.error('bookSlot error:', e)
    return { success: false, error: e.message }
  }
}

// 10. 学生用：自分の予約をキャンセルする
export async function cancelBooking(slotId) {
  try {
    const session = await getStudentSession()
    if (!session || !session.studentId) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    // 所有者か確認
    const { data: slot, error: fetchError } = await supabase
      .from('interview_slots')
      .select('student_id_text')
      .eq('id', slotId)
      .single()

    if (fetchError || !slot) throw new Error('予約が見つかりませんでした。')
    if (slot.student_id_text !== session.studentId) {
      throw new Error('他人の予約をキャンセルすることはできません。')
    }

    // 枠を available に戻す
    const { error: updateError } = await supabase
      .from('interview_slots')
      .update({
        status: 'available',
        student_id_text: null,
        notes: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', slotId)

    if (updateError) throw updateError
    return { success: true }
  } catch (e) {
    console.error('cancelBooking error:', e)
    return { success: false, error: e.message }
  }
}

// 11. 学生用：自分のアクティブな面談予約一覧の取得
export async function getStudentBookings() {
  try {
    const session = await getStudentSession()
    if (!session || !session.studentId) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { data: bookings, error } = await supabase
      .from('interview_slots')
      .select(`
        *,
        teacher:profiles(id, full_name)
      `)
      .eq('student_id_text', session.studentId)
      .eq('status', 'booked')
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return { success: true, bookings: bookings || [] }
  } catch (e) {
    console.error('getStudentBookings error:', e)
    return { success: false, error: e.message }
  }
}
