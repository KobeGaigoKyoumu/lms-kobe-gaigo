import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'

export async function GET(request) {
    try {
        // 1. 権限チェック
        const session = await getAdminMemberSession()
        if (!session) {
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

        // 6. テンプレートExcelファイルを読み込み
        const templatePath = path.join(process.cwd(), 'public', 'templates', '全学生進路希望調査票2025.xlsx')
        if (!fs.existsSync(templatePath)) {
            return new Response('Excel template file not found', { status: 500 })
        }

        const wb = XLSX.readFile(templatePath)
        const ws1 = wb.Sheets['2025']
        const ws2 = wb.Sheets['名簿2025']

        if (!ws1 || !ws2) {
            return new Response('Invalid Excel template structure', { status: 500 })
        }

        const N = students.length

        // 7. Sheet 1 ('2025') のデータ上書き
        students.forEach((student, targetIdx) => {
            const startRow = targetIdx * 24
            const info = careerMap.get(student.student_id_text)

            // 基本情報の書き込み
            // クラス (C2)
            ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 2 })] = { t: 's', v: student.class_name || '' }
            // 氏名 (F2)
            ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 5 })] = { t: 's', v: student.full_name || '' }
            // 出席番号 (Q1)
            ws1[XLSX.utils.encode_cell({ r: startRow, c: 16 })] = { t: 'n', v: targetIdx + 1 }

            if (info) {
                // 記入日 (N2)
                let filledDate = ''
                if (info.filled_at) {
                    filledDate = info.filled_at.replace(/-/g, '/')
                } else if (info.updated_at) {
                    filledDate = info.updated_at.split('T')[0].replace(/-/g, '/')
                }
                ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 13 })] = { t: 's', v: filledDate }

                // 進路区分 (C3)
                ws1[XLSX.utils.encode_cell({ r: startRow + 2, c: 2 })] = { t: 's', v: info.path_type || '' }

                // 第一希望校 (F5)
                ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 5 })] = { t: 's', v: info.first_choice_school || '' }
                // 第一希望理由 (M5)
                ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 12 })] = { t: 's', v: info.first_choice_reason || '' }
                // 第一希望学科等 (F6)
                ws1[XLSX.utils.encode_cell({ r: startRow + 5, c: 5 })] = { t: 's', v: info.first_choice_department || '' }

                // 第二希望校 (F7)
                ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 5 })] = { t: 's', v: info.second_choice_school || '' }
                // 第二希望理由 (M7)
                ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 12 })] = { t: 's', v: info.second_choice_reason || '' }
                // 第二希望学科等 (F8)
                ws1[XLSX.utils.encode_cell({ r: startRow + 7, c: 5 })] = { t: 's', v: info.second_choice_department || '' }

                // 第三希望校 (F9)
                ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 5 })] = { t: 's', v: info.third_choice_school || '' }
                // 第三希望理由 (M9)
                ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 12 })] = { t: 's', v: info.third_choice_reason || '' }
                // 第三希望学科等 (F10)
                ws1[XLSX.utils.encode_cell({ r: startRow + 9, c: 5 })] = { t: 's', v: info.third_choice_department || '' }

                // 希望分野 (F12)
                ws1[XLSX.utils.encode_cell({ r: startRow + 11, c: 5 })] = { t: 's', v: info.preferred_field || '' }
                // 希望地域 (F13)
                ws1[XLSX.utils.encode_cell({ r: startRow + 12, c: 5 })] = { t: 's', v: info.preferred_region || '' }
                // 引っ越しの可否 (F14)
                ws1[XLSX.utils.encode_cell({ r: startRow + 13, c: 5 })] = { t: 's', v: info.can_move || '' }

                // 学費準備可能額 (F16)
                ws1[XLSX.utils.encode_cell({ r: startRow + 15, c: 5 })] = { t: 's', v: info.tuition_budget || '' }

                // 両親による学費の援助可否 (F17)
                let parentSupportText = ''
                if (info.parent_support) {
                    parentSupportText = info.parent_support
                    if (info.parent_support === '可' && info.parent_support_amount) {
                        parentSupportText += ` (経費支弁額: ${info.parent_support_amount})`
                    }
                }
                ws1[XLSX.utils.encode_cell({ r: startRow + 16, c: 5 })] = { t: 's', v: parentSupportText }

                // 進学先卒業後の予定 (F19)
                ws1[XLSX.utils.encode_cell({ r: startRow + 18, c: 5 })] = { t: 's', v: info.post_grad_plans || '' }

                // その他（心配に思っていることなど） (F20)
                let otherText = ''
                if (info.passbook_updated || info.pay_slips_available) {
                    otherText += `【確認事項】 通帳記帳: ${info.passbook_updated || '未回答'} / アルバイト給与明細: ${info.pay_slips_available || '未回答'}\n`
                    otherText += `--------------------------------------------------\n`
                }
                otherText += info.teacher_questions || ''
                ws1[XLSX.utils.encode_cell({ r: startRow + 19, c: 5 })] = { t: 's', v: otherText }
            } else {
                // 回答データがない場合、日付は空に
                ws1[XLSX.utils.encode_cell({ r: startRow + 1, c: 13 })] = { t: 's', v: '' }
                // 進路区分は「進学・就職・帰国」のプレースホルダーを空にするかそのままに
                ws1[XLSX.utils.encode_cell({ r: startRow + 2, c: 2 })] = { t: 's', v: '' }
                
                // それ以外の入力欄も空に
                ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 4, c: 12 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 5, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 6, c: 12 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 7, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 8, c: 12 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 9, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 11, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 12, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 13, c: 5 })] = { t: 's', v: '可　・　不可' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 15, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 16, c: 5 })] = { t: 's', v: '可　・　不可' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 18, c: 5 })] = { t: 's', v: '' }
                ws1[XLSX.utils.encode_cell({ r: startRow + 19, c: 5 })] = { t: 's', v: '' }
            }
        })

        // N人分より下の不要セルを消去
        Object.keys(ws1).forEach(addr => {
            if (!addr.startsWith('!')) {
                const cell = XLSX.utils.decode_cell(addr)
                if (cell.r >= N * 24) {
                    delete ws1[addr]
                }
            }
        })

        // マージ範囲のクリーンアップ
        if (ws1['!merges']) {
            ws1['!merges'] = ws1['!merges'].filter(m => m.s.r < N * 24)
        }

        // 範囲 (ref) の再設定
        ws1['!ref'] = XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: N * 24 - 1, c: 19 } // A1 から T列まで
        })

        // 8. Sheet 2 ('名簿2025') のデータ上書き
        students.forEach((student, targetIdx) => {
            // 学籍番号
            ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 0 })] = { t: 's', v: student.student_id_text || '' }
            // クラス
            ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 1 })] = { t: 's', v: student.class_name || '' }
            // 出席番号
            ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 2 })] = { t: 'n', v: targetIdx + 1 }
            // 氏名
            ws2[XLSX.utils.encode_cell({ r: targetIdx, c: 3 })] = { t: 's', v: student.full_name || '' }
        })

        // N人分より下の不要セルを消去
        Object.keys(ws2).forEach(addr => {
            if (!addr.startsWith('!')) {
                const cell = XLSX.utils.decode_cell(addr)
                if (cell.r >= N) {
                    delete ws2[addr]
                }
            }
        })

        // 名簿シートの範囲再設定
        ws2['!ref'] = XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: N - 1, c: 3 }
        })

        // 9. 編集されたExcelの書き出し
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

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
