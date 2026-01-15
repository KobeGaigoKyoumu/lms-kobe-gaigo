'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
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

    const [schoolData, setSchoolData] = useState(null)
    const [gradeData, setGradeData] = useState(null)
    const [classData, setClassData] = useState(null)
    const [individualData, setIndividualData] = useState(null)
    const [studentSearch, setStudentSearch] = useState('')
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [studentHistory, setStudentHistory] = useState(null)

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
            const files = data.cumulativeFiles || data.monthlyFiles
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
        setSelectedStudent(studentId)
        try {
            const res = await fetch(`/api/attendance?type=individual&studentId=${studentId}`, { cache: 'no-store' })
            const data = await res.json()
            setStudentHistory(data)
        } catch (err) {
            console.error('Failed to fetch student history:', err)
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
            </div>

            {/* タブ */}
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
                                                    <td className={styles.classNumber}>{c.className}</td>
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
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>学籍番号</th>
                                                <th>氏名</th>
                                                <th>学年</th>
                                                <th>出席率</th>
                                                <th>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {individualData?.students?.map(s => (
                                                <tr key={s.student_id}>
                                                    <td>{s.student_id}</td>
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
                                            ))}
                                        </tbody>
                                    </table>
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

                                        {studentHistory && (
                                            <>
                                                <h3>
                                                    学籍番号: {selectedStudent}
                                                    <span style={{ marginLeft: '1.5em', fontSize: '0.9em' }}>
                                                        クラス: {studentHistory.studentInfo?.class_name || individualData?.students?.find(s => s.student_id === selectedStudent)?.class_name || '未設定'}
                                                    </span>
                                                    <span style={{ marginLeft: '1.5em', fontSize: '0.9em' }}>
                                                        氏名: {formatStudentName(studentHistory.studentInfo || individualData?.students?.find(s => s.student_id === selectedStudent))}
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

                        {/* 管理者用インポート機能 */}
                        {userRole === 'admin' && (
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
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
