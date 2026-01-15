import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)

        const type = searchParams.get('type') || 'school'
        const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : null
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : null
        const cumulative = searchParams.get('cumulative') === 'true'
        const studentId = searchParams.get('studentId')
        const search = searchParams.get('search')

        // 利用可能な年月データを取得
        if (type === 'files') {
            // 月別データの年月を取得（Supabaseのデフォルト1000行制限を回避）
            const { data: monthlyRaw, error: monthlyError } = await supabase
                .from('attendance_records')
                .select('year, month')
                .eq('is_cumulative', false)
                .range(0, 49999)

            // 累計データの年月を取得
            const { data: cumulativeRaw, error: cumulativeError } = await supabase
                .from('attendance_records')
                .select('year, month')
                .eq('is_cumulative', true)
                .range(0, 49999)

            if (monthlyError || cumulativeError) throw monthlyError || cumulativeError

            // ユニークな組み合わせを抽出しソート
            const monthlySet = new Set()
            const cumulativeSet = new Set()

            monthlyRaw?.forEach(item => {
                monthlySet.add(`${item.year}-${item.month}`)
            })

            cumulativeRaw?.forEach(item => {
                cumulativeSet.add(`${item.year}-${item.month}`)
            })

            const monthlyFiles = Array.from(monthlySet).map(key => {
                const [year, month] = key.split('-')
                return { year: parseInt(year), month: parseInt(month) }
            }).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year
                return b.month - a.month
            })

            const cumulativeFiles = Array.from(cumulativeSet).map(key => {
                const [year, month] = key.split('-')
                return { year: parseInt(year), month: parseInt(month) }
            }).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year
                return b.month - a.month
            })

            return NextResponse.json({ monthlyFiles, cumulativeFiles })
        }

        // 最新の年月を取得
        let targetYear = year
        let targetMonth = month

        if (!targetYear || !targetMonth) {
            const { data: latestData } = await supabase
                .from('attendance_records')
                .select('year, month')
                .eq('is_cumulative', cumulative)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .limit(1)
                .single()

            if (latestData) {
                targetYear = latestData.year
                targetMonth = latestData.month
            }
        }

        // 学校全体の統計
        if (type === 'school') {
            const { data: students, error } = await supabase
                .from('attendance_records')
                .select('attendance_rate')
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)

            if (error) throw error

            if (!students || students.length === 0) {
                return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 })
            }

            const rates = students.map(s => parseFloat(s.attendance_rate))
            const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length
            const sortedRates = rates.sort((a, b) => a - b)

            return NextResponse.json({
                totalStudents: students.length,
                averageRate: avgRate,
                minRate: sortedRates[0],
                maxRate: sortedRates[sortedRates.length - 1],
                year: targetYear,
                month: targetMonth,
                isCumulative: cumulative
            })
        }

        // 学年別の統計
        if (type === 'grade') {
            const { data: students, error } = await supabase
                .from('attendance_records')
                .select('grade, attendance_rate')
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)

            if (error) throw error

            // 学年ごとに集計
            const gradeGroups = {}
            students?.forEach(s => {
                if (!gradeGroups[s.grade]) {
                    gradeGroups[s.grade] = []
                }
                gradeGroups[s.grade].push(parseFloat(s.attendance_rate))
            })

            const grades = Object.keys(gradeGroups).map(grade => {
                const gradeNum = parseInt(grade)
                const rates = gradeGroups[grade]
                return {
                    grade: gradeNum,
                    gradeName: gradeNum === 0 ? '非在籍者' : `${gradeNum}年生`,
                    studentCount: rates.length,
                    averageRate: rates.reduce((sum, r) => sum + r, 0) / rates.length
                }
            }).sort((a, b) => {
                // 非在籍者（grade=0）は最後に
                if (a.grade === 0) return 1
                if (b.grade === 0) return -1
                return a.grade - b.grade
            })

            return NextResponse.json({
                grades,
                year: targetYear,
                month: targetMonth,
                isCumulative: cumulative
            })
        }

        // クラス別の統計
        if (type === 'class') {
            const { data: students, error } = await supabase
                .from('attendance_records')
                .select('grade, class_code, attendance_rate')
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)

            if (error) throw error

            // クラスごとに集計
            const classGroups = {}
            students?.forEach(s => {
                const key = `${s.grade}-${s.class_code}`
                if (!classGroups[key]) {
                    classGroups[key] = {
                        grade: s.grade,
                        classCode: s.class_code,
                        rates: []
                    }
                }
                classGroups[key].rates.push(parseFloat(s.attendance_rate))
            })

            const classes = Object.values(classGroups).map(cls => {
                return {
                    grade: cls.grade,
                    classCode: cls.classCode,
                    className: cls.classCode || '未設定',  // class_codeをそのまま表示
                    studentCount: cls.rates.length,
                    averageRate: cls.rates.reduce((sum, r) => sum + r, 0) / cls.rates.length
                }
            }).sort((a, b) => {
                if (a.grade !== b.grade) return a.grade - b.grade
                return (a.classCode || '').localeCompare(b.classCode || '')
            })

            return NextResponse.json({
                classes,
                year: targetYear,
                month: targetMonth,
                isCumulative: cumulative
            })
        }

        // 個別学生データ
        if (type === 'individual') {
            // 特定の学生の全期間データ
            if (studentId) {
                const { data: monthlyData, error: monthlyError } = await supabase
                    .from('attendance_records')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('is_cumulative', false)
                    .order('year', { ascending: true })
                    .order('month', { ascending: true })

                const { data: cumulativeData, error: cumError } = await supabase
                    .from('attendance_records')
                    .select('*')
                    .eq('student_id', studentId)
                    .eq('is_cumulative', true)
                    .order('year', { ascending: true })
                    .order('month', { ascending: true })

                if (monthlyError || cumError) throw monthlyError || cumError

                return NextResponse.json({
                    monthlyData: monthlyData || [],
                    cumulativeData: cumulativeData || []
                })
            }

            // 学生検索
            let query = supabase
                .from('attendance_records')
                .select('*')
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)

            if (search) {
                query = query.or(`student_id.ilike.%${search}%,student_name.ilike.%${search}%`)
            }

            const { data: students, error } = await query
                .order('student_id', { ascending: true })
                .limit(100)

            if (error) throw error

            return NextResponse.json({
                students: students || [],
                year: targetYear,
                month: targetMonth,
                isCumulative: cumulative
            })
        }

        return NextResponse.json({ error: '不正なリクエスト' }, { status: 400 })

    } catch (error) {
        console.error('Attendance API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
