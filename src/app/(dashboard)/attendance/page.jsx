'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateAttendancePDFClient } from '@/lib/export/clientPdfGenerator'
import styles from './page.module.css'

import {
    getAvailableAttendanceFiles,
    getSchoolAttendanceStats,
    getClassAttendanceStats,
    getPaginatedAttendance,
    getAllStudentIdsForBulk,
    getStudentAttendanceHistory
} from '@/app/actions/attendanceData'

export default function AttendancePage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState('school')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [userRole, setUserRole] = useState(null)
    const [isPdfGenerating, setIsPdfGenerating] = useState(false)

    // データ
    const [availableFiles, setAvailableFiles] = useState({ monthlyFiles: [], cumulativeFiles: [] })
    const [selectedYear, setSelectedYear] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(null)
    const [isCumulative, setIsCumulative] = useState(true)

    const [originalData, setOriginalData] = useState(null) // Stores raw fetched data before filtering
    const [attendanceData, setAttendanceData] = useState(null) // Stores filtered data for display

    const [schoolData, setSchoolData] = useState(null)
    const [gradeData, setGradeData] = useState(null)
    const [classData, setClassData] = useState(null)
    const [individualData, setIndividualData] = useState(null)
    const [studentSearch, setStudentSearch] = useState('')
    const [selectedStudent, setSelectedStudent] = useState(null) // For Individual View Modal? or just data?
    const [selectedStudents, setSelectedStudents] = useState(new Set()) // For Bulk Export
    const [exporting, setExporting] = useState(false)
    const [rateFilter, setRateFilter] = useState({ type: 'none', value: 0 }) // { type: 'monthly'|'cumulative'|'none', value: 0.95 }
    const [studentHistory, setStudentHistory] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [sortOrder, setSortOrder] = useState('asc')

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 50

    // クラス詳細用
    const [selectedClass, setSelectedClass] = useState(null)
    const [classMembers, setClassMembers] = useState(null)

    // インポート用
    const [importFile, setImportFile] = useState(null)
    const [importYear, setImportYear] = useState(new Date().getFullYear())
    const [importMonth, setImportMonth] = useState(new Date().getMonth() + 1)
    const [importCumulative, setImportCumulative] = useState(false)
    const [importing, setImporting] = useState(false)

    // Data Cache
    const dataCache = useRef({})

    useEffect(() => {
        fetchUserRole()
        fetchAvailableFiles()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (selectedYear && selectedMonth) {
            fetchData()
        }
    }, [selectedYear, selectedMonth, isCumulative, activeTab, currentPage, rateFilter, sortOrder])

    // Reset pagination when filters change (manual search trigger handles its own reset effectively if we set page to 1 there, but let's do it here for other filters)
    useEffect(() => {
        setCurrentPage(1)
    }, [activeTab, rateFilter, sortOrder])
    // Note: studentSearch is not here because we trigger search manually or on enter. 
    // When hitting search, we should probably manually reset page to 1.

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setUserRole(data?.role)
        } else {
            // Admin member (cookie-based) - treat as teacher
            setUserRole('teacher')
        }
    }

    const fetchAvailableFiles = async () => {
        try {
            const files = await getAvailableAttendanceFiles()
            setAvailableFiles(files)

            // Auto-select latest
            if (!selectedYear && !selectedMonth) {
                const targetFiles = isCumulative ? files.cumulativeFiles : files.monthlyFiles
                if (targetFiles.length > 0) {
                    const latest = targetFiles[0]
                    setSelectedYear(latest.year)
                    setSelectedMonth(latest.month)
                }
            }
        } catch (err) {
            console.error(err)
            setError('ファイル一覧の取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }
    const fetchData = async (forceRefresh = false, y = null, m = null, cum = null) => {
        const targetYear = y || selectedYear;
        const targetMonth = m || selectedMonth;
        const targetIsCumulative = cum !== null ? cum : isCumulative;

        if (!targetYear || !targetMonth) return
        setLoading(true)
        setError(null)

        try {
            // Priority 0: Cloudflare Snapshots (Instant) - Skip if forceRefresh is true
            const workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
            if (!forceRefresh && workerUrl && (activeTab === 'school' || activeTab === 'class')) {
                let targetUrl = workerUrl.startsWith('http') ? workerUrl : `https://${workerUrl}`;
                const snapshotType = activeTab === 'school'
                    ? `attendance_school_${targetYear}_${targetMonth}_${targetIsCumulative}`
                    : `attendance_class_${targetYear}_${targetMonth}_${targetIsCumulative}`;

                const res = await fetch(`${targetUrl}?action=get-analytics&type=${snapshotType}`);
                if (res.ok) {
                    const cfData = await res.json();
                    if (cfData) {
                        applyDataToState(cfData);
                        setLoading(false);
                        return; // Instant Win
                    }
                }
            }

            // Priority 1: Check Local State Cache - Skip if forceRefresh is true
            const cacheKey = `${targetYear}-${targetMonth}-${targetIsCumulative}-${activeTab}-${currentPage}-${rateFilter.type}-${rateFilter.value}-${sortOrder}`
            if (!forceRefresh && dataCache.current[cacheKey]) {
                applyDataToState(dataCache.current[cacheKey])
                setLoading(false)
                return
            }

            // Priority 2: Vercel Server Actions (The "Heavy" Backup)
            let result = {}
            if (activeTab === 'school') {
                result = await getSchoolAttendanceStats(targetYear, targetMonth, targetIsCumulative)
            } else if (activeTab === 'class') {
                result = await getClassAttendanceStats(targetYear, targetMonth, targetIsCumulative)
            } else if (activeTab === 'individual') {
                result = await getPaginatedAttendance({
                    year: targetYear,
                    month: targetMonth,
                    isCumulative: targetIsCumulative,
                    page: currentPage,
                    limit: ITEMS_PER_PAGE,
                    rateFilterType: rateFilter.type,
                    rateFilterValue: rateFilter.value,
                    sortOrder
                    // search is handled via separate state trigger or included? 
                    // Wait, studentSearch is state. Let's include it if present.
                    // But useEffect dependency doesn't include studentSearch properly yet.
                    // For now, let's keep it simple as per previous working state.
                })
            }

            dataCache.current[cacheKey] = result
            applyDataToState(result)

        } catch (err) {
            console.error(err)
            setError('データの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const applyDataToState = (data) => {
        if (activeTab === 'school') {
            setSchoolData(data)
        } else if (activeTab === 'class') {
            setClassData(data)
        } else if (activeTab === 'individual') {
            setAttendanceData(data) // { students, totalCount }
        }
    }

    const handleImport = async () => {
        if (!importFile) return
        setImporting(true)

        try {
            const formData = new FormData()
            formData.append('file', importFile)
            formData.append('year', importYear)
            formData.append('month', importMonth)
            formData.append('cumulative', importCumulative)

            const res = await fetch('/api/attendance/import', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) throw new Error('Upload failed')

            alert('インポートが完了しました')
            setImportFile(null)
            
            // クライアント側キャッシュを全てクリア
            dataCache.current = {}
            
            // 現在の表示設定をインポートしたものに合わせる（useEffectによる自動フェッチを待たずに手動で呼ぶ）
            const y = importYear;
            const m = importMonth;
            const cum = importCumulative;
            
            setSelectedYear(y)
            setSelectedMonth(m)
            setIsCumulative(cum)
            
            await fetchAvailableFiles() // Refresh list
            // インポートした年月・種別で強制フェッチ（Vercel側のキャッシュとCloudflareのスナップショットを更新させる）
            fetchData(true, y, m, cum)
        } catch (err) {
            console.error(err)
            alert('インポートに失敗しました')
        } finally {
            setImporting(false)
        }
    }

    const fetchStudentHistory = async (studentId) => {
        setHistoryLoading(true)
        setSelectedStudent(studentId)
        try {
            const data = await getStudentAttendanceHistory(studentId)
            setStudentHistory(data)
        } catch (err) {
            console.error('Failed to fetch student history:', err)
        } finally {
            setHistoryLoading(false)
        }
    }

    const fetchClassMembers = async (className) => {
        setSelectedClass(className)
        try {
            // For class members, we still want the full list for that class?
            // Or do we paginate class members too?
            // Current implementation: "fetchClassMembers" calls getStudentListAttendance from the action which we refactored to _internal.
            // Wait, I refactored getStudentListAttendance to be the INTERNAL cached one that returns ALL.
            // So calling it here for class members is fine (it returns all, then we filter).
            // BUT, getStudentListAttendance is exported as the cached one.
            // So this logic (lines 247-251) still works!

            // However, in my previous edit I exported getStudentListAttendance = _getCachedStudentListAttendance.
            // So it returns { students: [...all...], ... }
            const fullListData = await getPaginatedAttendance({
                year: selectedYear,
                month: selectedMonth,
                isCumulative,
                limit: 10000 // Get all to filter client side
            })

            const members = fullListData.students.filter(s => s.class_name === className)
            members.sort((a, b) => a.student_id_text?.localeCompare(b.student_id_text))

            setClassMembers(members)
        } catch (err) {
            console.error(err)
            alert('クラス情報の取得に失敗しました')
        } finally {
            setLoading(false) // Wait, is loading state shared? Yes usually.
        }
    }

    // --- PDF Download Logic ---
    const handleDownloadPDF = async () => {
        if (!selectedStudent || !studentHistory) return
        setIsPdfGenerating(true)

        try {
            const studentInfo = studentHistory.studentInfo || attendanceData?.students?.find(s => s.student_id === selectedStudent)

            // Latest cumulative rate
            const latestCumulative = studentHistory.cumulativeData?.length > 0
                ? studentHistory.cumulativeData[studentHistory.cumulativeData.length - 1]
                : { attendance_rate: 0 }

            // Generate PDF client-side
            const blob = await generateAttendancePDFClient({
                student: {
                    id: selectedStudent,
                    name: formatStudentName(studentInfo),
                    className: studentInfo?.class_name
                },
                history: studentHistory,
                currentStats: {
                    rate: latestCumulative.attendance_rate
                }
            })

            const studentName = formatStudentName(studentInfo)
            const fileName = `${studentInfo?.class_name || ''}_${studentName}_出席率詳細.pdf`

            saveAs(blob, fileName)

        } catch (error) {
            console.error('PDF Download Error:', error)
            alert('PDFの生成に失敗しました')
        } finally {
            setIsPdfGenerating(false)
        }
    }

    // --- Bulk Export Logic ---

    // --- Bulk Export Logic ---
    const handleSelectAll = async (e) => {
        if (e.target.checked) {
            setLoading(true)
            try {
                const allIds = await getAllStudentIdsForBulk({
                    year: selectedYear,
                    month: selectedMonth,
                    isCumulative,
                    search: studentSearch,
                    rateFilterType: rateFilter.type,
                    rateFilterValue: rateFilter.value
                })
                setSelectedStudents(new Set(allIds))
            } catch (err) {
                console.error(err)
                alert('全選択に失敗しました')
            } finally {
                setLoading(false)
            }
        } else {
            setSelectedStudents(new Set())
        }
    }

    const handleSelectStudent = (id) => {
        const newSet = new Set(selectedStudents)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedStudents(newSet)
    }

    const handleBulkDownload = async () => {
        if (selectedStudents.size === 0) return
        setExporting(true)
        try {
            const zip = new JSZip()
            const folder = zip.folder(`attendance_pdfs_${new Date().toISOString().slice(0, 10)}`)

            const idsToExport = Array.from(selectedStudents)

            for (const studentId of idsToExport) {
                try {
                    // Fetch student history (Server Action) -- faster than API route and consistent
                    const studentHistoryData = await getStudentAttendanceHistory(studentId)

                    if (!studentHistoryData || !studentHistoryData.studentInfo) {
                        console.warn(`No data for student ${studentId}`)
                        continue
                    }

                    const studentInfo = studentHistoryData.studentInfo

                    // Latest cumulative rate
                    const latestCumulative = studentHistoryData.cumulativeData?.length > 0
                        ? studentHistoryData.cumulativeData[studentHistoryData.cumulativeData.length - 1]
                        : { attendance_rate: 0 }

                    // Generate PDF client-side
                    const blob = await generateAttendancePDFClient({
                        student: {
                            id: studentId,
                            name: formatStudentName(studentInfo),
                            className: studentInfo.class_name
                        },
                        history: studentHistoryData,
                        currentStats: {
                            rate: latestCumulative.attendance_rate
                        }
                    })

                    if (blob) {
                        const monthlyData = studentHistoryData.monthlyData || []
                        let latestYear = new Date().getFullYear()
                        let latestMonth = new Date().getMonth() + 1
                        if (monthlyData.length > 0) {
                            const sorted = [...monthlyData].sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month))
                            latestYear = sorted[0].year
                            latestMonth = sorted[0].month
                        }
                        const studentName = formatStudentName(studentInfo)
                        const fileName = `${studentInfo.class_name || ''}_${studentName}_${latestYear}年${latestMonth}月出席率.pdf`
                        folder.file(fileName, blob)
                    } else {
                        console.warn(`Failed to generate PDF for student ${studentId}`)
                    }
                } catch (e) {
                    console.error(`Error processing student ${studentId}`, e)
                }
            }

            const content = await zip.generateAsync({ type: 'blob' })
            saveAs(content, 'attendance_bulk_export.zip')

        } catch (error) {
            console.error('Bulk export failed', error)
            alert('一括出力に失敗しました')
        } finally {
            setExporting(false)
        }
    }

    const tabs = [
        { id: 'school', label: '全体概要' },
        { id: 'class', label: 'クラス別' },
        { id: 'individual', label: '個別' }
    ]

    const getRateColor = (rate) => {
        if (!rate && rate !== 0) return ''
        const r = parseFloat(rate)
        if (r < 0.8) return styles.danger
        if (r < 0.9) return styles.warning
        return styles.success
    }

    const formatRate = (rate) => {
        if (!rate && rate !== 0) return '-'
        return `${(parseFloat(rate) * 100).toFixed(1)}%`
    }

    const formatStudentName = (student) => {
        if (!student) return ''
        return student.full_name || student.name || student.student_name || ''
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>出席率</h1>
                <p className={styles.subtitle}>
                    出席率データを確認・管理します
                </p>
            </header>

            {/* フィルター */}
            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>年月:</label>
                    <select
                        value={`${selectedYear}-${selectedMonth}`}
                        onChange={(e) => {
                            const [y, m] = e.target.value.split('-')
                            setSelectedYear(parseInt(y))
                            setSelectedMonth(parseInt(m))
                        }}
                        className={styles.select}
                    >
                        {(isCumulative ? availableFiles.cumulativeFiles : availableFiles.monthlyFiles).map(f => (
                            <option key={`${f.year}-${f.month}`} value={`${f.year}-${f.month}`}>
                                {f.year}年{f.month}月
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>データ種別:</label>
                    <div className={styles.toggleButtons}>
                        <button
                            className={`${styles.toggleBtn} ${!isCumulative ? styles.active : ''}`}
                            onClick={() => {
                                setIsCumulative(false)
                                // 月別ファイルリストの最初の年月を選択
                                const files = availableFiles.monthlyFiles
                                if (files && files.length > 0) {
                                    setSelectedYear(files[0].year)
                                    setSelectedMonth(files[0].month)
                                }
                            }}
                        >
                            月別
                        </button>
                        <button
                            className={`${styles.toggleBtn} ${isCumulative ? styles.active : ''}`}
                            onClick={() => {
                                setIsCumulative(true)
                                // 累計ファイルリストの最初の年月を選択
                                const files = availableFiles.cumulativeFiles
                                if (files && files.length > 0) {
                                    setSelectedYear(files[0].year)
                                    setSelectedMonth(files[0].month)
                                }
                            }}
                        >
                            累計
                        </button>
                    </div>
                </div>

                <div className={styles.filterGroup}>
                    <label>出席率フィルタ:</label>
                    <select
                        className={styles.select}
                        value={`${rateFilter.type}-${rateFilter.value}`}
                        onChange={(e) => {
                            const [type, val] = e.target.value.split('-')
                            setRateFilter({ type, value: parseFloat(val) })
                        }}
                    >
                        <option value="none-0">指定なし</option>
                        <option value="monthly-0.95">月別 95%以下</option>
                        <option value="monthly-0.90">月別 90%以下</option>
                        <option value="monthly-0.85">月別 85%以下</option>
                        <option value="monthly-0.80">月別 80%以下</option>
                        <option value="cumulative-0.95">累計 95%以下</option>
                        <option value="cumulative-0.90">累計 90%以下</option>
                        <option value="cumulative-0.85">累計 85%以下</option>
                        <option value="cumulative-0.80">累計 80%以下</option>
                    </select>
                </div>

            </div>
            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* コンテンツ */}
            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className="spinner"></div>
                        <p>データを読み込んでいます...</p>
                    </div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : (
                    <>
                        {/* 全体概要（旧 学校全体 + 学年別） */}
                        {activeTab === 'school' && schoolData && (
                            <div className={styles.schoolStats}>
                                <div className={styles.statCards}>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>総学生数</div>
                                        <div className={styles.statValue}>{schoolData.totalStudents}名</div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>平均出席率</div>
                                        <div className={`${styles.statValue} ${getRateColor(schoolData.averageRate)}`}>
                                            {formatRate(schoolData.averageRate)}
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>最高出席率</div>
                                        <div className={styles.statValue}>{formatRate(schoolData.maxRate)}</div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <div className={styles.statLabel}>最低出席率</div>
                                        <div className={styles.statValue}>{formatRate(schoolData.minRate)}</div>
                                    </div>
                                </div>

                                {/* 学年別データをここに統合 */}
                                {schoolData.grades && (
                                    <div className={styles.gradeStats}>
                                        <h3 className={styles.subHeader}>学年別状況</h3>
                                        <div className={styles.gradeCards}>
                                            {schoolData.grades.map(g => (
                                                <div key={g.grade} className={styles.gradeCard}>
                                                    <div className={styles.gradeTitle}>{g.gradeName || `${g.grade}年生`}</div>
                                                    <div className={`${styles.gradeRate} ${getRateColor(g.averageRate)}`}>
                                                        {formatRate(g.averageRate)}
                                                    </div>
                                                    <div className={styles.gradeCount}>{g.studentCount}名</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* クラス別 */}
                        {activeTab === 'class' && classData && (
                            <div className={styles.classStats}>
                                {!selectedClass ? (
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>クラス</th>
                                                <th>人数</th>
                                                <th>平均出席率</th>
                                                <th>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classData.classes?.map(c => (
                                                <tr key={`${c.grade}-${c.classCode}`}>
                                                    <td data-label="クラス">{c.className}</td>
                                                    <td data-label="人数">{c.studentCount}名</td>
                                                    <td data-label="平均出席率" className={getRateColor(c.averageRate)}>
                                                        {formatRate(c.averageRate)}
                                                    </td>
                                                    <td data-label="操作">
                                                        <button
                                                            className={styles.detailBtn}
                                                            onClick={() => fetchClassMembers(c.classCode)}
                                                        >
                                                            学生一覧
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className={styles.studentDetail}>
                                        <div className={styles.detailHeader}>
                                            <button
                                                onClick={() => { setSelectedClass(null); setClassMembers(null); }}
                                                className={styles.backBtn}
                                            >
                                                ← クラス一覧に戻る
                                            </button>
                                            <h3>{selectedClass} クラス 学生一覧 ({classMembers?.length || 0}名)</h3>
                                        </div>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>学籍番号</th>
                                                    <th>氏名</th>
                                                    <th>出席率</th>
                                                    <th>操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classMembers?.map(s => (
                                                    <tr key={s.student_id}>
                                                        <td data-label="学籍番号">{s.student_id}</td>
                                                        <td data-label="氏名">{formatStudentName(s)}</td>
                                                        <td data-label="出席率" className={getRateColor(s.attendance_rate)}>
                                                            {formatRate(s.attendance_rate)}
                                                        </td>
                                                        <td data-label="操作">
                                                            <button
                                                                onClick={() => {
                                                                    // 個別タブへ遷移して詳細を表示
                                                                    setActiveTab('individual')
                                                                    fetchStudentHistory(s.student_id)
                                                                }}
                                                                className={styles.detailBtn}
                                                            >
                                                                詳細
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 個別 */}
                        {activeTab === 'individual' && (
                            <div className={styles.individualStats}>
                                <div className={styles.searchBox}>
                                    <input
                                        type="text"
                                        placeholder="学籍番号または名前で検索..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                                        className={styles.searchInput}
                                    />
                                    <button onClick={fetchData} className={styles.searchBtn}>検索</button>
                                </div>

                                {!selectedStudent ? (
                                    <>
                                        {attendanceData?.students?.length > 0 && (
                                            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <button
                                                    className={styles.importBtn}
                                                    onClick={handleBulkDownload}
                                                    disabled={selectedStudents.size === 0 || exporting}
                                                    style={{ backgroundColor: selectedStudents.size === 0 ? '#ccc' : '#10b981' }}
                                                >
                                                    {exporting ? '出力中...' : `PDF一括出力 (${selectedStudents.size}件)`}
                                                </button>

                                                <div className={styles.filterGroup} style={{ marginBottom: 0 }}>
                                                    <label style={{ marginRight: '0.5rem' }}>並び替え:</label>
                                                    <select
                                                        value={sortOrder}
                                                        onChange={(e) => setSortOrder(e.target.value)}
                                                        className={styles.select}
                                                    >
                                                        <option value="asc">出席率が低い順</option>
                                                        <option value="desc">出席率が高い順</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '50px', textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={attendanceData?.totalCount > 0 && selectedStudents.size === attendanceData.totalCount}
                                                            onChange={handleSelectAll}
                                                        />
                                                    </th>
                                                    <th>学籍番号</th>
                                                    <th>クラス</th>
                                                    <th>氏名</th>
                                                    <th>学年</th>
                                                    <th>出席率</th>
                                                    <th>操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attendanceData?.students?.map(s => (
                                                    <tr key={s.student_id}>
                                                        <td style={{ textAlign: 'center' }} data-label="選択">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedStudents.has(s.student_id)}
                                                                onChange={() => handleSelectStudent(s.student_id)}
                                                            />
                                                        </td>
                                                        <td data-label="学籍番号">{s.student_id}</td>
                                                        <td data-label="クラス">{s.class_name || '-'}</td>
                                                        <td data-label="氏名">{formatStudentName(s)}</td>
                                                        <td data-label="学年">{s.grade === 0 ? '非在籍者' : `${s.grade}年`}</td>
                                                        <td data-label="出席率" className={getRateColor(s.attendance_rate)}>
                                                            {formatRate(s.attendance_rate)}
                                                        </td>
                                                        <td data-label="操作">
                                                            <button
                                                                onClick={() => fetchStudentHistory(s.student_id)}
                                                                className={styles.detailBtn}
                                                            >
                                                                詳細
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Pagination Controls */}
                                        {attendanceData?.totalCount > ITEMS_PER_PAGE && (
                                            <div className={styles.footer}>
                                                <div className={styles.paginationInfo}>
                                                    表示中: {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, attendanceData.totalCount)} / {attendanceData.totalCount} 件
                                                </div>

                                                <div className={styles.paginationControls}>
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className={styles.pageBtn}
                                                    >
                                                        &lt; 前へ
                                                    </button>

                                                    <span className={styles.pageIndicator}>
                                                        Page {currentPage} / {Math.ceil(attendanceData.totalCount / ITEMS_PER_PAGE)}
                                                    </span>

                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(attendanceData.totalCount / ITEMS_PER_PAGE)))}
                                                        disabled={currentPage >= Math.ceil(attendanceData.totalCount / ITEMS_PER_PAGE)}
                                                        className={styles.pageBtn}
                                                    >
                                                        次へ &gt;
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>

                                ) : (
                                    <div className={styles.studentDetail}>
                                        <div className={styles.detailHeader}>
                                            <button
                                                onClick={() => { setSelectedStudent(null); setStudentHistory(null); }}
                                                className={styles.backBtn}
                                            >
                                                ← 一覧に戻る
                                            </button>
                                            <button
                                                onClick={handleDownloadPDF}
                                                disabled={isPdfGenerating}
                                                className={styles.pdfBtn}
                                            >
                                                {isPdfGenerating ? '生成中...' : '📄 PDF出力'}
                                            </button>
                                        </div>

                                        {historyLoading ? (
                                            <div className={styles.loading}>読み込み中...</div>
                                        ) : studentHistory && (
                                            <>
                                                <h3>
                                                    学籍番号: {selectedStudent}
                                                    <span style={{ marginLeft: '1.5em', fontSize: '0.9em' }}>
                                                        クラス: {studentHistory.studentInfo?.class_name || attendanceData?.students?.find(s => s.student_id === selectedStudent)?.class_name || '未設定'}
                                                    </span>
                                                    <span style={{ marginLeft: '1.5em', fontSize: '0.9em' }}>
                                                        氏名: {formatStudentName(studentHistory.studentInfo || attendanceData?.students?.find(s => s.student_id === selectedStudent))}
                                                    </span>
                                                </h3>

                                                <div className={styles.historySection}>
                                                    <h4>累計出席率推移</h4>
                                                    <table className={styles.table}>
                                                        <thead>
                                                            <tr>
                                                                <th>年月</th>
                                                                <th>授業日数</th>
                                                                <th>出席日数</th>
                                                                <th>欠席日数</th>
                                                                <th>遅刻・早退</th>
                                                                <th>累計出席率</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentHistory.cumulativeData?.slice().reverse().map(d => (
                                                                <tr key={`${d.year}-${d.month}`}>
                                                                    <td>{d.year}年{d.month}月</td>
                                                                    <td>{(d.attendance_days || 0) + (d.absence_days || 0)}</td>
                                                                    <td>{d.attendance_days}</td>
                                                                    <td>{d.absence_days}</td>
                                                                    <td>{d.late_slots ?? '-'}</td>
                                                                    <td className={getRateColor(d.attendance_rate)}>
                                                                        {formatRate(d.attendance_rate)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className={styles.historySection}>
                                                    <h4>月別出席率</h4>
                                                    <table className={styles.table}>
                                                        <thead>
                                                            <tr>
                                                                <th>年月</th>
                                                                <th>授業日数</th>
                                                                <th>出席日数</th>
                                                                <th>欠席日数</th>
                                                                <th>遅刻・早退</th>
                                                                <th>月次出席率</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentHistory.monthlyData?.slice().reverse().map(d => (
                                                                <tr key={`${d.year}-${d.month}`}>
                                                                    <td>{d.year}年{d.month}月</td>
                                                                    <td>{(d.attendance_days || 0) + (d.absence_days || 0)}</td>
                                                                    <td>{d.attendance_days}</td>
                                                                    <td>{d.absence_days}</td>
                                                                    <td>{d.late_slots ?? '-'}</td>
                                                                    <td className={getRateColor(d.attendance_rate)}>
                                                                        {formatRate(d.attendance_rate)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}


                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 管理者用インポート機能 */}
            {
                (userRole === 'admin' || userRole === 'teacher') && (
                    <div className={styles.importSection}>
                        <h3>データインポート</h3>
                        <div className={styles.importForm}>
                            <div className={styles.importRow}>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    className={styles.fileInput}
                                />
                            </div>
                            <div className={styles.importRow}>
                                <select
                                    value={importYear}
                                    onChange={(e) => setImportYear(parseInt(e.target.value))}
                                    className={styles.select}
                                >
                                    {[2024, 2025, 2026].map(y => (
                                        <option key={y} value={y}>{y}年</option>
                                    ))}
                                </select>
                                <select
                                    value={importMonth}
                                    onChange={(e) => setImportMonth(parseInt(e.target.value))}
                                    className={styles.select}
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{i + 1}月</option>
                                    ))}
                                </select>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={importCumulative}
                                        onChange={(e) => setImportCumulative(e.target.checked)}
                                    />
                                    累計
                                </label>
                            </div>
                            <button
                                onClick={handleImport}
                                disabled={!importFile || importing}
                                className={styles.importBtn}
                            >
                                {importing ? 'インポート中...' : 'インポート'}
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
