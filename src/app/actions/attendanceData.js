'use server'

import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

// Use Service Role Key to bypass RLS (mirroring route.js logic)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const getSupabaseAdmin = () => {
    if (!SUPABASE_URL || !SERVICE_KEY) {
        throw new Error('Missing Supabase credentials')
    }
    return createClient(SUPABASE_URL, SERVICE_KEY)
}

// Grade Calculation Logic (Synced with route.js)
function calculateGrade(studentId, year, month) {
    if (!studentId || studentId.length < 2) return 0
    if (studentId.startsWith('23')) return 0 // Force '23' series to be Non-enrolled

    const enrollmentYearShort = parseInt(studentId.substring(0, 2), 10)
    const enrollmentYear = 2000 + enrollmentYearShort
    const academicYear = month >= 4 ? year : year - 1
    let grade = academicYear - enrollmentYear + 1

    if (grade > 2) grade = 0
    if (grade < 0) grade = 0
    return grade
}

export const getAvailableAttendanceFiles = unstable_cache(
    async () => {
        const supabase = getSupabaseAdmin()
        const monthlySet = new Set()
        const cumulativeSet = new Set()

        let hasMore = true
        let page = 0
        const pageSize = 1000
        const MAX_LOOPS = 50

        try {
            while (hasMore) {
                const { data, error } = await supabase
                    .from('attendance_records')
                    .select('year, month, is_cumulative')
                    .range(page * pageSize, (page + 1) * pageSize - 1)
                    .order('student_id', { ascending: true })

                if (error) throw error
                if (!data || data.length === 0) break

                data.forEach(item => {
                    const key = `${item.year}-${item.month}`
                    if (item.is_cumulative) cumulativeSet.add(key)
                    else monthlySet.add(key)
                })

                if (data.length < pageSize) hasMore = false
                page++
                if (page >= MAX_LOOPS) hasMore = false
            }

            const sortFunc = (a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month)

            const monthlyFiles = Array.from(monthlySet).map(key => {
                const [year, month] = key.split('-').map(Number)
                return { year, month }
            }).sort(sortFunc)

            const cumulativeFiles = Array.from(cumulativeSet).map(key => {
                const [year, month] = key.split('-').map(Number)
                return { year, month }
            }).sort(sortFunc)

            return { monthlyFiles, cumulativeFiles }
        } catch (err) {
            console.error('getAvailableAttendanceFiles Error:', err)
            return { monthlyFiles: [], cumulativeFiles: [] }
        }
    },
    ['attendance-files-v1'],
    { revalidate: 86400, tags: ['attendance-files'] }
)

export const getSchoolAttendanceStats = unstable_cache(
    async (year, month, isCumulative, enrollmentFilter = 'all') => {
        const supabase = getSupabaseAdmin()
        const { data: students, error } = await supabase
            .from('attendance_records')
            .select('student_id, attendance_rate')
            .eq('year', year)
            .eq('month', month)
            .eq('is_cumulative', isCumulative)
            .range(0, 49999)

        if (error) throw error
        
        let filteredStudents = students
        if (enrollmentFilter === 'enrolled') {
            filteredStudents = students?.filter(s => calculateGrade(s.student_id, year, month) > 0)
        } else if (enrollmentFilter === 'non-enrolled') {
            filteredStudents = students?.filter(s => calculateGrade(s.student_id, year, month) === 0)
        }

        if (!filteredStudents || filteredStudents.length === 0) return null

        const rates = filteredStudents.map(s => parseFloat(s.attendance_rate))
        const avgRate = rates.reduce((sum, r) => sum + r, 0) / rates.length
        const sortedRates = rates.sort((a, b) => a - b)

        const gradeGroups = {}
        filteredStudents.forEach(s => {
            const grade = calculateGrade(s.student_id, year, month)
            if (!gradeGroups[grade]) gradeGroups[grade] = []
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
            if (a.grade === 0) return 1
            if (b.grade === 0) return -1
            return a.grade - b.grade
        })

        const result = {
            totalStudents: students.length,
            averageRate: avgRate,
            minRate: sortedRates[0],
            maxRate: sortedRates[sortedRates.length - 1],
            grades,
            year,
            month,
            isCumulative
        }

        // Push to Cloudflare for instant Admin Dashboard loading
        try {
            if (enrollmentFilter === 'all') {
                const { pushCloudflareSnapshot } = await import('./cloudflare');
                const type = `attendance_school_${year}_${month}_${isCumulative}`;
                await pushCloudflareSnapshot(type, result);
            }
        } catch (e) {
            console.error('Proactive attendance school snapshot failed:', e);
        }

        return result;
    },
    ['attendance-school-stats-v1'],
    { revalidate: 86400, tags: ['attendance-stats'] }
)

export const getClassAttendanceStats = unstable_cache(
    async (year, month, isCumulative, enrollmentFilter = 'all') => {
        const supabase = getSupabaseAdmin()

        // Fetch Master Data
        const { data: masterData } = await supabase
            .from('students')
            .select('student_id_text, class_name')
            .range(0, 49999)

        const studentInfoMap = new Map()
        masterData?.forEach(s => {
            if (s.student_id_text) {
                studentInfoMap.set(s.student_id_text, { className: s.class_name })
            }
        })

        const { data: students, error } = await supabase
            .from('attendance_records')
            .select('student_id, attendance_rate')
            .eq('year', year)
            .eq('month', month)
            .eq('is_cumulative', isCumulative)
            .range(0, 49999)

        if (error) throw error

        let filteredStudents = students
        if (enrollmentFilter === 'enrolled') {
            filteredStudents = students?.filter(s => calculateGrade(s.student_id, year, month) > 0)
        } else if (enrollmentFilter === 'non-enrolled') {
            filteredStudents = students?.filter(s => calculateGrade(s.student_id, year, month) === 0)
        }

        const classGroups = {}
        filteredStudents?.forEach(s => {
            const info = studentInfoMap.get(s.student_id)
            const className = info?.className || '未設定'
            const grade = calculateGrade(s.student_id, year, month)

            if (!classGroups[className]) {
                classGroups[className] = {
                    grade,
                    classCode: className,
                    rates: []
                }
            }
            classGroups[className].rates.push(parseFloat(s.attendance_rate))
        })

        const classes = Object.values(classGroups).map(cls => ({
            grade: cls.grade,
            classCode: cls.classCode,
            className: cls.classCode,
            studentCount: cls.rates.length,
            averageRate: cls.rates.reduce((sum, r) => sum + r, 0) / cls.rates.length
        })).sort((a, b) => (a.classCode || '').localeCompare(b.classCode || '', undefined, { numeric: true }))

        const result = { classes, year, month, isCumulative }

        // Push to Cloudflare for instant Admin Dashboard loading
        try {
            if (enrollmentFilter === 'all') {
                const { pushCloudflareSnapshot } = await import('./cloudflare');
                const type = `attendance_class_${year}_${month}_${isCumulative}`;
                await pushCloudflareSnapshot(type, result);
            }
        } catch (e) {
            console.error('Proactive attendance class snapshot failed:', e);
        }

        return result;
    },
    ['attendance-class-stats-v1'],
    { revalidate: 86400, tags: ['attendance-stats'] }
)

// Internal cached fetch (returns ALL data)
const _getCachedStudentListAttendance = unstable_cache(
    async (year, month, isCumulative) => {
        const supabase = getSupabaseAdmin()

        const { data: students, error } = await supabase
            .from('attendance_records')
            .select('student_id, student_name, attendance_rate')
            .eq('year', year)
            .eq('month', month)
            .eq('is_cumulative', isCumulative)
            .range(0, 49999)
            .order('student_id', { ascending: true })

        if (error) throw error

        // Master Data for mapping
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

        const processedStudents = students?.map(s => {
            const info = studentInfoMap.get(s.student_id) || {}
            return {
                ...s,
                grade: calculateGrade(s.student_id, year, month),
                class_name: info.className,
                name_kana: info.nameKana,
                nationality: info.nationality
            }
        }) || []

        return { students: processedStudents, year, month, isCumulative }
    },
    ['attendance-student-list-v1'],
    { revalidate: 86400, tags: ['attendance-stats'] }
)

// Public: Paginated & Filtered Fetch (Server-Side Processing)
export const getPaginatedAttendance = async ({
    year,
    month,
    isCumulative,
    page = 1,
    limit = 50,
    search = '',
    rateFilterType = 'none',
    rateFilterValue = 0,
    sortOrder = 'asc',
    enrollmentFilter = 'all'
}) => {
    // 1. Get Cached Full List
    const data = await _getCachedStudentListAttendance(year, month, isCumulative)
    let students = data.students || []

    // 1.5 Filter (Enrollment)
    if (enrollmentFilter === 'enrolled') {
        students = students.filter(s => s.grade > 0)
    } else if (enrollmentFilter === 'non-enrolled') {
        students = students.filter(s => s.grade === 0)
    }

    // 2. Filter (Search)
    if (search) {
        const lowerSearch = search.toLowerCase()
        students = students.filter(s =>
            (s.student_id && s.student_id.toLowerCase().includes(lowerSearch)) ||
            (s.student_name && s.student_name.toLowerCase().includes(lowerSearch)) ||
            (s.name_kana && s.name_kana.toLowerCase().includes(lowerSearch))
        )
    }

    // 3. Filter (Rate)
    if (rateFilterType !== 'none') {
        // Since the cached data is EITHER monthly OR cumulative (based on isCumulative param),
        // we just check 'attendance_rate' which holds the value for that type.
        // Wait, the UI allows filtering "Cumulative" even when viewing "Monthly"?
        // No, usually you filter by what you see.
        // If the user wants "Cumulative Filter" while viewing "Monthly Data", we'd need BOTH datasets.
        // For simplicity speed, we assume filter applies to the Current View's rate.
        students = students.filter(s => s.attendance_rate <= rateFilterValue)
    }

    // 4. Sort
    students.sort((a, b) => {
        if (sortOrder === 'asc') return a.attendance_rate - b.attendance_rate
        return b.attendance_rate - a.attendance_rate
    })

    // 5. Pagination
    const totalCount = students.length
    const startIndex = (page - 1) * limit
    const paginatedStudents = students.slice(startIndex, startIndex + limit)

    return {
        students: paginatedStudents,
        totalCount,
        page,
        limit
    }
}

// Public: Get IDs for Bulk Export (Filtered)
export const getAllStudentIdsForBulk = async ({
    year,
    month,
    isCumulative,
    search = '',
    rateFilterType = 'none',
    rateFilterValue = 0,
    enrollmentFilter = 'all'
}) => {
    const data = await _getCachedStudentListAttendance(year, month, isCumulative)
    let students = data.students || []

    if (enrollmentFilter === 'enrolled') {
        students = students.filter(s => s.grade > 0)
    } else if (enrollmentFilter === 'non-enrolled') {
        students = students.filter(s => s.grade === 0)
    }

    if (search) {
        const lowerSearch = search.toLowerCase()
        students = students.filter(s =>
            (s.student_id && s.student_id.toLowerCase().includes(lowerSearch)) ||
            (s.student_name && s.student_name.toLowerCase().includes(lowerSearch)) ||
            (s.name_kana && s.name_kana.toLowerCase().includes(lowerSearch))
        )
    }

    if (rateFilterType !== 'none') {
        students = students.filter(s => s.attendance_rate <= rateFilterValue)
    }

    return students.map(s => s.student_id)
}

// Keep backward compatibility if needed, or just export the cached one as getStudentListAttendance for other uses
export const getStudentListAttendance = _getCachedStudentListAttendance

export const getStudentAttendanceHistory = unstable_cache(
    async (studentId) => {
        const supabase = getSupabaseAdmin()

        const { data: studentInfo } = await supabase
            .from('students')
            .select('*')
            .eq('student_id_text', studentId)
            .single()

        const { data: monthlyData } = await supabase
            .from('attendance_records')
            .select('year, month, attendance_rate, attendance_days, absence_days, late_slots')
            .eq('student_id', studentId)
            .eq('is_cumulative', false)
            .order('year', { ascending: true })
            .order('month', { ascending: true })

        const { data: cumulativeData } = await supabase
            .from('attendance_records')
            .select('year, month, attendance_rate, attendance_days, absence_days, late_slots')
            .eq('student_id', studentId)
            .eq('is_cumulative', true)
            .order('year', { ascending: true })
            .order('month', { ascending: true })

        return {
            monthlyData: monthlyData || [],
            cumulativeData: cumulativeData || [],
            studentInfo
        }
    },
    ['attendance-student-history-v1'],
    { revalidate: 86400, tags: ['attendance-stats'] }
)
