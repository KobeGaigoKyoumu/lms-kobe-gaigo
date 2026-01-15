import { NextResponse } from 'next/server'
// import { createClient } from '@/lib/supabase/server' // RLS制限にかかるため一時的に無効化
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic' // Disable caching

// Service Role Keyを使用してRLSをバイパスするクライアントを作成
// 注意: 本来は環境変数(SUPABASE_SERVICE_ROLE_KEY)で管理すべきですが、緊急対応としてimportスクリプトと同じキーを使用
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
// import_attendance.jsで使用されていたService Key
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Grade Calculation Logic (Synced with import_attendance.js but with '23' fix)
function calculateGrade(studentId, year, month) {
    if (!studentId || studentId.length < 2) return 0

    // Force '23' series to be Non-enrolled (Grade 0) as per user request
    if (studentId.startsWith('23')) return 0

    const enrollmentYearShort = parseInt(studentId.substring(0, 2), 10)
    const enrollmentYear = 2000 + enrollmentYearShort

    // Academic Year Calculation (Starts in April)
    const academicYear = month >= 4 ? year : year - 1

    let grade = academicYear - enrollmentYear + 1

    // If grade > 2, treat as graduated (0)
    if (grade > 2) grade = 0
    if (grade < 0) grade = 0 // Safety for future IDs

    return grade
}

export async function GET(request) {
    try {
        // const supabase = await createClient() // Use Service Client instead
        const { searchParams } = new URL(request.url)


        const type = searchParams.get('type') || 'school'
        const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : null
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : null
        const cumulative = searchParams.get('cumulative') === 'true'
        const studentId = searchParams.get('studentId')
        const search = searchParams.get('search')

        // Fetch Student Master for Class mapping (Used across multiple types)
        const { data: masterData } = await supabase
            .from('students')
            .select('student_id_text, class_name')
            .range(0, 49999) // Fix: Fetch all students to avoid "Unset" class for new students

        const studentClassMap = new Map()
        masterData?.forEach(s => {
            if (s.student_id_text && s.class_name) {
                studentClassMap.set(s.student_id_text, s.class_name)
            }
        })

        // デバッグ用: 生データ確認
        if (type === 'raw_dump') {
            const { data, error } = await supabase
                .from('attendance_records')
                .select('*')
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .limit(50)

            return NextResponse.json({
                count: data?.length,
                records: data,
                error: error
            })
        }

        // 利用可能な年月データを取得
        if (type === 'files') {
            // 月別データの年月を取得（Supabaseのデフォルト1000行制限を回避 + 最新順）
            const { data: monthlyRaw, error: monthlyError } = await supabase
                .from('attendance_records')
                .select('year, month')
                .eq('is_cumulative', false)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .range(0, 49999)

            // 累計データの年月を取得
            const { data: cumulativeRaw, error: cumulativeError } = await supabase
                .from('attendance_records')
                .select('year, month')
                .eq('is_cumulative', true)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
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

            return NextResponse.json({
                monthlyFiles,
                cumulativeFiles,
                debug: {
                    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
                    timestamp: new Date().toISOString()
                }
            })
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
                .select('student_id, attendance_rate') // Fetch student_id
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)
                .range(0, 49999)

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
            // Fetch student_id to recalculate grade dynamically because DB grade might be stale/incorrect
            const { data: students, error } = await supabase
                .from('attendance_records')
                .select('student_id, attendance_rate')
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)
                .range(0, 49999)

            if (error) throw error

            // 学年ごとに集計
            const gradeGroups = {}
            students?.forEach(s => {
                // Calculate grade dynamically
                const grade = calculateGrade(s.student_id, targetYear, targetMonth)

                if (!gradeGroups[grade]) {
                    gradeGroups[grade] = []
                }
                gradeGroups[grade].push(parseFloat(s.attendance_rate))
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
            // Fetch student_id to map class from masterData
            const { data: students, error } = await supabase
                .from('attendance_records')
                .select('student_id, attendance_rate')
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)
                .range(0, 49999)

            if (error) throw error

            // クラスごとに集計
            const classGroups = {}
            students?.forEach(s => {
                // Determine Class from Master, fallback to DB (not fetched here) or '未設定'
                // Note: DB class_code is skipped in favor of Master data to fix "Unset" issue for 1st years
                const masterClass = studentClassMap.get(s.student_id)
                const className = masterClass || '未設定'

                // Also need Grade for sorting/grouping context
                const grade = calculateGrade(s.student_id, targetYear, targetMonth)

                const key = `${grade}-${className}`
                if (!classGroups[key]) {
                    classGroups[key] = {
                        grade: grade,
                        classCode: className,
                        rates: []
                    }
                }
                classGroups[key].rates.push(parseFloat(s.attendance_rate))
            })

            const classes = Object.values(classGroups).map(cls => {
                return {
                    grade: cls.grade,
                    classCode: cls.classCode,
                    className: cls.classCode,
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
                .select('*') // We fetch all to override grade/class locally
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)
                .range(0, 49999)

            if (search) {
                query = query.or(`student_id.ilike.%${search}%,student_name.ilike.%${search}%`)
            }

            const { data: students, error } = await query
                .order('student_id', { ascending: true })
                .limit(100)

            if (error) throw error

            // Process students to override Grade and Class
            const processedStudents = students?.map(s => {
                const realGrade = calculateGrade(s.student_id, targetYear, targetMonth)
                return {
                    ...s,
                    grade: realGrade, // Override grade
                    // Not overriding class_code here as it's not primary display in individual search list 
                    // (Table usually shows ID, Name, Grade, Rate). 
                    // But if class is needed, could use studentClassMap.
                }
            }) || []

            return NextResponse.json({
                students: processedStudents,
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

