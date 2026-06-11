import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'
import { cookies } from 'next/headers'
import { careerSurveyTemplateBase64 } from '@/templates/career_survey_template_base64'

const addManYen = (val) => {
    if (!val) return ''
    const s = String(val).trim()
    if (s === '可' || s === '不可' || s === '可　・　不可') return s
    if (s.endsWith('万円') || s.endsWith('万')) {
        return s
    }
    return `${s}万円`
}

const applyRowStylesAndMerge = (ws, startRow) => {
    const rowsToMerge = [18, 19, 20, 21];
    const borderStyle = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    
    rowsToMerge.forEach(rNum => {
        const actualRow = startRow + rNum;
        
        try {
            ws.mergeCells(`A${actualRow}:E${actualRow}`);
        } catch (e) {}
        
        try {
            ws.mergeCells(`F${actualRow}:P${actualRow}`);
        } catch (e) {}
        
        for (let col = 1; col <= 5; col++) {
            const cell = ws.getCell(actualRow, col);
            cell.border = borderStyle;
            cell.font = { name: 'MS Mincho', size: 10, bold: false };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
        
        for (let col = 6; col <= 16; col++) {
            const cell = ws.getCell(actualRow, col);
            cell.border = borderStyle;
            cell.font = { name: 'MS Mincho', size: 10 };
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }
        
        // 改ページの位置ずれを防ぐため、その他行(行21)の高さは45ptに抑え、通常の行は30ptとします
        ws.getRow(actualRow).height = (rNum === 21) ? 45 : 30;
    });
};

const setReasonAlignment = (ws, startRow) => {
    [5, 7, 9].forEach(r => {
        const cell = ws.getCell(startRow + r, 13);
        cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
    });
};

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

            // セルの結合と罫線・スタイル・行高さの設定を適用 (行18〜21)
            applyRowStylesAndMerge(ws1, startRow)

            // 項目ラベルの書き換え (A18〜A21)
            ws1.getCell(startRow + 18, 1).value = '給与が入る通帳への記帳'
            ws1.getCell(startRow + 19, 1).value = '来日から現在までの給与明細'
            ws1.getCell(startRow + 20, 1).value = '進学先卒業後の予定'
            ws1.getCell(startRow + 21, 1).value = 'その他（心配に思っていることなど）'

            // 「理由」セルの折り返し表示を設定
            setReasonAlignment(ws1, startRow)

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
                ws1.getCell(startRow + 16, 6).value = addManYen(info.tuition_budget)

                // 両親による学費の援助可否 (F17) -> Row: startRow + 17, Col: 6
                let parentSupportText = ''
                if (info.parent_support) {
                    parentSupportText = info.parent_support
                    if (info.parent_support === '可' && info.parent_support_amount) {
                        const amountStr = addManYen(info.parent_support_amount)
                        parentSupportText += ` (経費支弁額: ${amountStr})`
                    }
                }
                ws1.getCell(startRow + 17, 6).value = parentSupportText

                // 給与が入る通帳への記帳 (F18) -> Row: startRow + 18, Col: 6
                ws1.getCell(startRow + 18, 6).value = `通帳記帳：${info.passbook_updated || '未回答'}`

                // 来日から現在までの給与明細 (F19) -> Row: startRow + 19, Col: 6
                ws1.getCell(startRow + 19, 6).value = `給与明細：${info.pay_slips_available || '未回答'}`

                // 進学先卒業後の予定 (F20) -> Row: startRow + 20, Col: 6
                ws1.getCell(startRow + 20, 6).value = info.post_grad_plans || ''

                // その他（心配に思っていることなど） (F21) -> Row: startRow + 21, Col: 6
                ws1.getCell(startRow + 21, 6).value = info.teacher_questions || ''
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
                ws1.getCell(startRow + 18, 6).value = '通帳記帳：未回答'
                ws1.getCell(startRow + 19, 6).value = '給与明細：未回答'
                ws1.getCell(startRow + 20, 6).value = ''
                ws1.getCell(startRow + 21, 6).value = ''
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
