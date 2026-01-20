'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchJlptAnalyticsData } from '@/app/actions/jlpt'
import { Bar, Line } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js'
// ... (previous imports)
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import styles from './page.module.css'

// Chart.js registration
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
)



function JlptSessionRow({ sessionData }) {
    const [isOpen, setIsOpen] = useState(false)
    const passRate = sessionData.totalExaminees > 0
        ? ((sessionData.totalPassers / sessionData.totalExaminees) * 100).toFixed(1)
        : 0

    return (
        <div className={styles.sessionGroup}>
            <div
                className={styles.sessionHeader}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={styles.sessionTitle}>
                    {sessionData.session}
                    <span className={styles.sessionSummary}>
                        受験: {sessionData.totalExaminees}名 / 合格: {sessionData.totalPassers}名 (合格率: {passRate}%)
                    </span>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {isOpen && (
                <div className={styles.sessionDetails}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>レベル</th>
                                <th>受験者数</th>
                                <th>合格者数</th>
                                <th>合格率</th>
                                <th>平均点</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessionData.items.map((row, index) => (
                                <tr key={`${row.session}-${row.level}-${index}`}>
                                    <td>
                                        <span className={`${styles.badge} ${styles[`badge${row.level}`]}`}>
                                            {row.level}
                                        </span>
                                    </td>
                                    <td>{row.examinees}</td>
                                    <td>{row.passers}</td>
                                    <td style={{ fontWeight: 600 }}>{row.passRate}%</td>
                                    <td>{row.averageScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default function AnalyticsPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState('grades') // 'grades' or 'jlpt'

    // Grade analytics state
    const [grades, setGrades] = useState([])
    const [loadingGrades, setLoadingGrades] = useState(true)
    const [selectedTerm, setSelectedTerm] = useState('')
    const [selectedClass, setSelectedClass] = useState('')
    const [terms, setTerms] = useState([])
    const [classes, setClasses] = useState([])

    // JLPT analytics state
    const [jlptData, setJlptData] = useState([])
    const [enhancedJlptStats, setEnhancedJlptStats] = useState(null)
    const [loadingJlpt, setLoadingJlpt] = useState(true)

    // Class Analysis State
    const [selectedJlptClass, setSelectedJlptClass] = useState('')
    const [jlptSubTab, setJlptSubTab] = useState('yearly') // 'yearly' or 'class'
    const [debugInfo, setDebugInfo] = useState(null)

    useEffect(() => {
        fetchGrades()
        fetchJlptData()
    }, [])

    // Calculate Class Summary List for List View
    const classSummaryList = useMemo(() => {
        if (!enhancedJlptStats?.studentStats) return []

        const groups = enhancedJlptStats.studentStats.reduce((acc, student) => {
            const cls = student.class || '未所属'
            if (!acc[cls]) acc[cls] = []
            acc[cls].push(student)
            return acc
        }, {})

        return Object.entries(groups).map(([className, students]) => {
            const total = students.length
            const n3Plus = students.filter(s =>
                s.levels.N1.status === '合格' ||
                s.levels.N2.status === '合格' ||
                s.levels.N3.status === '合格'
            ).length
            const n3PlusRate = total > 0 ? ((n3Plus / total) * 100).toFixed(0) : 0

            // Calculate level counts for summary
            const n1 = students.filter(s => s.levels.N1.status === '合格').length
            const n2 = students.filter(s => s.levels.N2.status === '合格').length
            const n3 = students.filter(s => s.levels.N3.status === '合格').length

            return { className, total, n3Plus, n3PlusRate, n1, n2, n3, students }
        }).sort((a, b) => a.className.localeCompare(b.className))
    }, [enhancedJlptStats])

    const currentClassStats = useMemo(() => {
        return classSummaryList.find(c => c.className === selectedJlptClass)
    }, [classSummaryList, selectedJlptClass])

    const fetchGrades = async () => {
        try {
            const { data, error } = await supabase
                .from('grade_records')
                .select('*')
                .order('year_term', { ascending: false })

            if (error) throw error

            setGrades(data || [])

            const uniqueTerms = [...new Set(data.map(item => item.year_term))].sort().reverse()
            const uniqueClasses = [...new Set(data.map(item => item.class_name))].sort()

            setTerms(uniqueTerms)
            setClasses(uniqueClasses)

            if (uniqueTerms.length > 0) setSelectedTerm(uniqueTerms[0])
        } catch (error) {
            console.error('Error fetching grades:', error)
        } finally {
            setLoadingGrades(false)
        }
    }

    const fetchJlptData = async () => {
        try {
            // Use Server Action for reliable data fetching
            const result = await fetchJlptAnalyticsData()

            if (result.error) {
                console.error('Server Action Error:', result.error)
            }

            if (result.debug) {
                setDebugInfo(result.debug)
            }

            if (result.stats) {
                setJlptData(result.stats)
            }

            if (result.enhanced) {
                setEnhancedJlptStats(result.enhanced)
            }
        } catch (error) {
            console.error('Error fetching JLPT data:', error)
        } finally {
            setLoadingJlpt(false)
        }
    }

    // --- Grade Analytics Processing ---
    const filteredGrades = grades.filter(g =>
        (selectedTerm ? g.year_term === selectedTerm : true) &&
        (selectedClass ? g.class_name === selectedClass : true)
    )

    const gradeDistribution = {
        labels: ['A (80-100)', 'B (70-79)', 'C (60-69)', 'D (50-59)', 'F (0-49)'],
        datasets: [{
            label: '人数',
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
                'rgba(34, 197, 94, 0.6)',
                'rgba(59, 130, 246, 0.6)',
                'rgba(250, 204, 21, 0.6)',
                'rgba(249, 115, 22, 0.6)',
                'rgba(239, 68, 68, 0.6)',
            ],
            borderWidth: 1,
        }],
    }

    filteredGrades.forEach(g => {
        const score = g.report_card_total || 0
        if (score >= 80) gradeDistribution.datasets[0].data[0]++
        else if (score >= 70) gradeDistribution.datasets[0].data[1]++
        else if (score >= 60) gradeDistribution.datasets[0].data[2]++
        else if (score >= 50) gradeDistribution.datasets[0].data[3]++
        else gradeDistribution.datasets[0].data[4]++
    })

    const subjectTotals = { vocab: 0, reading: 0, listening: 0, grammar: 0, writing: 0, conversation: 0 }
    const subjectCounts = { vocab: 0, reading: 0, listening: 0, grammar: 0, writing: 0, conversation: 0 }

    filteredGrades.forEach(g => {
        if (g.report_card_data) {
            Object.keys(subjectTotals).forEach(subj => {
                if (g.report_card_data[subj]?.total) {
                    subjectTotals[subj] += g.report_card_data[subj].total
                    subjectCounts[subj]++
                }
            })
        }
    })

    const subjectAverages = {
        labels: ['文字・語彙', '読解', '聴解', '文法', '作文', '会話'],
        datasets: [{
            label: '平均点',
            data: [
                subjectCounts.vocab ? (subjectTotals.vocab / subjectCounts.vocab).toFixed(1) : 0,
                subjectCounts.reading ? (subjectTotals.reading / subjectCounts.reading).toFixed(1) : 0,
                subjectCounts.listening ? (subjectTotals.listening / subjectCounts.listening).toFixed(1) : 0,
                subjectCounts.grammar ? (subjectTotals.grammar / subjectCounts.grammar).toFixed(1) : 0,
                subjectCounts.writing ? (subjectTotals.writing / subjectCounts.writing).toFixed(1) : 0,
                subjectCounts.conversation ? (subjectTotals.conversation / subjectCounts.conversation).toFixed(1) : 0,
            ],
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
        }]
    }

    // --- JLPT Analytics Processing ---
    const totalJlptExaminees = jlptData.reduce((acc, curr) => acc + (curr.examinees || 0), 0)
    const totalJlptPassers = jlptData.reduce((acc, curr) => acc + (curr.passers || 0), 0)
    const overallJlptPassRate = totalJlptExaminees > 0 ? ((totalJlptPassers / totalJlptExaminees) * 100).toFixed(1) : 0

    // Group JLPT data by session for the detailed view
    const jlptSessions = jlptData.reduce((acc, item) => {
        if (!acc[item.session]) {
            acc[item.session] = {
                session: item.session,
                items: [],
                totalExaminees: 0,
                totalPassers: 0
            };
        }
        acc[item.session].items.push(item);
        acc[item.session].totalExaminees += (item.examinees || 0);
        acc[item.session].totalPassers += (item.passers || 0);
        return acc;
    }, {});

    // Sort sessions descending (newest first)
    const sortedSessionKeys = Object.keys(jlptSessions).sort((a, b) => b.localeCompare(a));

    const sessionGroups = {}
    jlptData.forEach(item => {
        if (!sessionGroups[item.session]) {
            sessionGroups[item.session] = { total: 0, passed: 0 }
        }
        sessionGroups[item.session].total += item.examinees || 0
        sessionGroups[item.session].passed += item.passers || 0
    })

    const uniqueSessions = Object.keys(sessionGroups)
    const jlptTrendData = {
        labels: uniqueSessions,
        datasets: [{
            label: '全体合格率 (%)',
            data: uniqueSessions.map(session => {
                const s = sessionGroups[session]
                return s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) : 0
            }),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            tension: 0.3,
        }, {
            label: '近似曲線',
            data: (() => {
                const yValues = uniqueSessions.map(session => {
                    const s = sessionGroups[session];
                    return s.total > 0 ? (s.passed / s.total) * 100 : 0;
                });
                const n = yValues.length;
                if (n === 0) return [];
                const xValues = Array.from({ length: n }, (_, i) => i);
                const sumX = xValues.reduce((a, b) => a + b, 0);
                const sumY = yValues.reduce((a, b) => a + b, 0);
                const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
                const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
                const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                const intercept = (sumY - slope * sumX) / n;
                return xValues.map(x => (slope * x + intercept).toFixed(1));
            })(),
            borderColor: 'rgba(59, 130, 246, 0.4)',
            borderDash: [5, 5],
            pointRadius: 0,
            borderWidth: 2,
            tension: 0
        }],
    }

    const levelStats = {}
    jlptData.forEach(item => {
        if (!levelStats[item.level]) {
            levelStats[item.level] = { sum: 0, count: 0 }
        }
        const score = parseFloat(item.averageScore)
        if (score > 0) {
            levelStats[item.level].sum += score
            levelStats[item.level].count += 1
        }
    })

    const levels = ['N1', 'N2', 'N3', 'N4', 'N5']
    const jlptScoreData = {
        labels: levels,
        datasets: [{
            label: '平均点 (全期間)',
            data: levels.map(l => {
                const s = levelStats[l]
                return s && s.count > 0 ? (s.sum / s.count).toFixed(1) : 0
            }),
            backgroundColor: [
                'rgba(239, 68, 68, 0.6)',
                'rgba(249, 115, 22, 0.6)',
                'rgba(245, 158, 11, 0.6)',
                'rgba(132, 204, 22, 0.6)',
                'rgba(59, 130, 246, 0.6)',
            ],
            borderColor: [
                'rgb(239, 68, 68)',
                'rgb(249, 115, 22)',
                'rgb(245, 158, 11)',
                'rgb(132, 204, 22)',
                'rgb(59, 130, 246)',
            ],
            borderWidth: 1,
        }]
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' }
            },
            x: {
                grid: { display: false }
            }
        }
    }

    if (loadingGrades && loadingJlpt) {
        return (
            <div className={styles.loadingContainer}>
                <div className="spinner"></div>
                <p>データを読み込んでいます...</p>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>統計・分析</h1>
                <p className={styles.subtitle}>成績データおよびJLPT結果の分析概要</p>
            </header>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'grades' ? styles.active : ''}`}
                    onClick={() => setActiveTab('grades')}
                >
                    成績統計
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'jlpt' ? styles.active : ''}`}
                    onClick={() => setActiveTab('jlpt')}
                >
                    JLPT分析
                </button>
            </div>

            {/* Grade Analytics Tab */}
            {activeTab === 'grades' && (
                <>
                    <div className={styles.filters}>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>学期</label>
                            <select
                                className={styles.filterSelect}
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                            >
                                <option value="">すべての学期</option>
                                {terms.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>クラス</label>
                            <select
                                className={styles.filterSelect}
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                            >
                                <option value="">すべてのクラス</option>
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>成績分布</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={gradeDistribution} options={chartOptions} />
                            </div>
                        </div>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>科目別平均点</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={subjectAverages} options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }} />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* JLPT Analytics Tab */}
            {activeTab === 'jlpt' && (
                <>
                    {/* Sub Tabs */}
                    <div className={styles.subTabs}>
                        <button
                            className={`${styles.subTab} ${jlptSubTab === 'yearly' ? styles.active : ''}`}
                            onClick={() => setJlptSubTab('yearly')}
                        >
                            年度別分析
                        </button>
                        <button
                            className={`${styles.subTab} ${jlptSubTab === 'class' ? styles.active : ''}`}
                            onClick={() => {
                                setJlptSubTab('class');
                                setSelectedJlptClass(''); // Reset selected class when switching to class tab
                            }}
                        >
                            クラス別分析
                        </button>
                    </div>

                    {/* Yearly Analysis Content */}
                    {jlptSubTab === 'yearly' && (
                        <>
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>総受験者数 (延べ人数)</span>
                                    <div className={styles.statValueRow}>
                                        <span className={styles.statValue}>{totalJlptExaminees.toLocaleString()}</span>
                                        <span className={styles.statUnit}>名</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>総合格者数</span>
                                    <div className={styles.statValueRow}>
                                        <span className={styles.statValue}>{totalJlptPassers.toLocaleString()}</span>
                                        <span className={styles.statUnit}>名</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>全体合格率</span>
                                    <div className={styles.statValueRow}>
                                        <span className={styles.statValue}>{overallJlptPassRate}%</span>
                                        <span className={styles.statUnit}>平均</span>
                                    </div>
                                </div>
                                {enhancedJlptStats?.overallN3PlusRate && (
                                    <div className={styles.statCard}>
                                        <span className={styles.statLabel}>卒業時N3以上保有率</span>
                                        <div className={styles.statValueRow}>
                                            <span className={styles.statValue}>{enhancedJlptStats.overallN3PlusRate.rate}%</span>
                                            <span className={styles.statUnit}>{enhancedJlptStats.overallN3PlusRate.n3PlusStudents}/{enhancedJlptStats.overallN3PlusRate.totalUniqueStudents}名</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={styles.chartsRow}>
                                <div className={styles.chartCard}>
                                    <h3 className={styles.chartTitle}>合格率の推移</h3>
                                    <div className={styles.chartContainer}>
                                        <Line data={jlptTrendData} options={chartOptions} />
                                    </div>
                                </div>
                                <div className={styles.chartCard}>
                                    <h3 className={styles.chartTitle}>レベル別 平均点</h3>
                                    <div className={styles.chartContainer}>
                                        <Bar data={jlptScoreData} options={chartOptions} />
                                    </div>
                                </div>
                            </div>

                            {/* Enhanced Statistics */}
                            {enhancedJlptStats && (
                                <>
                                    <div className={styles.chartsRow}>
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>レベル別 合格率</h3>
                                            <div className={styles.chartContainer}>
                                                <Bar
                                                    data={{
                                                        labels: enhancedJlptStats.levelStats.map(s => s.level),
                                                        datasets: [{
                                                            label: '合格率 (%)',
                                                            data: enhancedJlptStats.levelStats.map(s => s.passRate),
                                                            backgroundColor: [
                                                                'rgba(239, 68, 68, 0.6)',
                                                                'rgba(249, 115, 22, 0.6)',
                                                                'rgba(245, 158, 11, 0.6)',
                                                                'rgba(132, 204, 22, 0.6)',
                                                                'rgba(59, 130, 246, 0.6)',
                                                            ],
                                                        }]
                                                    }}
                                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>年度別 合格率推移</h3>
                                            <div className={styles.chartContainer}>
                                                <Line
                                                    data={{
                                                        labels: enhancedJlptStats.yearlyTrend.map(s => s.year + '年'),
                                                        datasets: [{
                                                            label: '合格率 (%)',
                                                            data: enhancedJlptStats.yearlyTrend.map(s => s.passRate),
                                                            borderColor: 'rgb(34, 197, 94)',
                                                            backgroundColor: 'rgba(34, 197, 94, 0.5)',
                                                            tension: 0.3,
                                                        }]
                                                    }}
                                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nationality Statistics Table */}
                                    <div>
                                        <h2 className={styles.sectionTitle}>国籍別 合格率 (上位10カ国)</h2>
                                        <div className={styles.tableContainer}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>国籍</th>
                                                        <th>受験者数</th>
                                                        <th>合格者数</th>
                                                        <th>合格率</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {enhancedJlptStats.nationalityStats.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td>{row.country}</td>
                                                            <td>{row.total}</td>
                                                            <td>{row.passed}</td>
                                                            <td style={{ fontWeight: 600 }}>{row.passRate}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* N3+ Certification by Graduation Year Table */}
                                    {enhancedJlptStats.graduationN3PlusRates && (
                                        <div>
                                            <h2 className={styles.sectionTitle}>年度別卒業時N3以上保有率</h2>
                                            <div className={styles.tableContainer}>
                                                <table className={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>卒業時期</th>
                                                            <th>卒業者数</th>
                                                            <th>漢字圏N3以上保有率</th>
                                                            <th>非漢字圏N3以上保有率</th>
                                                            <th>全体N3以上取得者</th>
                                                            <th>全体N3以上保有率</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {enhancedJlptStats.graduationN3PlusRates.map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td>{row.year}</td>
                                                                <td>{row.totalStudents}名</td>
                                                                <td>
                                                                    {row.kanji_stats
                                                                        ? `${row.kanji_stats.rate.toFixed(1)}% (${row.kanji_stats.n3_plus}/${row.kanji_stats.total})`
                                                                        : '-'}
                                                                </td>
                                                                <td>
                                                                    {row.non_kanji_stats
                                                                        ? `${row.non_kanji_stats.rate.toFixed(1)}% (${row.non_kanji_stats.n3_plus}/${row.non_kanji_stats.total})`
                                                                        : '-'}
                                                                </td>
                                                                <td>{row.n3PlusStudents}名</td>
                                                                <td style={{ fontWeight: 600, color: parseFloat(row.rate) >= 50 ? '#22c55e' : '#f59e0b' }}>
                                                                    {row.rate}%
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div>
                                <h2 className={styles.sectionTitle}>詳細データ</h2>
                                <div className={styles.sessionsContainer}>
                                    {sortedSessionKeys.map(sessionKey => (
                                        <JlptSessionRow key={sessionKey} sessionData={jlptSessions[sessionKey]} />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Class Analysis Content */}
                    {jlptSubTab === 'class' && enhancedJlptStats?.studentStats && (
                        <>
                            {!selectedJlptClass ? (
                                /* List View */
                                <div>
                                    <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>クラス別一覧</h2>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>クラス名</th>
                                                    <th>在籍数</th>
                                                    <th>N3以上取得率</th>
                                                    <th>N3以上取得数</th>
                                                    <th>詳細</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classSummaryList.map((cls) => (
                                                    <tr
                                                        key={cls.className}
                                                        onClick={() => setSelectedJlptClass(cls.className)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td style={{ fontWeight: 600 }}>{cls.className}</td>
                                                        <td>{cls.total}名</td>
                                                        <td style={{ fontWeight: 600, color: parseFloat(cls.n3PlusRate) >= 50 ? '#166534' : 'inherit' }}>
                                                            {cls.n3PlusRate}%
                                                        </td>
                                                        <td>{cls.n3Plus}名</td>
                                                        <td>
                                                            <button
                                                                className={styles.toggleBtn}
                                                                style={{ background: '#eff6ff', color: '#3b82f6', fontSize: '0.75rem', padding: '4px 12px' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedJlptClass(cls.className);
                                                                }}
                                                            >
                                                                詳細
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {classSummaryList.length === 0 && (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                                クラスデータがありません
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Detail View */
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
                                        <button
                                            onClick={() => setSelectedJlptClass('')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px',
                                                padding: '0.5rem 1rem', cursor: 'pointer', color: '#4b5563', fontSize: '0.875rem',
                                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                            }}
                                        >
                                            <ArrowLeft size={16} /> 一覧に戻る
                                        </button>
                                        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                                            詳細分析: {selectedJlptClass}
                                        </h2>
                                    </div>

                                    {currentClassStats && (
                                        <>
                                            <div className={styles.statsGrid}>
                                                <div className={styles.statCard}>
                                                    <span className={styles.statLabel}>在籍数</span>
                                                    <div className={styles.statValueRow}>
                                                        <span className={styles.statValue}>{currentClassStats.total}</span>
                                                        <span className={styles.statUnit}>名</span>
                                                    </div>
                                                </div>
                                                <div className={styles.statCard}>
                                                    <span className={styles.statLabel}>N3以上取得率</span>
                                                    <div className={styles.statValueRow}>
                                                        <span className={styles.statValue}>{currentClassStats.n3PlusRate}%</span>
                                                        <span className={styles.statUnit}>{currentClassStats.n3Plus}/{currentClassStats.total}名</span>
                                                    </div>
                                                </div>
                                                <div className={styles.statCard}>
                                                    <span className={styles.statLabel}>合格者内訳</span>
                                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>N1</div>
                                                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#991b1b' }}>{currentClassStats.n1}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>N2</div>
                                                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#9a3412' }}>{currentClassStats.n2}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>N3</div>
                                                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#92400e' }}>{currentClassStats.n3}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.tableContainer}>
                                                <table className={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>学籍番号</th>
                                                            <th>氏名</th>
                                                            <th>N1</th>
                                                            <th>N2</th>
                                                            <th>N3</th>
                                                            <th>N4</th>
                                                            <th>N5</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentClassStats.students
                                                            .sort((a, b) => a.studentId.localeCompare(b.studentId))
                                                            .map(student => (
                                                                <tr key={student.studentId}>
                                                                    <td>{student.studentId}</td>
                                                                    <td>{student.name}</td>
                                                                    {['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                                        const stat = student.levels[level];
                                                                        const badgeClass = stat.status === '合格' ? styles.badgePassed :
                                                                            stat.status === '不合格' ? styles.badgeFailed : styles.badgeNone;
                                                                        return (
                                                                            <td key={level} title={stat.details ? `${stat.status}\n${stat.date}\n${stat.score}` : ''}>
                                                                                <span className={`${styles.badge} ${badgeClass}`}>
                                                                                    {stat.status === '未受験' ? '-' : stat.status}
                                                                                </span>
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Class Analysis - No Data State */}
                    {jlptSubTab === 'class' && (!enhancedJlptStats?.studentStats || enhancedJlptStats.studentStats.length === 0) && (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                            <p>表示できるクラスデータがありません。</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                学生データの読み込みに失敗したか、条件に一致するデータがありません。（対象: {enhancedJlptStats?.students?.length || 0}名）
                            </p>
                        </div>
                    )}
                </>
            )}

            <div className={styles.footer}>
                <p>※ データは現在のフィルタ設定に基づいています。</p>
            </div>
        </div>
    )
}
