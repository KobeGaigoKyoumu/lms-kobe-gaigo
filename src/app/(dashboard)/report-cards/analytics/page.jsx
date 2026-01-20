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
    const [sectionScoreStats, setSectionScoreStats] = useState(null) // 科目別得点データ
    const [loadingJlpt, setLoadingJlpt] = useState(true)

    // Class Analysis State
    const [selectedJlptClass, setSelectedJlptClass] = useState('')
    const [jlptSubTab, setJlptSubTab] = useState('yearly') // 'yearly', 'class', 'compare', or 'section'
    const [nationalStats, setNationalStats] = useState(null)
    const [loadingNational, setLoadingNational] = useState(false)
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
        }).sort((a, b) => parseFloat(b.n3PlusRate) - parseFloat(a.n3PlusRate))
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

            if (result.sectionScores) {
                setSectionScoreStats(result.sectionScores)
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
                        <button
                            className={`${styles.subTab} ${jlptSubTab === 'compare' ? styles.active : ''}`}
                            onClick={() => {
                                setJlptSubTab('compare');
                                // Fetch national stats if not already loaded
                                if (!nationalStats && !loadingNational) {
                                    setLoadingNational(true);
                                    fetch('/api/jlpt/national')
                                        .then(res => res.json())
                                        .then(data => {
                                            setNationalStats(data);
                                            setLoadingNational(false);
                                        })
                                        .catch(err => {
                                            console.error('Failed to load national stats:', err);
                                            setLoadingNational(false);
                                        });
                                }
                            }}
                        >
                            全国比較
                        </button>
                        <button
                            className={`${styles.subTab} ${jlptSubTab === 'section' ? styles.active : ''}`}
                            onClick={() => setJlptSubTab('section')}
                        >
                            科目別得点
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
                                        <h2 className={styles.sectionTitle}>国籍別 合格率</h2>
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
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {classSummaryList.map((cls) => (
                                                    <tr
                                                        key={cls.className}
                                                        onClick={() => setSelectedJlptClass(cls.className)}
                                                        className={styles.clickableRow}
                                                    >
                                                        <td style={{ fontWeight: 600, color: '#111827' }}>{cls.className}</td>
                                                        <td style={{ color: '#4b5563' }}>{cls.total}名</td>
                                                        <td style={{ fontWeight: 600, color: parseFloat(cls.n3PlusRate) >= 50 ? '#22c55e' : '#f59e0b' }}>
                                                            {cls.n3PlusRate}%
                                                        </td>
                                                        <td style={{ color: '#4b5563' }}>{cls.n3Plus}名</td>
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
                                                                        // 点数形式で表示（例: 120/180）
                                                                        const scoreDisplay = stat.score ? stat.score : '-';
                                                                        const tooltipText = stat.details ? `${stat.status}\n${stat.date}\n${stat.score}` : '';

                                                                        return (
                                                                            <td key={level} style={{ position: 'relative' }}>
                                                                                {stat.status !== '未受験' ? (
                                                                                    <div className={styles.tooltipContainer} data-tooltip={tooltipText || null}>
                                                                                        <span className={`${styles.badge} ${badgeClass} ${styles.badgeTextBlack}`}>
                                                                                            {scoreDisplay}
                                                                                        </span>
                                                                                    </div>
                                                                                ) : null}
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

                    {/* National Comparison Content */}
                    {jlptSubTab === 'compare' && (
                        <>
                            <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>
                                本校 vs 全国平均（日本国内）
                            </h2>

                            {loadingNational && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                    全国データを読み込み中...
                                </div>
                            )}

                            {!loadingNational && nationalStats && enhancedJlptStats?.levelStats && (
                                <>
                                    {/* Summary Stats Cards */}
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>全国平均との比較</span>
                                            <div className={styles.statValueRow}>
                                                <span className={styles.statValue} style={{
                                                    color: (() => {
                                                        // 本校の有効データのみで平均を計算（passRateは文字列なのでparseFloat）
                                                        const schoolRates = ['N1', 'N2', 'N3', 'N4', 'N5']
                                                            .map(level => {
                                                                const stat = enhancedJlptStats.levelStats.find(s => s.level === level);
                                                                return stat ? parseFloat(stat.passRate) : null;
                                                            })
                                                            .filter(rate => rate !== null && !isNaN(rate));
                                                        const nationalRates = ['N1', 'N2', 'N3', 'N4', 'N5']
                                                            .map(level => parseFloat(nationalStats.averageRates?.japan?.[level]?.average || 0))
                                                            .filter(rate => rate > 0);

                                                        if (schoolRates.length === 0 || nationalRates.length === 0) return '#6b7280';

                                                        const schoolAvg = schoolRates.reduce((a, b) => a + b, 0) / schoolRates.length;
                                                        const nationalAvg = nationalRates.reduce((a, b) => a + b, 0) / nationalRates.length;
                                                        return schoolAvg >= nationalAvg ? '#22c55e' : '#f59e0b';
                                                    })()
                                                }}>
                                                    {(() => {
                                                        const schoolRates = ['N1', 'N2', 'N3', 'N4', 'N5']
                                                            .map(level => {
                                                                const stat = enhancedJlptStats.levelStats.find(s => s.level === level);
                                                                return stat ? parseFloat(stat.passRate) : null;
                                                            })
                                                            .filter(rate => rate !== null && !isNaN(rate));
                                                        const nationalRates = ['N1', 'N2', 'N3', 'N4', 'N5']
                                                            .map(level => parseFloat(nationalStats.averageRates?.japan?.[level]?.average || 0))
                                                            .filter(rate => rate > 0);

                                                        if (schoolRates.length === 0 || nationalRates.length === 0) return '-';

                                                        const schoolAvg = schoolRates.reduce((a, b) => a + b, 0) / schoolRates.length;
                                                        const nationalAvg = nationalRates.reduce((a, b) => a + b, 0) / nationalRates.length;
                                                        const diff = schoolAvg - nationalAvg;
                                                        return diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
                                                    })()}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>全国平均以上のレベル数</span>
                                            <div className={styles.statValueRow}>
                                                <span className={styles.statValue}>
                                                    {['N1', 'N2', 'N3', 'N4', 'N5'].filter(level => {
                                                        const schoolStat = enhancedJlptStats.levelStats.find(s => s.level === level);
                                                        const schoolRate = schoolStat?.passRate || 0;
                                                        const nationalRate = parseFloat(nationalStats.averageRates?.japan?.[level]?.average || 0);
                                                        return schoolRate > nationalRate;
                                                    }).length}
                                                </span>
                                                <span className={styles.statUnit}>/ 5レベル</span>
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>データ収集期間</span>
                                            <div className={styles.statValueRow}>
                                                <span className={styles.statValue}>{nationalStats.totalSessions}</span>
                                                <span className={styles.statUnit}>回分</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comparison Bar Chart */}
                                    <h3 className={styles.sectionTitle}>レベル別合格率比較</h3>
                                    <div className={styles.chartGrid}>
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>本校 vs 全国平均（日本国内）</h3>
                                            <div className={styles.chartContainer}>
                                                <Bar
                                                    data={{
                                                        labels: ['N1', 'N2', 'N3', 'N4', 'N5'],
                                                        datasets: [
                                                            {
                                                                label: '本校',
                                                                data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                                    const stat = enhancedJlptStats.levelStats.find(s => s.level === level);
                                                                    return stat ? parseFloat(stat.passRate) || 0 : 0;
                                                                }),
                                                                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                                                                borderColor: 'rgb(59, 130, 246)',
                                                                borderWidth: 1,
                                                            },
                                                            {
                                                                label: '全国平均（日本国内）',
                                                                data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                                    return parseFloat(nationalStats.averageRates?.japan?.[level]?.average || 0);
                                                                }),
                                                                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                                                                borderColor: 'rgb(239, 68, 68)',
                                                                borderWidth: 1,
                                                            }
                                                        ]
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { position: 'top' },
                                                        },
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                                max: 100,
                                                                title: { display: true, text: '合格率 (%)' }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>全国平均の推移（全レベル）</h3>
                                            <div className={styles.chartContainer}>
                                                <Line
                                                    data={{
                                                        labels: nationalStats.sessions.map(s => s.session_name),
                                                        datasets: [
                                                            {
                                                                label: 'N1',
                                                                data: nationalStats.sessions.map(s => s.japan?.N1?.pass_rate || null),
                                                                borderColor: 'rgb(239, 68, 68)',
                                                                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                                                                tension: 0.3,
                                                                spanGaps: true,
                                                            },
                                                            {
                                                                label: 'N2',
                                                                data: nationalStats.sessions.map(s => s.japan?.N2?.pass_rate || null),
                                                                borderColor: 'rgb(249, 115, 22)',
                                                                backgroundColor: 'rgba(249, 115, 22, 0.5)',
                                                                tension: 0.3,
                                                                spanGaps: true,
                                                            },
                                                            {
                                                                label: 'N3',
                                                                data: nationalStats.sessions.map(s => s.japan?.N3?.pass_rate || null),
                                                                borderColor: 'rgb(245, 158, 11)',
                                                                backgroundColor: 'rgba(245, 158, 11, 0.5)',
                                                                tension: 0.3,
                                                                spanGaps: true,
                                                            },
                                                            {
                                                                label: 'N4',
                                                                data: nationalStats.sessions.map(s => s.japan?.N4?.pass_rate || null),
                                                                borderColor: 'rgb(132, 204, 22)',
                                                                backgroundColor: 'rgba(132, 204, 22, 0.5)',
                                                                tension: 0.3,
                                                                spanGaps: true,
                                                            },
                                                            {
                                                                label: 'N5',
                                                                data: nationalStats.sessions.map(s => s.japan?.N5?.pass_rate || null),
                                                                borderColor: 'rgb(59, 130, 246)',
                                                                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                                                tension: 0.3,
                                                                spanGaps: true,
                                                            }
                                                        ]
                                                    }}
                                                    options={{
                                                        responsive: true,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { position: 'top' },
                                                        },
                                                        scales: {
                                                            y: {
                                                                beginAtZero: true,
                                                                max: 100,
                                                                title: { display: true, text: '合格率 (%)' }
                                                            },
                                                            x: {
                                                                ticks: { maxRotation: 45, minRotation: 45 }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent 3 Years Comparison & Exam Rate */}
                                    <h3 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>直近3ヶ年の推移</h3>
                                    <div className={styles.chartGrid}>
                                        <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
                                            <h3 className={styles.chartTitle}>直近3ヶ年の合格率比較</h3>
                                            <div className={styles.tableContainer} style={{ overflowX: 'auto' }}>
                                                <table className={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>年度</th>
                                                            <th>本校合格率</th>
                                                            <th>全国平均合格率</th>
                                                            <th>差分</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {enhancedJlptStats.yearlyTrend && enhancedJlptStats.yearlyTrend.length > 0 ? (
                                                            enhancedJlptStats.yearlyTrend.slice(-3).reverse().map(yearData => {
                                                                const nationalSessions = nationalStats.sessions ?
                                                                    nationalStats.sessions.filter(s => s.session && String(s.year) === String(yearData.year)) : [];
                                                                let nationalRateVal = 0;
                                                                let count = 0;

                                                                if (nationalSessions.length > 0) {
                                                                    nationalSessions.forEach(s => {
                                                                        // Simple average of all N1-N5 levels for approximation
                                                                        const levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
                                                                        let sessionSum = 0;
                                                                        let sessionLevelCount = 0;
                                                                        levels.forEach(l => {
                                                                            const rate = s.japan?.[l]?.pass_rate; // Can be string
                                                                            const rateVal = parseFloat(rate || 0);
                                                                            if (rateVal > 0) {
                                                                                sessionSum += rateVal;
                                                                                sessionLevelCount++;
                                                                            }
                                                                        });
                                                                        if (sessionLevelCount > 0) {
                                                                            nationalRateVal += (sessionSum / sessionLevelCount);
                                                                            count++;
                                                                        }
                                                                    });
                                                                }

                                                                const nationalAvg = count > 0 ? (nationalRateVal / count).toFixed(1) : '-';
                                                                const diff = nationalAvg !== '-' ? (parseFloat(yearData.passRate) - parseFloat(nationalAvg)).toFixed(1) : '-';

                                                                return (
                                                                    <tr key={yearData.year}>
                                                                        <td style={{ fontWeight: 600 }}>{yearData.year}年度</td>
                                                                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{yearData.passRate}%</td>
                                                                        <td style={{ fontWeight: 600 }}>{nationalAvg}%</td>
                                                                        <td style={{
                                                                            fontWeight: 600,
                                                                            color: parseFloat(diff) > 0 ? '#16a34a' : parseFloat(diff) < 0 ? '#dc2626' : '#4b5563'
                                                                        }}>
                                                                            {parseFloat(diff) > 0 ? '+' : ''}{diff}%
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
                                                                    データがありません
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {/* 3-Year Average Row */}
                                                        {enhancedJlptStats.yearlyTrend && enhancedJlptStats.yearlyTrend.length > 0 && (() => {
                                                            const years = enhancedJlptStats.yearlyTrend.slice(-3);
                                                            let schoolSum = 0, schoolCount = 0;
                                                            let nationalSum = 0, nationalCount = 0;

                                                            years.forEach(yearData => {
                                                                // School
                                                                const sRate = parseFloat(yearData.passRate);
                                                                if (!isNaN(sRate)) { schoolSum += sRate; schoolCount++; }

                                                                // National
                                                                const nSessions = nationalStats.sessions ?
                                                                    nationalStats.sessions.filter(s => s.session && String(s.year) === String(yearData.year)) : [];

                                                                let nRateVal = 0, nCount = 0;
                                                                if (nSessions.length > 0) {
                                                                    nSessions.forEach(s => {
                                                                        const levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
                                                                        let sSum = 0, lCount = 0;
                                                                        levels.forEach(l => {
                                                                            const r = parseFloat(s.japan?.[l]?.pass_rate || 0);
                                                                            if (r > 0) { sSum += r; lCount++; }
                                                                        });
                                                                        if (lCount > 0) { nRateVal += (sSum / lCount); nCount++; }
                                                                    });
                                                                }
                                                                if (nCount > 0) { nationalSum += (nRateVal / nCount); nationalCount++; }
                                                            });

                                                            const sAvg = schoolCount > 0 ? (schoolSum / schoolCount).toFixed(1) : '-';
                                                            const nAvg = nationalCount > 0 ? (nationalSum / nationalCount).toFixed(1) : '-';
                                                            const dAvg = (sAvg !== '-' && nAvg !== '-') ? (parseFloat(sAvg) - parseFloat(nAvg)).toFixed(1) : '-';

                                                            return (
                                                                <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #e5e7eb' }}>
                                                                    <td style={{ fontWeight: 700 }}>3年平均</td>
                                                                    <td style={{ fontWeight: 700, color: '#2563eb' }}>{sAvg}%</td>
                                                                    <td style={{ fontWeight: 700 }}>{nAvg}%</td>
                                                                    <td style={{ fontWeight: 700, color: parseFloat(dAvg) > 0 ? '#16a34a' : parseFloat(dAvg) < 0 ? '#dc2626' : '#4b5563' }}>
                                                                        {parseFloat(dAvg) > 0 ? '+' : ''}{dAvg}%
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>



                                    {/* Comparison Table */}
                                    <h3 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>レベル別詳細比較</h3>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>レベル</th>
                                                    <th>本校合格率</th>
                                                    <th>本校受験者数</th>
                                                    <th>全国平均</th>
                                                    <th>全国最低</th>
                                                    <th>全国最高</th>
                                                    <th>差分</th>
                                                    <th>評価</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                    const schoolStat = enhancedJlptStats.levelStats.find(s => s.level === level);
                                                    const schoolRate = schoolStat?.passRate || 0;
                                                    const schoolExaminees = schoolStat?.total || 0;
                                                    const nationalAvg = parseFloat(nationalStats.averageRates?.japan?.[level]?.average || 0);
                                                    const nationalMin = parseFloat(nationalStats.averageRates?.japan?.[level]?.min || 0);
                                                    const nationalMax = parseFloat(nationalStats.averageRates?.japan?.[level]?.max || 0);
                                                    const diff = (schoolRate - nationalAvg).toFixed(1);
                                                    const isPositive = parseFloat(diff) > 0;
                                                    const isNegative = parseFloat(diff) < 0;

                                                    return (
                                                        <tr key={level}>
                                                            <td>
                                                                <span className={`${styles.badge} ${styles[`badge${level}`]}`}>
                                                                    {level}
                                                                </span>
                                                            </td>
                                                            <td style={{ fontWeight: 600 }}>{schoolRate}%</td>
                                                            <td>{schoolExaminees}名</td>
                                                            <td>{nationalAvg}%</td>
                                                            <td style={{ color: '#6b7280' }}>{nationalMin}%</td>
                                                            <td style={{ color: '#6b7280' }}>{nationalMax}%</td>
                                                            <td style={{
                                                                fontWeight: 600,
                                                                color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#6b7280'
                                                            }}>
                                                                {isPositive ? '+' : ''}{diff}%
                                                            </td>
                                                            <td>
                                                                {isPositive && <span style={{ color: '#22c55e', fontWeight: 600 }}>◎ 優秀</span>}
                                                                {isNegative && parseFloat(diff) < -5 && <span style={{ color: '#ef4444', fontWeight: 600 }}>△ 要改善</span>}
                                                                {isNegative && parseFloat(diff) >= -5 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>○ 標準</span>}
                                                                {!isPositive && !isNegative && <span style={{ color: '#6b7280' }}>○ 同等</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Recent Sessions Table */}
                                    <h3 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>直近の全国試験データ(合格率)</h3>
                                    <div className={styles.tableContainer}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>試験回</th>
                                                    <th>N1</th>
                                                    <th>N2</th>
                                                    <th>N3</th>
                                                    <th>N4</th>
                                                    <th>N5</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {nationalStats.recentSessions?.slice(0, 6).map((session, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ fontWeight: 600 }}>{session.session_name}</td>
                                                        {['N1', 'N2', 'N3', 'N4', 'N5'].map(level => (
                                                            <td key={level}>
                                                                {session.japan?.[level]?.pass_rate
                                                                    ? `${session.japan[level].pass_rate}%`
                                                                    : '-'
                                                                }
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Data Source Info */}
                                    <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                                        <p><strong>データソース:</strong> {nationalStats.source}</p>
                                        <p><strong>集計期間:</strong> {nationalStats.totalSessions}回分のJLPT試験データ（2017年〜2025年）</p>
                                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                                            ※ 全国平均は日本国内受験者のデータを集計しています。海外受験者データも別途保有しています。
                                        </p>
                                    </div>
                                </>
                            )}

                            {!loadingNational && !nationalStats && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                    全国統計データの読み込みに失敗しました。
                                </div>
                            )}
                        </>
                    )}

                    {/* Section Scores (科目別得点) Tab */}
                    {jlptSubTab === 'section' && (
                        <>
                            {sectionScoreStats ? (
                                <>
                                    {/* Summary Stats */}
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>科目別データ件数</span>
                                            <div className={styles.statValueRow}>
                                                <span className={styles.statValue}>{sectionScoreStats.overall?.totalRecords?.toLocaleString() || 0}</span>
                                                <span className={styles.statUnit}>件</span>
                                            </div>
                                        </div>
                                        <div className={styles.statCard}>
                                            <span className={styles.statLabel}>全科目平均点</span>
                                            <div className={styles.statValueRow}>
                                                <span className={styles.statValue}>{sectionScoreStats.overall?.avgScore || 0}</span>
                                                <span className={styles.statUnit}>点</span>
                                            </div>
                                        </div>
                                        {sectionScoreStats.bySection && Object.entries(sectionScoreStats.bySection).map(([section, data]) => (
                                            <div className={styles.statCard} key={section}>
                                                <span className={styles.statLabel}>{section}</span>
                                                <div className={styles.statValueRow}>
                                                    <span className={styles.statValue}>{data.avgScore}</span>
                                                    <span className={styles.statUnit}>点平均</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Section Score Charts */}
                                    <div className={styles.chartsRow}>
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>科目別平均点</h3>
                                            <div className={styles.chartContainer}>
                                                <Bar
                                                    data={{
                                                        labels: Object.keys(sectionScoreStats.bySection || {}),
                                                        datasets: [{
                                                            label: '平均点',
                                                            data: Object.values(sectionScoreStats.bySection || {}).map(s => s.avgScore),
                                                            backgroundColor: [
                                                                'rgba(239, 68, 68, 0.6)',
                                                                'rgba(59, 130, 246, 0.6)',
                                                                'rgba(34, 197, 94, 0.6)',
                                                            ],
                                                        }]
                                                    }}
                                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 60 } } }}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.chartCard}>
                                            <h3 className={styles.chartTitle}>レベル別科目平均点</h3>
                                            <div className={styles.chartContainer}>
                                                <Bar
                                                    data={{
                                                        labels: ['N1', 'N2', 'N3', 'N4', 'N5'],
                                                        datasets: [
                                                            {
                                                                label: '言語知識',
                                                                data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                                    const item = (sectionScoreStats.bySectionLevel || []).find(s => s.section === '言語知識' && s.level === level);
                                                                    return item?.avgScore || 0;
                                                                }),
                                                                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                                                            },
                                                            {
                                                                label: '読解',
                                                                data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                                    const item = (sectionScoreStats.bySectionLevel || []).find(s => s.section === '読解' && s.level === level);
                                                                    return item?.avgScore || 0;
                                                                }),
                                                                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                                                            },
                                                            {
                                                                label: '聴解',
                                                                data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                                    const item = (sectionScoreStats.bySectionLevel || []).find(s => s.section === '聴解' && s.level === level);
                                                                    return item?.avgScore || 0;
                                                                }),
                                                                backgroundColor: 'rgba(34, 197, 94, 0.6)',
                                                            }
                                                        ]
                                                    }}
                                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 60 } } }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section Score Details Table */}
                                    <div>
                                        <h2 className={styles.sectionTitle}>科目×レベル別詳細</h2>
                                        <div className={styles.tableContainer}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>科目</th>
                                                        <th>レベル</th>
                                                        <th>データ数</th>
                                                        <th>平均点</th>
                                                        <th>最高点</th>
                                                        <th>最低点</th>
                                                        <th>合格者平均</th>
                                                        <th>不合格者平均</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(sectionScoreStats.bySectionLevel || []).map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ fontWeight: 600 }}>{row.section}</td>
                                                            <td>
                                                                <span className={`${styles.badge} ${styles[`badge${row.level}`]}`}>
                                                                    {row.level}
                                                                </span>
                                                            </td>
                                                            <td>{row.count}</td>
                                                            <td style={{ fontWeight: 600 }}>{row.avgScore}点</td>
                                                            <td>{row.maxScore}点</td>
                                                            <td>{row.minScore}点</td>
                                                            <td style={{ color: row.passedAvg ? '#22c55e' : '#9ca3af' }}>
                                                                {row.passedAvg ? `${row.passedAvg}点` : '-'}
                                                            </td>
                                                            <td style={{ color: row.failedAvg ? '#ef4444' : '#9ca3af' }}>
                                                                {row.failedAvg ? `${row.failedAvg}点` : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Nationality Section Scores */}
                                    {sectionScoreStats.byNationality && sectionScoreStats.byNationality.length > 0 && (
                                        <div>
                                            <h2 className={styles.sectionTitle}>国籍別科目得点</h2>
                                            <div className={styles.tableContainer}>
                                                <table className={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>国籍</th>
                                                            <th>データ数</th>
                                                            <th>全体平均</th>
                                                            <th>言語知識</th>
                                                            <th>読解</th>
                                                            <th>聴解</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sectionScoreStats.byNationality.map((row, idx) => (
                                                            <tr key={idx}>
                                                                <td style={{ fontWeight: 600 }}>{row.country}</td>
                                                                <td>{row.totalRecords}</td>
                                                                <td style={{ fontWeight: 600 }}>{row.avgScore}点</td>
                                                                <td>{row['言語知識'] || '-'}</td>
                                                                <td>{row['読解'] || '-'}</td>
                                                                <td>{row['聴解'] || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                    科目別得点データを読み込み中...
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            <div className={styles.footer}>
                <p>※ データは現在のフィルタ設定に基づいています。</p>
            </div>
        </div>
    )
}
