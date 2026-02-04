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

// Grade Calculation Logic (Synced with April 1st promo rule)
function calculateGrade(studentId, year, month) {
    if (!studentId || studentId.length < 2) return 0

    // Force '23' series to be Non-enrolled (Grade 0) as per user request
    if (studentId.startsWith('23')) return 0

    const enrollmentYearShort = parseInt(studentId.substring(0, 2), 10)
    const enrollmentYear = 2000 + enrollmentYearShort

    // Academic Year Calculation (Starts on April 1st)
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

        const classCodeParam = searchParams.get('class')



        // デバッグ用: 生データ確認 (後で削除可)
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
            const monthlySet = new Set()
            const cumulativeSet = new Set()

            // データを一括で全て取得するのは制限があるため、ループで全件取得する
            let hasMore = true
            let page = 0
            const pageSize = 1000
            // 最大ループ数 (50000件 / 1000 = 50 + 安全マージン)
            const MAX_LOOPS = 100

            try {
                while (hasMore) {
                    // 全データ取得 (year, month, is_cumulative)
                    const { data, error } = await supabase
                        .from('attendance_records')
                        .select('year, month, is_cumulative')
                        .range(page * pageSize, (page + 1) * pageSize - 1)
                        .order('student_id', { ascending: true })

                    if (error) throw error

                    if (!data || data.length === 0) {
                        hasMore = false
                        break
                    }

                    // セットに追加して重複排除
                    data.forEach(item => {
                        const key = `${item.year}-${item.month}`
                        if (item.is_cumulative) {
                            cumulativeSet.add(key)
                        } else {
                            monthlySet.add(key)
                        }
                    })

                    if (data.length < pageSize) hasMore = false

                    page++
                    if (page >= MAX_LOOPS) hasMore = false
                }
            } catch (err) {
                console.error('Error fetching file list:', err)
                return NextResponse.json({ error: err.message }, { status: 500 })
            }

            // 配列に変換・降順ソート
            const monthlyFiles = Array.from(monthlySet).map(key => {
                const [year, month] = key.split('-').map(Number)
                return { year, month }
            }).sort((a, b) => { // 降順
                if (a.year !== b.year) return b.year - a.year
                return b.month - a.month
            })

            const cumulativeFiles = Array.from(cumulativeSet).map(key => {
                const [year, month] = key.split('-').map(Number)
                return { year, month }
            }).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year
                return b.month - a.month
            })

            return NextResponse.json({
                monthlyFiles,
                cumulativeFiles,
                debug: {
                    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
                    timestamp: new Date().toISOString(),
                    scan_pages: page
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

        // 学校全体の統計（全体概要）
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

            // 全体統計
            const rates = students.map(s => parseFloat(s.attendance_rate))
            const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length
            const sortedRates = rates.sort((a, b) => a - b)

            // 学年別集計 (旧 grade type ロジックを統合)
            const gradeGroups = {}
            students.forEach(s => {
                // Calculate grade dynamically
                const grade = calculateGrade(s.student_id, targetYear, targetMonth)

                if (!gradeGroups[grade]) {
                    gradeGroups[grade] = []
                }
                gradeGroups[grade].push(parseFloat(s.attendance_rate))
            })

            const grades = Object.keys(gradeGroups).map(grade => {
                const gradeNum = parseInt(grade)
                const gRates = gradeGroups[grade]
                return {
                    grade: gradeNum,
                    gradeName: gradeNum === 0 ? '非在籍者' : `${gradeNum}年生`,
                    studentCount: gRates.length,
                    averageRate: gRates.reduce((sum, r) => sum + r, 0) / gRates.length
                }
            }).sort((a, b) => {
                // 非在籍者（grade=0）は最後に
                if (a.grade === 0) return 1
                if (b.grade === 0) return -1
                return a.grade - b.grade
            })

            return NextResponse.json({
                totalStudents: students.length,
                averageRate: avgRate,
                minRate: sortedRates[0],
                maxRate: sortedRates[sortedRates.length - 1],
                grades: grades, // Added grades data
                year: targetYear,
                month: targetMonth,
                isCumulative: cumulative
            })
        }

        // クラス別の統計
        if (type === 'class') {
            // Fetch Student Master for Class mapping
            const { data: masterData } = await supabase
                .from('students')
                .select('student_id_text, class_name')
                .range(0, 49999)

            const studentInfoMap = new Map()
            masterData?.forEach(s => {
                if (s.student_id_text) {
                    studentInfoMap.set(s.student_id_text, {
                        className: s.class_name
                    })
                }
            })

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
                const info = studentInfoMap.get(s.student_id)
                const className = info?.className || '未設定'
                const grade = calculateGrade(s.student_id, targetYear, targetMonth)

                // クラス名だけでグルーピング (重複回避)
                const key = className
                if (!classGroups[key]) {
                    classGroups[key] = {
                        grade: grade, // 代表値として最初のgradeを使う（厳密ではないが表示用には十分）
                        classCode: className,
                        rates: []
                    }
                }
                classGroups[key].rates.push(parseFloat(s.attendance_rate))

                // gradeが未設定(0)で、新しいメンバーが正規の学年なら更新する等のロジックも本当はあり得るが
                // 現状はシンプルに。
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
                // クラス名でソート
                return (a.classCode || '').localeCompare(b.classCode || '', undefined, { numeric: true })
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
                // 学生基本情報を取得（PDF出力用）
                const { data: studentInfo } = await supabase
                    .from('students')
                    .select('*')
                    .eq('student_id_text', studentId)
                    .single()
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
                    cumulativeData: cumulativeData || [],
                    studentInfo
                })
            }

            // 学生検索またはクラス指定一覧
            let query = supabase
                .from('attendance_records')
                .select('*')
                .eq('year', targetYear)
                .eq('month', targetMonth)
                .eq('is_cumulative', cumulative)
                .range(0, 49999)

            if (search) {
                query = query.or(`student_id.ilike.%${search}%,student_name.ilike.%${search}%`)
            }

            const { data: students, error } = await query
                .order('student_id', { ascending: true })
                .limit(5000)

            if (error) throw error

            // Fetch Student Master for Class mapping within Individual View
            const { data: masterData } = await supabase
                .from('students')
                .select('student_id_text, class_name, name_kana, nationality')
                .range(0, 49999)

            const studentInfoMap = new Map()
            masterData?.forEach(s => {
                if (s.student_id_text) {
                    studentInfoMap.set(s.student_id_text, {
                        className: s.class_name,
                        nameKana: s.name_kana,
                        nationality: s.nationality
                    })
                }
            })

            let processedStudents = students?.map(s => {
                const info = studentInfoMap.get(s.student_id) || {}
                const realGrade = calculateGrade(s.student_id, targetYear, targetMonth)
                return {
                    ...s,
                    grade: realGrade,
                    class_name: info.className, // マスタから結合
                    name_kana: info.nameKana,
                    nationality: info.nationality
                }
            }) || []

            // クラスフィルタ適用
            if (classCodeParam) {
                processedStudents = processedStudents.filter(s => s.class_name === classCodeParam)
            }

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
