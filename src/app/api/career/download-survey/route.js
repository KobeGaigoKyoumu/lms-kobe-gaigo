import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { cookies } from 'next/headers'
import { careerSurveyTemplateBase64 } from '@/templates/career_survey_template_base64'

export async function GET(request) {
    try {
        // 1. 権限チェック（直接cookieから読み取り）
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('kobe_admin_member')
        if (!sessionCookie || !sessionCookie.value) {
            return new Response('Unauthorized', { status: 401 })
        }
        let session = null
        try {
            const json = Buffer.from(sessionCookie.value, 'base64').toString('utf8')
            session = JSON.parse(json)
        } catch (e) {
            return new Response('Unauthorized', { status: 401 })
        }
        if (!session || !session.memberId) {
            return new Response('Unauthorized', { status: 401 })
        }

        // 2. クエリパラメータの取得
        const { searchParams } = new URL(request.url)
        const className = searchParams.get('class')

        if (!className || className === 'all') {
            return new Response('Invalid class parameter', { status: 400 })
        }

        // 3. Supabase接続
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response('Supabase config missing', { status: 500 })
        }
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 4. クラスの active 学生一覧を取得
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('student_id_text, full_name, class_name')
            .eq('class_name', className)
            .eq('status', 'active')
            .order('student_id_text', { ascending: true })

        if (studentError) {
            console.error('Fetch students error:', studentError)
            return new Response('Error fetching students', { status: 500 })
        }

        if (!students || students.length === 0) {
            return new Response('No active students found in this class', { status: 404 })
        }

        const studentIds = students.map(s => s.student_id_text)

        // 5. 対象学生の進路希望情報を取得
        const { data: careerInfos, error: careerError } = await supabase
            .from('student_career_info')
            .select('*')
            .in('student_id', studentIds)

        if (careerError) {
            console.error('Fetch career info error:', careerError)
            return new Response('Error fetching career info', { status: 500 })
        }

        const careerMap = new Map(careerInfos?.map(info => [info.student_id, info]) || [])

        // 6. テンプレートExcelファイルをBase64からメモリ上で読み込み
        const workbook = new ExcelJS.Workbook()
        const templateBuffer = Buffer.from(careerSurveyTemplateBase64, 'base64')
        await workbook.xlsx.load(templateBuffer)

        const ws1 = workbook.getWorksheet('2025')
        const ws2 = workbook.getWorksheet('名簿2025')

        if (!ws1 || !ws2) {
            return new Response('Invalid Excel template structure', { status: 500 })
        }

        const N = students.length

        // 7. Sheet 1 ('2025') のデータ上書き
        students.forEach((student, targetIdx) => {
            const startRow = targetIdx * 24
            const info = careerMap.get(student.student_id_text)

            // 基本情報の書き込み
            // クラス (C2) -> Row: startRow + 2, Col: 3
            ws1.getCell(startRow + 2, 3).value = student.class_name || ''
            // 氏名 (F2) -> Row: startRow + 2, Col: 6
            ws1.getCell(startRow + 2, 6).value = student.full_name || ''
            // 出席番号 (Q1) -> Row: startRow + 1, Col: 17
            ws1.getCell(startRow + 1, 17).value = targetIdx + 1

            if (info) {
                // 記入日 (N2) -> Row: startRow + 2, Col: 14
                let filledDate = ''
                if (info.filled_at) {
                    filledDate = info.filled_at.replace(/-/g, '/')
                } else if (info.updated_at) {
                    filledDate = info.updated_at.split('T')[0].replace(/-/g, '/')
                }
                ws1.getCell(startRow + 2, 14).value = filledDate

                // 進路区分 (C3) -> Row: startRow + 3, Col: 3
                ws1.getCell(startRow + 3, 3).value = info.path_type || ''

                // 第一希望校 (F5) -> Row: startRow + 5, Col: 6
                ws1.getCell(startRow + 5, 6).value = info.first_choice_school || ''
                // 第一希望理由 (M5) -> Row: startRow + 5, Col: 13
                ws1.getCell(startRow + 5, 13).value = info.first_choice_reason || ''
                // 第一希望学科等 (F6) -> Row: startRow + 6, Col: 6
                ws1.getCell(startRow + 6, 6).value = info.first_choice_department || ''

                // 第二希望校 (F7) -> Row: startRow + 7, Col: 6
                ws1.getCell(startRow + 7, 6).value = info.second_choice_school || ''
                // 第二希望理由 (M7) -> Row: startRow + 7, Col: 13
                ws1.getCell(startRow + 7, 13).value = info.second_choice_reason || ''
                // 第二希望学科等 (F8) -> Row: startRow + 8, Col: 6
                ws1.getCell(startRow + 8, 6).value = info.second_choice_department || ''

                // 第三希望校 (F9) -> Row: startRow + 9, Col: 6
                ws1.getCell(startRow + 9, 6).value = info.third_choice_school || ''
                // 第三希望理由 (M9) -> Row: startRow + 9, Col: 13
                ws1.getCell(startRow + 9, 13).value = info.third_choice_reason || ''
                // 第三希望学科等 (F10) -> Row: startRow + 10, Col: 6
                ws1.getCell(startRow + 10, 6).value = info.third_choice_department || ''

                // 希望分野 (F12) -> Row: startRow + 12, Col: 6
                ws1.getCell(startRow + 12, 6).value = info.preferred_field || ''
                // 希望地域 (F13) -> Row: startRow + 13, Col: 6
                ws1.getCell(startRow + 13, 6).value = info.preferred_region || ''
                // 引っ越しの可否 (F14) -> Row: startRow + 14, Col: 6
                ws1.getCell(startRow + 14, 6).value = info.can_move || ''

                // 学費準備可能額 (F16) -> Row: startRow + 16, Col: 6
                ws1.getCell(startRow + 16, 6).value = info.tuition_budget || ''

                // 両親による学費の援助可否 (F17) -> Row: startRow + 17, Col: 6
                let parentSupportText = ''
                if (info.parent_support) {
                    parentSupportText = info.parent_support
                    if (info.parent_support === '可' && info.parent_support_amount) {
                        parentSupportText += ` (経費支弁額: ${info.parent_support_amount})`
                    }
                }
                ws1.getCell(startRow + 17, 6).value = parentSupportText

                // 進学先卒業後の予定 (F19) -> Row: startRow + 19, Col: 6
                ws1.getCell(startRow + 19, 6).value = info.post_grad_plans || ''

                // その他（心配に思っていることなど） (F20) -> Row: startRow + 20, Col: 6
                let otherText = ''
                if (info.passbook_updated || info.pay_slips_available) {
                    otherText += `【確認事項】 通帳記帳: ${info.passbook_updated || '未回答'} / アルバイト給与明細: ${info.pay_slips_available || '未回答'}\n`
                    otherText += `--------------------------------------------------\n`
                }
                otherText += info.teacher_questions || ''
                ws1.getCell(startRow + 20, 6).value = otherText
            } else {
                // 回答データがない場合
                ws1.getCell(startRow + 2, 14).value = ''
                ws1.getCell(startRow + 3, 3).value = ''
                ws1.getCell(startRow + 5, 6).value = ''
                ws1.getCell(startRow + 5, 13).value = ''
                ws1.getCell(startRow + 6, 6).value = ''
                ws1.getCell(startRow + 7, 6).value = ''
                ws1.getCell(startRow + 7, 13).value = ''
                ws1.getCell(startRow + 8, 6).value = ''
                ws1.getCell(startRow + 9, 6).value = ''
                ws1.getCell(startRow + 9, 13).value = ''
                ws1.getCell(startRow + 10, 6).value = ''
                ws1.getCell(startRow + 12, 6).value = ''
                ws1.getCell(startRow + 13, 6).value = ''
                ws1.getCell(startRow + 14, 6).value = '可　・　不可'
                ws1.getCell(startRow + 16, 6).value = ''
                ws1.getCell(startRow + 17, 6).value = '可　・　不可'
                ws1.getCell(startRow + 19, 6).value = ''
                ws1.getCell(startRow + 20, 6).value = ''
            }
        })

        // N人分より下の不要行を消去
        if (ws1.rowCount > N * 24) {
            ws1.spliceRows(N * 24 + 1, ws1.rowCount - N * 24)
        }

        // 8. Sheet 2 ('名簿2025') のデータ上書き
        students.forEach((student, targetIdx) => {
            // 学籍番号
            ws2.getCell(targetIdx + 1, 1).value = student.student_id_text || ''
            // クラス
            ws2.getCell(targetIdx + 1, 2).value = student.class_name || ''
            // 出席番号
            ws2.getCell(targetIdx + 1, 3).value = targetIdx + 1
            // 氏名
            ws2.getCell(targetIdx + 1, 4).value = student.full_name || ''
        })

        // N人分より下の不要行を消去
        if (ws2.rowCount > N) {
            ws2.spliceRows(N + 1, ws2.rowCount - N)
        }

        // 9. 編集されたExcelの書き出し
        const buffer = await workbook.xlsx.writeBuffer()

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename=career_survey_${encodeURIComponent(className)}.xlsx`,
                'Cache-Control': 'no-store, max-age=0'
            }
        })

    } catch (error) {
        console.error('Download API error:', error)
        return new Response(error.message || 'Internal Server Error', { status: 500 })
    }
}
