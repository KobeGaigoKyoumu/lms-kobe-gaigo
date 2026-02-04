import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const dynamic = 'force-dynamic'

/**
 * 毎年4月1日に実行される進級・卒業処理
 * - 2年生を「卒業生」ステータスに変更する
 */
export async function GET(request) {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    try {
        const now = new Date()
        const month = now.getMonth() + 1
        const date = now.getDate()

        // 4月1日以外は実行しない（手動実行用のクエリパラメータがない場合）
        const isTargetDay = month === 4 && date === 1
        const force = new URL(request.url).searchParams.get('force') === 'true'

        if (!isTargetDay && !force) {
            return NextResponse.json({
                success: true,
                message: '今日は処理対象日（4月1日）ではありません。',
                date: `${month}/${date}`
            })
        }

        const year = now.getFullYear()

        // 1. 全在籍学生を取得
        const { data: students, error: fetchError } = await supabase
            .from('students')
            .select('student_id_text, status')
            .eq('status', 'active')

        if (fetchError) throw fetchError

        // 2. 卒業判定が必要な学生を抽出
        // 学籍番号のルールに基づき、3月31日時点で Grade が 3 (卒業) になる学生を特定
        const graduates = students.filter(s => {
            const enrollmentYearShort = parseInt(s.student_id_text.substring(0, 2), 10)
            const enrollmentYear = 2000 + enrollmentYearShort
            // 3月31日の進級処理： academicYear = currentYear
            const academicYear = year
            const grade = academicYear - enrollmentYear + 1
            return grade > 2
        })

        if (graduates.length === 0) {
            return NextResponse.json({ success: true, message: '卒業対象の学生はいませんでした。' })
        }

        // 3. ステータスと年度（学年）を一括更新
        const graduateIds = graduates.map(g => g.student_id_text)
        const { error: updateError } = await supabase
            .from('students')
            .update({
                status: 'graduated',
                academic_year: year - 2 // これにより計算上のGradeが0（非在籍者）になります
            })
            .in('student_id_text', graduateIds)

        if (updateError) throw updateError

        return NextResponse.json({
            success: true,
            message: `${graduates.length}名を卒業生（graduated）に更新しました。`,
            count: graduates.length
        })

    } catch (error) {
        console.error('Grade Promotion Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
