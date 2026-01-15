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
    const [selectedClass, setSelectedClass] = useState(null)
    const [classMembers, setClassMembers] = useState(null)

    // ... (既存のuseEffectなど)

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

    // ... (fetchDataなど)

    // ... (handleDownloadPDFなど)

    {/* クラス別 */ }
    {
        activeTab === 'class' && classData && (
            <div className={styles.classStats}>
                {!selectedClass ? (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>クラス</th>
                                <th>人数</th>
                                <th>平均出席率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classData.classes?.map(c => (
                                <tr
                                    key={`${c.grade}-${c.classCode}`}
                                    onClick={() => fetchClassMembers(c.classCode)}
                                    style={{ cursor: 'pointer', backgroundColor: 'transparent' }}
                                    className={styles.clickableRow}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ color: '#2563eb', fontWeight: 'bold' }}>{c.className}</td>
                                    <td>{c.studentCount}名</td>
                                    <td className={getRateColor(c.averageRate)}>
                                        {formatRate(c.averageRate)}
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
        )
    }

    {/* 個別 */ }
    {
        activeTab === 'individual' && (
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
        )
    }
                    </>
                )
}
            </div >

    {/* 管理者用インポート機能 */ }
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
