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
export async function getTeacherTemplates(templateName = 'デフォルト') {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interview_templates')
      .select('*')
      .eq('teacher_id', session.memberId)
      .eq('template_name', templateName)
      .order('day_of_week', { ascending: true })

    if (error) throw error
    return { success: true, templates: data || [] }
  } catch (e) {
    console.error('getTeacherTemplates error:', e)
    return { success: false, error: e.message }
  }
}

// 2. テンプレートの保存 (配列で一括登録/更新)
export async function saveTeacherTemplates(templates, templateName = 'デフォルト') {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    // 既存のテンプレートを削除して差し替え
    const { error: deleteError } = await supabase
      .from('interview_templates')
      .delete()
      .eq('teacher_id', session.memberId)
      .eq('template_name', templateName)

    if (deleteError) throw deleteError

    if (templates && templates.length > 0) {
      const recordsToInsert = templates.map(t => ({
        teacher_id: session.memberId,
        day_of_week: parseInt(t.day_of_week, 10),
        start_time: t.start_time,
        end_time: t.end_time,
        template_name: templateName
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
export async function generateSlots(startDateStr, endDateStr, templateName = 'デフォルト') {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    // 1. 指定したテンプレート名の週間テンプレートを取得
    const { data: templates, error: tempError } = await supabase
      .from('interview_templates')
      .select('*')
      .eq('teacher_id', session.memberId)
      .eq('template_name', templateName)

    if (tempError) throw tempError
    if (!templates || templates.length === 0) {
      throw new Error(`テンプレート「${templateName}」が設定されていません。先にテンプレートを保存してください。`)
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
        teacher:admin_members(id, name)
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

// 12. 学生用：自分のクラスの担任教師を取得する
export async function getStudentHomeroomTeacher() {
  try {
    const session = await getStudentSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    // 1. 所属クラスの担任教師IDと名前を取得
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('teacher_id, homeroom_teacher_name')
      .eq('name', session.className)
      .single()

    if (classError || !classData) {
      console.warn('Homeroom teacher info not found for class:', session.className)
      return { success: false, error: 'クラスの担任情報が見つかりません。' }
    }

    // 2. もし teacher_id があれば、そちらを優先して admin_members から取得
    if (classData.teacher_id) {
      const { data: teacher, error: teacherError } = await supabase
        .from('admin_members')
        .select('id, name')
        .eq('id', classData.teacher_id)
        .single()

      if (!teacherError && teacher) {
        return { 
          success: true, 
          teacher: {
            id: teacher.id,
            name: teacher.name
          }
        }
      }
    }

    // 3. teacher_id が無い、または取得できない場合で homeroom_teacher_name があれば、名前で検索
    if (classData.homeroom_teacher_name) {
      const { data: teacherByName, error: nameError } = await supabase
        .from('admin_members')
        .select('id, name')
        .eq('name', classData.homeroom_teacher_name)
        .limit(1)
      
      const foundTeacher = teacherByName && teacherByName.length > 0 ? teacherByName[0] : null

      if (!nameError && foundTeacher) {
        return { 
          success: true, 
          teacher: {
            id: foundTeacher.id,
            name: foundTeacher.name
          }
        }
      }
    }

    return { success: false, error: '担任教師が設定されていないか、教員データベースに存在しません。' }
  } catch (e) {
    console.error('getStudentHomeroomTeacher error:', e)
    return { success: false, error: e.message }
  }
}

// 13. 教師用：直近1週間の予約済み面談スロットを取得
export async function getTeacherWeeklyBookings() {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const todayStr = now.toISOString().split('T')[0]
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('interview_slots')
      .select(`*, student:students(student_id_text, full_name, class_name)`)
      .eq('teacher_id', session.memberId)
      .eq('status', 'booked')
      .gte('slot_date', todayStr)
      .lte('slot_date', nextWeekStr)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return { success: true, slots: data || [] }
  } catch (e) {
    console.error('getTeacherWeeklyBookings error:', e)
    return { success: false, error: e.message }
  }
}

// 14. 教師用ダッシュボード：当日と翌日の面談予定を取得
export async function getTeacherTodayTomorrowBookings() {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const todayStr = now.toISOString().split('T')[0]
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('interview_slots')
      .select(`*, student:students(student_id_text, full_name, class_name)`)
      .eq('teacher_id', session.memberId)
      .eq('status', 'booked')
      .in('slot_date', [todayStr, tomorrowStr])
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return { success: true, slots: data || [], todayStr, tomorrowStr }
  } catch (e) {
    console.error('getTeacherTodayTomorrowBookings error:', e)
    return { success: false, error: e.message }
  }
}

// 15. 学生用ダッシュボード：自分の今後の面談予定を取得
export async function getStudentUpcomingBookings() {
  try {
    const session = await getStudentSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const todayStr = now.toISOString().split('T')[0]
    const nextMonth = new Date(now)
    nextMonth.setDate(nextMonth.getDate() + 30)
    const nextMonthStr = nextMonth.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('interview_slots')
      .select(`*, teacher:admin_members(id, name)`)
      .eq('student_id_text', session.studentId)
      .eq('status', 'booked')
      .gte('slot_date', todayStr)
      .lte('slot_date', nextMonthStr)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5)

    if (error) throw error
    return { success: true, slots: data || [] }
  } catch (e) {
    console.error('getStudentUpcomingBookings error:', e)
    return { success: false, error: e.message }
  }
}

// 16. 教師用：フィルタ条件に応じた予約済み面談を取得
export async function getTeacherBookingsFiltered(filterType = 'weekly') {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const todayStr = now.toISOString().split('T')[0]

    let query = supabase
      .from('interview_slots')
      .select(`*, student:students(student_id_text, full_name, class_name)`)
      .eq('teacher_id', session.memberId)
      .eq('status', 'booked')

    if (filterType === 'today') {
      query = query.eq('slot_date', todayStr)
    } else if (filterType === 'weekly') {
      const nextWeek = new Date(now)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = nextWeek.toISOString().split('T')[0]
      query = query.gte('slot_date', todayStr).lte('slot_date', nextWeekStr)
    } else {
      // 'all' (本日以降の全予約を取得)
      query = query.gte('slot_date', todayStr)
    }

    const { data, error } = await query
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return { success: true, slots: data || [] }
  } catch (e) {
    console.error('getTeacherBookingsFiltered error:', e)
    return { success: false, error: e.message }
  }
}

// 17. 教師用：登録されているユニークなテンプレート名の一覧を取得する
export async function getTeacherTemplateNames() {
  try {
    const session = await getAdminMemberSession()
    if (!session) throw new Error('Unauthorized')

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('interview_templates')
      .select('template_name')
      .eq('teacher_id', session.memberId)

    if (error) throw error

    // ユニークな名前のリストを生成（デフォルトは必ず含める）
    const names = Array.from(new Set((data || []).map(d => d.template_name)))
    if (!names.includes('デフォルト')) {
      names.unshift('デフォルト')
    }
    return { success: true, templateNames: names }
  } catch (e) {
    console.error('getTeacherTemplateNames error:', e)
    return { success: false, error: e.message }
  }
}
