import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function POST(request) {
    try {
        const supabase = await createClient()

        // 認証チェック
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
        }

        // 管理者チェック
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get('file')
        const year = parseInt(formData.get('year'))
        const month = parseInt(formData.get('month'))
        const isCumulative = formData.get('cumulative') === 'true'

        if (!file || !year || !month) {
            return NextResponse.json({ error: 'ファイル、年、月が必要です' }, { status: 400 })
        }

        // Excelファイルを読み込む
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // データを解析（4行目からがデータ）
        const records = []
        const currentYear = new Date().getFullYear()
        const currentMonth = new Date().getMonth() + 1

        for (let i = 3; i < data.length; i++) {
            const row = data[i]
            if (row && row[2]) { // 学籍番号がある行のみ
                const studentId = String(row[2])
                const attendanceRate = row[11] || 0

                // 学年を学籍番号から判定
                const enrollmentYear = 2000 + parseInt(studentId.substring(0, 2))
                let grade
                if (currentMonth >= 4) {
                    grade = currentYear - enrollmentYear + 1
                } else {
                    grade = currentYear - enrollmentYear
                }

                // クラスコード
                const classCode = studentId.substring(2, 4)

                records.push({
                    student_id: studentId,
                    student_name: row[3] || '',
                    gender: row[4] || '',
                    nationality: row[5] || '',
                    year: year,
                    month: month,
                    is_cumulative: isCumulative,
                    attendance_days: row[6] || 0,
                    absence_days: row[7] || 0,
                    attendance_slots: row[8] || 0,
                    late_slots: row[9] || 0,
                    absence_slots: row[10] || 0,
                    attendance_rate: typeof attendanceRate === 'number' ? attendanceRate : parseFloat(attendanceRate) || 0,
                    grade: grade,
                    class_code: classCode
                })
            }
        }

        if (records.length === 0) {
            return NextResponse.json({ error: '有効なデータが見つかりません' }, { status: 400 })
        }

        // 既存データを削除してから挿入
        const { error: deleteError } = await supabase
            .from('attendance_records')
            .delete()
            .eq('year', year)
            .eq('month', month)
            .eq('is_cumulative', isCumulative)

        if (deleteError) throw deleteError

        // データを挿入
        const { error: insertError } = await supabase
            .from('attendance_records')
            .insert(records)

        if (insertError) throw insertError

        return NextResponse.json({
            success: true,
            message: `${records.length}件のデータをインポートしました`,
            count: records.length
        })

    } catch (error) {
        console.error('Import Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
