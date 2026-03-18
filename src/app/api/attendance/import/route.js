import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

// Service Role Client to bypass RLS (same as main route.js)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request) {
    try {
        // Use server client for auth check only
        const authClient = await createServerClient()

        // 認証チェック
        const { data: { user } } = await authClient.auth.getUser()
        const adminMember = await getAdminMemberSession()

        let isAuthorized = false

        if (user) {
            // 管理者チェック (Supabase Auth)
            const { data: profile } = await authClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            
            if (profile?.role === 'admin') {
                isAuthorized = true
            }
        }

        // adminMemberセッションがあれば許可
        if (!isAuthorized && adminMember) {
            isAuthorized = true
        }

        if (!isAuthorized) {
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

        // データを解析（ヘッダー行をスキップするため、学籍番号が数値の行のみ処理）
        const records = []
        const currentYear = new Date().getFullYear()
        const currentMonth = new Date().getMonth() + 1

        for (let i = 0; i < data.length; i++) {
            const row = data[i]
            if (!row || !row[2]) continue

            const studentIdRaw = row[2]
            // 学籍番号が数値（または数値文字列）かどうかをチェック
            const studentId = String(studentIdRaw).trim()

            // ヘッダー行や非数値行をスキップ
            if (!/^\d+$/.test(studentId)) {
                continue
            }

            const attendanceRate = row[11]
            // 出席率も数値チェック（ヘッダー行の'日数'などをスキップ）
            if (typeof attendanceRate !== 'number' && isNaN(parseFloat(attendanceRate))) {
                continue
            }

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

            // 各フィールドを安全にパース
            const parseNum = (val) => {
                if (typeof val === 'number') return val
                const parsed = parseFloat(val)
                return isNaN(parsed) ? 0 : parsed
            }

            records.push({
                student_id: studentId,
                student_name: row[3] ? String(row[3]) : '',
                gender: row[4] ? String(row[4]) : '',
                nationality: row[5] ? String(row[5]) : '',
                year: year,
                month: month,
                is_cumulative: isCumulative,
                attendance_days: parseNum(row[6]),
                absence_days: parseNum(row[7]),
                attendance_slots: parseNum(row[8]),
                late_slots: parseNum(row[9]),
                absence_slots: parseNum(row[10]),
                attendance_rate: parseNum(attendanceRate),
                grade: grade,
                class_code: classCode
            })
        }

        if (records.length === 0) {
            return NextResponse.json({ error: '有効なデータが見つかりません。学籍番号列（C列）に数値データがあることを確認してください。' }, { status: 400 })
        }

        // Use Service Client for DB operations to bypass RLS
        // 既存データを削除してから挿入
        const { error: deleteError } = await serviceClient
            .from('attendance_records')
            .delete()
            .eq('year', year)
            .eq('month', month)
            .eq('is_cumulative', isCumulative)

        if (deleteError) throw deleteError

        // データを挿入（バッチ処理）
        const BATCH_SIZE = 500
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE)
            const { error: insertError } = await serviceClient
                .from('attendance_records')
                .insert(batch)

            if (insertError) throw insertError
        }

        // キャッシュを無効化
        revalidateTag('attendance-files')
        revalidateTag('attendance-stats')

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
