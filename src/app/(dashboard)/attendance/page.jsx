'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import styles from './page.module.css'

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

    useEffect(() => {
        fetchUserRole()
        fetchAvailableFiles()
    }, [])

    useEffect(() => {
        if (selectedYear && selectedMonth) {
            fetchData()
        }
    }, [selectedYear, selectedMonth, isCumulative, activeTab])

    useEffect(() => {
        if (!originalData) return

        let filtered = { ...originalData }

        // 1. Filter by Rate (if active)
        if (rateFilter.type !== 'none') {
            const threshold = rateFilter.value
            const isMonthly = rateFilter.type.startsWith('monthly')

            // Function to check if student meets criteria
            const checkStudent = (s) => {
                let rate = 0
                if (isMonthly) rate = s.attendance_rate || 0
                else rate = s.cumulative_attendance_rate || 0 // Assuming cumulative_attendance_rate exists for cumulative filter

                return rate <= threshold
            }

            if (activeTab === 'individual' && filtered.students) {
                filtered.students = filtered.students.filter(checkStudent)
            }
            // Apply to class members if viewing class detail
            if (activeTab === 'class' && classMembers) {
                setClassMembers(classMembers.filter(checkStudent))
            }
        }

        setAttendanceData(filtered)

    }, [originalData, activeTab, rateFilter, classMembers]) // Added classMembers to dependencies for class view filtering

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [activeTab, rateFilter, studentSearch, sortOrder])

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            setUserRole(data?.role)
        }
    }

    const fetchAvailableFiles = async () => {
        try {
            const res = await fetch('/api/attendance?type=files', { cache: 'no-store' })
            const data = await res.json()
            setAvailableFiles(data)

            // 最新の年月を選択
            const files = isCumulative ? data.cumulativeFiles : data.monthlyFiles
            if (files.length > 0) {
                setSelectedYear(files[0].year)
                setSelectedMonth(files[0].month)
            }
        } catch (err) {
            setError('データの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                type: activeTab,
                year: selectedYear,
                month: selectedMonth,
                cumulative: isCumulative
            })

            if (activeTab === 'individual' && studentSearch) {
                params.append('search', studentSearch)
            }

            const res = await fetch(`/api/attendance?${params}`, { cache: 'no-store' })
            const data = await res.json()

            setOriginalData(data) // Store original data
            setAttendanceData(data) // Initialize filtered data

            switch (activeTab) {
                case 'school':
                    setSchoolData(data)
                    break
                case 'grade':
                    setGradeData(data)
                    break
                case 'class':
                    setClassData(data)
                    break
                case 'individual':
                    setIndividualData(data)
                    break
            }
        } catch (err) {
            setError('データの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const fetchStudentHistory = async (studentId) => {
        setHistoryLoading(true)
        setSelectedStudent(studentId)
        try {
            const res = await fetch(`/api/attendance?type=individual&studentId=${studentId}`, { cache: 'no-store' })
            const data = await res.json()
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
            const params = new URLSearchParams({
                type: 'individual',
                year: selectedYear,
                month: selectedMonth,
                cumulative: isCumulative,
                class: className
            })
            const res = await fetch(`/api/attendance?${params}`, { cache: 'no-store' })
            const data = await res.json()
            setClassMembers(data.students || [])
        } catch (err) {
            console.error('Failed to fetch class members:', err)
        }
    }

    const handleDownloadPDF = async () => {
        if (!selectedStudent || !studentHistory) return
        setIsPdfGenerating(true)
        try {
            // 学生情報 (APIから取得した詳細情報、なければ一覧の情報)
            const sMaster = studentHistory.studentInfo
            const sList = individualData?.students?.find(s => s.student_id === selectedStudent)

            const name = sMaster?.full_name || sMaster?.name || sList?.student_name || '不明'
            const className = sMaster?.class_name || sList?.class_name || '未設定'

            // 最新の累計出席率
            const latestCumulative = studentHistory.cumulativeData?.length > 0
                ? studentHistory.cumulativeData[studentHistory.cumulativeData.length - 1]
                : { attendance_rate: 0 }

            const payload = {
                student: {
                    id: selectedStudent,
                    name: name,
                    className: className
                },
                history: studentHistory,
                currentStats: {
                    rate: latestCumulative.attendance_rate
                }
            }

            const res = await fetch('/api/attendance/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error('PDF generation failed')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'attendance_' + selectedStudent + '.pdf'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            console.error(err)
            alert('PDF生成に失敗しました: ' + err.message)
        } finally {
            setIsPdfGenerating(false)
        }
    }

    // --- Bulk Export Logic ---
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = attendanceData.students?.map(s => s.student_id) || []
            setSelectedStudents(new Set(allIds))
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

            const studentsToExport = attendanceData.students.filter(s => selectedStudents.has(s.student_id))

            for (const student of studentsToExport) {
                // Fetch student history for detailed PDF generation
                const historyRes = await fetch(`/api/attendance?type=individual&studentId=${student.student_id}`, { cache: 'no-store' })
                const studentHistoryData = await historyRes.json()

                // Latest cumulative rate from history
                const latestCumulative = studentHistoryData.cumulativeData?.length > 0
                    ? studentHistoryData.cumulativeData[studentHistoryData.cumulativeData.length - 1]
                    : { attendance_rate: 0 }

                // Fetch PDF blob
                const pdfRes = await fetch('/api/attendance/pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        student: {
                            id: student.student_id,
                            name: student.full_name || student.student_name || student.name,
                            className: student.class_name
                        },
                        history: studentHistoryData,
                        currentStats: {
                            rate: latestCumulative.attendance_rate
                        }
                    })
                })

                if (pdfRes.ok) {
                    const blob = await pdfRes.blob()
                    folder.file(`${student.student_id}_${student.full_name || student.student_name || student.name}.pdf`, blob)
                } else {
                    console.warn(`Failed to generate PDF for student ${student.student_id}: ${pdfRes.statusText}`)
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

            const data = await res.json()
            if (res.ok) {
                alert(data.message)
                fetchAvailableFiles()
                fetchData()
            } else {
                alert(`エラー: ${data.error}`)
            }
        } catch (err) {
            alert(`インポートエラー: ${err.message}`)
        } finally {
            setImporting(false)
            setImportFile(null)
        }
    }

    const formatStudentName = (student) => {
        if (!student) return ''
        let name = student.full_name || student.student_name || student.name || '不明'
        const nationality = student.nationality
        const kana = student.name_kana

        // 中国の方のみカタカナを追加
        const isChinese = nationality && (nationality === 'China' || nationality === '中国' || nationality.includes('China') || nationality.includes('中国'))
        if (isChinese && kana) {
            return `${name} (${kana})`
        }
        return name
    }

    const formatRate = (rate) => {
        return (rate * 100).toFixed(1) + '%'
    }

    const getRateColor = (rate) => {
        if (rate >= 0.95) return styles.rateExcellent
        if (rate >= 0.90) return styles.rateGood
        if (rate >= 0.80) return styles.rateWarning
        return styles.rateDanger
    }

    const tabs = [
        { id: 'school', label: '学校全体' },
        { id: 'grade', label: '学年別' },
        { id: 'class', label: 'クラス別' },
        { id: 'individual', label: '個別' }
    ]

    const getSortedStudents = (students) => {
        if (!students) return []
        return [...students].sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.attendance_rate - b.attendance_rate
            } else {
                return b.attendance_rate - a.attendance_rate
            }
        })
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
                    <div className={styles.loading}>読み込み中...</div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : (
                    <>
                        {/* 学校全体 */}
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
                            </div>
                        )}

                        {/* 学年別 */}
                        {activeTab === 'grade' && gradeData && (
                            <div className={styles.gradeStats}>
                                <div className={styles.gradeCards}>
                                    {gradeData.grades?.map(g => (
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
                                                    <td>{c.className}</td>
                                                    <td>{c.studentCount}名</td>
                                                    <td className={getRateColor(c.averageRate)}>
                                                        {formatRate(c.averageRate)}
                                                    </td>
                                                    <td>
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
                                                        <td>{s.student_id}</td>
                                                        <td>{formatStudentName(s)}</td>
                                                        <td className={getRateColor(s.attendance_rate)}>
                                                            {formatRate(s.attendance_rate)}
                                                        </td>
                                                        <td>
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
                                                            checked={attendanceData?.students?.length > 0 && selectedStudents.size === attendanceData.students.length}
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
                                                {(() => {
                                                    const sortedStudents = getSortedStudents(attendanceData?.students);
                                                    const totalPages = Math.ceil((sortedStudents?.length || 0) / ITEMS_PER_PAGE);
                                                    const paginatedStudents = sortedStudents?.slice(
                                                        (currentPage - 1) * ITEMS_PER_PAGE,
                                                        currentPage * ITEMS_PER_PAGE
                                                    );

                                                    return paginatedStudents?.map(s => (
                                                        <tr key={s.student_id}>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedStudents.has(s.student_id)}
                                                                    onChange={() => handleSelectStudent(s.student_id)}
                                                                />
                                                            </td>
                                                            <td>{s.student_id}</td>
                                                            <td>{s.class_name || '-'}</td>
                                                            <td>{formatStudentName(s)}</td>
                                                            <td>{s.grade === 0 ? '非在籍者' : `${s.grade}年`}</td>
                                                            <td className={getRateColor(s.attendance_rate)}>
                                                                {formatRate(s.attendance_rate)}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    onClick={() => fetchStudentHistory(s.student_id)}
                                                                    className={styles.detailBtn}
                                                                >
                                                                    詳細
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>

                                        {/* Pagination Controls */}
                                        {(() => {
                                            const sortedStudents = getSortedStudents(attendanceData?.students);
                                            const totalPages = Math.ceil((sortedStudents?.length || 0) / ITEMS_PER_PAGE);

                                            if (totalPages <= 1) return null;

                                            return (
                                                <div className={styles.footer}>
                                                    <div className={styles.paginationInfo}>
                                                        表示中: {sortedStudents?.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedStudents?.length || 0)} / {sortedStudents?.length || 0} 件
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
                                                            Page {currentPage} / {totalPages}
                                                        </span>

                                                        <button
                                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                            disabled={currentPage === totalPages}
                                                            className={styles.pageBtn}
                                                        >
                                                            次へ &gt;
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })()}
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
                                                                <th>出席日数</th>
                                                                <th>欠席日数</th>
                                                                <th>出席率</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentHistory.cumulativeData?.slice().reverse().map(d => (
                                                                <tr key={`${d.year}-${d.month}`}>
                                                                    <td>{d.year}年{d.month}月</td>
                                                                    <td>{d.attendance_days}</td>
                                                                    <td>{d.absence_days}</td>
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
                                                                <th>出席日数</th>
                                                                <th>欠席日数</th>
                                                                <th>出席率</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentHistory.monthlyData?.slice().reverse().map(d => (
                                                                <tr key={`${d.year}-${d.month}`}>
                                                                    <td>{d.year}年{d.month}月</td>
                                                                    <td>{d.attendance_days}</td>
                                                                    <td>{d.absence_days}</td>
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
                userRole === 'admin' && (
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
