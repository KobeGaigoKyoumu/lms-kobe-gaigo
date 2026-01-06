'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Bar, Line, Pie } from 'react-chartjs-2'
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AnalyticsPage() {
    const [grades, setGrades] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedTerm, setSelectedTerm] = useState('')
    const [selectedClass, setSelectedClass] = useState('')
    const [terms, setTerms] = useState([])
    const [classes, setClasses] = useState([])

    useEffect(() => {
        fetchGrades()
    }, [])

    const fetchGrades = async () => {
        try {
            const { data, error } = await supabase
                .from('grade_records')
                .select('*')
                .order('year_term', { ascending: false })

            if (error) throw error

            setGrades(data || [])

            // Extract unique terms and classes
            const uniqueTerms = [...new Set(data.map(item => item.year_term))].sort().reverse()
            const uniqueClasses = [...new Set(data.map(item => item.class_name))].sort()

            setTerms(uniqueTerms)
            setClasses(uniqueClasses)

            if (uniqueTerms.length > 0) setSelectedTerm(uniqueTerms[0])
            // Default class is ALL ('')
        } catch (error) {
            console.error('Error fetching grades:', error)
        } finally {
            setLoading(false)
        }
    }

    // --- Data Processing for Charts ---

    const filteredGrades = grades.filter(g =>
        (selectedTerm ? g.year_term === selectedTerm : true) &&
        (selectedClass ? g.class_name === selectedClass : true)
    )

    // 1. Grade Distribution (A/B/C/D/F)
    const gradeDistribution = {
        labels: ['A (80-100)', 'B (70-79)', 'C (60-69)', 'D (50-59)', 'F (0-49)'],
        datasets: [
            {
                label: 'Number of Students',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)', // Green
                    'rgba(54, 162, 235, 0.6)', // Blue
                    'rgba(255, 206, 86, 0.6)', // Yellow
                    'rgba(255, 159, 64, 0.6)', // Orange
                    'rgba(255, 99, 132, 0.6)', // Red
                ],
                borderWidth: 1,
            },
        ],
    }

    filteredGrades.forEach(g => {
        const score = g.report_card_total || 0
        if (score >= 80) gradeDistribution.datasets[0].data[0]++
        else if (score >= 70) gradeDistribution.datasets[0].data[1]++
        else if (score >= 60) gradeDistribution.datasets[0].data[2]++
        else if (score >= 50) gradeDistribution.datasets[0].data[3]++
        else gradeDistribution.datasets[0].data[4]++
    })

    // 2. Subject Averages
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
        datasets: [
            {
                label: 'Average Score',
                data: [
                    subjectCounts.vocab ? (subjectTotals.vocab / subjectCounts.vocab).toFixed(1) : 0,
                    subjectCounts.reading ? (subjectTotals.reading / subjectCounts.reading).toFixed(1) : 0,
                    subjectCounts.listening ? (subjectTotals.listening / subjectCounts.listening).toFixed(1) : 0,
                    subjectCounts.grammar ? (subjectTotals.grammar / subjectCounts.grammar).toFixed(1) : 0,
                    subjectCounts.writing ? (subjectTotals.writing / subjectCounts.writing).toFixed(1) : 0,
                    subjectCounts.conversation ? (subjectTotals.conversation / subjectCounts.conversation).toFixed(1) : 0,
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
            }
        ]
    }

    // 3. Class Comparison (Average Total Score) - Only if no specific class selected
    const classStats = {} // { className: { total: 0, count: 0 } }

    // Use grades filtered only by term for class comparison
    const termGrades = grades.filter(g => selectedTerm ? g.year_term === selectedTerm : true)

    termGrades.forEach(g => {
        if (!classStats[g.class_name]) classStats[g.class_name] = { total: 0, count: 0 }
        classStats[g.class_name].total += g.report_card_total || 0
        classStats[g.class_name].count++
    })

    const classComparisonData = {
        labels: Object.keys(classStats).sort(),
        datasets: [
            {
                label: 'Class Average',
                data: Object.keys(classStats).sort().map(c => (classStats[c].total / classStats[c].count).toFixed(1)),
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
            }
        ]
    }

    // 4. Term Trends (Overall Average over time) - Only if Data spans multiple terms
    const termStats = {} // { term: { total: 0, count: 0 } }

    // Use grades filtered only by class (if selected) for trend
    const classGrades = grades.filter(g => selectedClass ? g.class_name === selectedClass : true)

    classGrades.forEach(g => {
        if (!termStats[g.year_term]) termStats[g.year_term] = { total: 0, count: 0 }
        termStats[g.year_term].total += g.report_card_total || 0
        termStats[g.year_term].count++
    })

    // Sort terms chronologically (approximate by string sort for now, ideally parse)
    const sortedTerms = Object.keys(termStats).sort()

    const termTrendData = {
        labels: sortedTerms,
        datasets: [
            {
                label: 'Average Score Trend',
                data: sortedTerms.map(t => (termStats[t].total / termStats[t].count).toFixed(1)),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.3
            }
        ]
    }

    if (loading) return <div className="p-8">Loading analytics...</div>

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>統計・分析ダッシュボード</h1>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>学期 (Term)</label>
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '200px' }}
                    >
                        <option value="">すべての学期</option>
                        {terms.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#666' }}>クラス (Class)</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minWidth: '150px' }}
                    >
                        <option value="">すべてのクラス</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>

                {/* 1. Grade Distribution */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>成績分布</h3>
                    <div style={{ height: '300px' }}>
                        <Bar
                            data={gradeDistribution}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                            }}
                        />
                    </div>
                </div>

                {/* 2. Subject Averages */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>科目別平均点</h3>
                    <div style={{ height: '300px' }}>
                        <Bar
                            data={subjectAverages} // Using Bar instead of Radar for simpler comparison
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, max: 100 } }
                            }}
                        />
                    </div>
                </div>

                {/* 3. Class Comparison (Visible when no specific class selected) */}
                {!selectedClass && (
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>クラス別平均比較</h3>
                        <div style={{ height: '300px' }}>
                            <Bar
                                data={classComparisonData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { y: { beginAtZero: true, max: 100 } }
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* 4. Trend (Visible when multiple terms exist) */}
                {Object.keys(termStats).length > 1 && (
                    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '15px' }}>学期間の推移</h3>
                        <div style={{ height: '300px' }}>
                            <Line
                                data={termTrendData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: { y: { beginAtZero: true, max: 100 } }
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '40px', textAlign: 'center', color: '#888' }}>
                <p>※ データは現在のフィルタ設定に基づいています。</p>
            </div>
        </div>
    )
}
