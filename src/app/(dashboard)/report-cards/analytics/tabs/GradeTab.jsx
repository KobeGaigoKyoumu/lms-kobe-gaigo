'use client'

import { useState, useMemo, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { MultiSelect } from '../components/MultiSelect'
import styles from '../page.module.css'

export default function GradeTab({ initialGrades = [], chartFontSize }) {
    const [selectedTerm, setSelectedTerm] = useState('')
    const [selectedClasses, setSelectedClasses] = useState([])
    const [selectedGrades, setSelectedGrades] = useState([])
    const [sortConfig, setSortConfig] = useState({ key: 'final_total', direction: 'desc' })
    const [page, setPage] = useState(1)
    const ROWS_PER_PAGE = 50

    // Standardized Color Constants
    const COLOR_PASS = '#22c55e'
    const COLOR_FAIL = '#ef4444'
    const COLOR_WARN = '#f59e0b'
    const COLOR_INFO = '#3b82f6'

    const LABEL_MAP = {
        vocab: '語彙',
        listening: '聴解',
        reading: '読解',
        grammar: '文法',
        writing: '記述',
        conversation: '会話'
    }


    // Derived Data with Safety Checks
    const terms = useMemo(() => {
        const data = initialGrades || []
        return [...new Set(data.map(item => item.year_term))].filter(Boolean).sort().reverse()
    }, [initialGrades])

    const classes = useMemo(() => {
        const data = initialGrades || []
        return [...new Set(data.map(item => item.class_name))].filter(Boolean).sort()
    }, [initialGrades])

    useEffect(() => {
        if (terms.length > 0 && !selectedTerm) {
            setSelectedTerm(terms[0])
        }
    }, [terms, selectedTerm])

    const formatNumber = (num) => {
        if (num === null || num === undefined || num === '-' || num === '') return '-'
        const val = parseFloat(num)
        if (isNaN(val)) return num
        return Math.floor(val * 10) / 10
    }

    const getFinalGrade = (score) => {
        if (score >= 480) return 'A'
        if (score >= 360) return 'B'
        if (score >= 240) return 'C'
        if (score >= 120) return 'D'
        return 'F'
    }

    const getReportGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 70) return 'B'
        if (score >= 60) return 'C'
        if (score >= 50) return 'D'
        return 'F'
    }

    const getRatingColor = (grade) => {
        switch (grade) {
            case 'A': return '#16a34a'
            case 'B': return '#2563eb'
            case 'C': return '#ca8a04'
            case 'D': return '#ea580c'
            case 'F': return '#dc2626'
            default: return 'inherit'
        }
    }

    const filteredGrades = useMemo(() => {
        const data = initialGrades || []
        return data.filter(g => {
            const targetTerm = selectedTerm || g.year_term
            const studentId = g.student_id_text || g.student_id
            let studentGradeLabel = '不明'

            if (targetTerm && studentId) {
                const termYearMatch = String(targetTerm).match(/^(\d{4})/)
                const termYear = termYearMatch ? parseInt(termYearMatch[1]) : null
                const idStr = String(studentId)
                if (termYear && idStr.length >= 2) {
                    const enrollmentPrefix = parseInt(idStr.substring(0, 2))
                    const enrollmentYear = 2000 + enrollmentPrefix
                    const gradeNum = termYear - enrollmentYear + 1
                    studentGradeLabel = `${gradeNum}年生`
                }
            }

            const matchTerm = selectedTerm ? g.year_term === selectedTerm : true
            const matchClass = selectedClasses.length > 0 ? selectedClasses.includes(g.class_name) : true
            const matchGrade = selectedGrades.length > 0 ? selectedGrades.includes(studentGradeLabel) : true

            return matchTerm && matchClass && matchGrade
        })
    }, [initialGrades, selectedTerm, selectedClasses, selectedGrades])

    const rankedGrades = useMemo(() => {
        const sortedForRank = [...filteredGrades].sort((a, b) => {
            const scoreA = a.final_exam_data ? Object.values(a.final_exam_data).reduce((acc, v) => acc + (parseFloat(v) || 0), 0) : 0
            const scoreB = b.final_exam_data ? Object.values(b.final_exam_data).reduce((acc, v) => acc + (parseFloat(v) || 0), 0) : 0
            return scoreB - scoreA
        })
        return sortedForRank.map((item, index) => ({ ...item, originalRank: index + 1 }))
    }, [filteredGrades])

    const sortedFilteredGrades = useMemo(() => {
        return [...rankedGrades].sort((a, b) => {
            const { key, direction } = sortConfig
            const modifier = direction === 'asc' ? 1 : -1

            const getVal = (item, k) => {
                switch (k) {
                    case 'rank': return item.originalRank || 9999
                    case 'final_total':
                        return item.final_exam_data
                            ? Object.values(item.final_exam_data).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                            : 0
                    case 'student_id': return item.student_id_text || ''
                    case 'class_name': return item.class_name || ''
                    case 'name': return item.student_name || ''
                    case 'report_total': return item.report_card_total || 0
                    case 'attendance': return parseFloat(item.report_card_data?.attendance || 0)
                    case 'participation': return parseFloat(item.report_card_data?.participation || 0)
                    case 'vocab': return parseFloat(item.final_exam_data?.vocab || 0)
                    case 'listening': return parseFloat(item.final_exam_data?.listening || 0)
                    case 'reading': return parseFloat(item.final_exam_data?.reading || 0)
                    case 'grammar': return parseFloat(item.final_exam_data?.grammar || 0)
                    case 'writing': return parseFloat(item.final_exam_data?.writing || 0)
                    case 'conversation': return parseFloat(item.final_exam_data?.conversation || 0)
                    default: return 0
                }
            }

            const valA = getVal(a, key)
            const valB = getVal(b, key)

            if (typeof valA === 'string' && typeof valB === 'string') {
                return valA.localeCompare(valB) * modifier
            }
            return (valA - valB) * modifier
        })
    }, [rankedGrades, sortConfig])

    const paginatedGrades = useMemo(() => {
        const start = (page - 1) * ROWS_PER_PAGE
        return sortedFilteredGrades.slice(start, start + ROWS_PER_PAGE)
    }, [sortedFilteredGrades, page])

    const totalPages = Math.ceil(sortedFilteredGrades.length / ROWS_PER_PAGE)

    useEffect(() => {
        setPage(1)
    }, [filteredGrades.length, sortConfig])

    const distributions = useMemo(() => {
        const gDist = {
            labels: ['F (0-49)', 'D (50-59)', 'C (60-69)', 'B (70-79)', 'A (80-100)'],
            datasets: [{
                label: '人数',
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(249, 115, 22, 0.6)', 'rgba(250, 204, 21, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(34, 197, 94, 0.6)'],
                borderWidth: 1,
            }],
        }

        const fExamDist = {
            labels: ['0-299', '300-399', '400-499', '500-600'],
            datasets: [{
                label: '人数',
                data: [0, 0, 0, 0],
                backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(250, 204, 21, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(34, 197, 94, 0.6)'],
                borderWidth: 1,
            }]
        }

        const fGradeDist = {
            labels: ['F (0-119)', 'D (120-239)', 'C (240-359)', 'B (360-479)', 'A (480-600)'],
            datasets: [{
                label: '人数',
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(249, 115, 22, 0.6)', 'rgba(250, 204, 21, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(34, 197, 94, 0.6)'],
                borderWidth: 1,
            }]
        }

        const sTotals = { vocab: 0, reading: 0, listening: 0, grammar: 0, writing: 0, conversation: 0 }
        const sCounts = { vocab: 0, reading: 0, listening: 0, grammar: 0, writing: 0, conversation: 0 }

        filteredGrades.forEach(g => {
            const score = g.report_card_total || 0
            if (score >= 80) gDist.datasets[0].data[4]++
            else if (score >= 70) gDist.datasets[0].data[3]++
            else if (score >= 60) gDist.datasets[0].data[2]++
            else if (score >= 50) gDist.datasets[0].data[1]++
            else gDist.datasets[0].data[0]++

            if (g.final_exam_data) {
                const total = Object.values(g.final_exam_data).reduce((a, b) => a + (parseFloat(b) || 0), 0)
                if (total >= 500) fExamDist.datasets[0].data[3]++
                else if (total >= 400) fExamDist.datasets[0].data[2]++
                else if (total >= 300) fExamDist.datasets[0].data[1]++
                else fExamDist.datasets[0].data[0]++

                if (total >= 480) fGradeDist.datasets[0].data[4]++
                else if (total >= 360) fGradeDist.datasets[0].data[3]++
                else if (total >= 240) fGradeDist.datasets[0].data[2]++
                else if (total >= 120) fGradeDist.datasets[0].data[1]++
                else fGradeDist.datasets[0].data[0]++

                Object.keys(sTotals).forEach(subj => {
                    const val = parseFloat(g.final_exam_data[subj])
                    if (!isNaN(val)) { sTotals[subj] += val; sCounts[subj]++ }
                })
            }
        })

        const sAverages = {
            labels: ['文字・語彙', '読解', '聴解', '文法', '作文', '会話'],
            datasets: [{
                label: '平均点',
                data: ['vocab', 'reading', 'listening', 'grammar', 'writing', 'conversation'].map(k => sCounts[k] ? (sTotals[k] / sCounts[k]).toFixed(1) : 0),
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
            }]
        }

        return { gradeDistribution: gDist, finalExamDistribution: fExamDist, finalGradeDistribution: fGradeDist, subjectAverages: sAverages }
    }, [filteredGrades])

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }))
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { titleFont: { size: chartFontSize + 1 }, bodyFont: { size: chartFontSize } }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: chartFontSize } } },
            x: { grid: { display: false }, ticks: { font: { size: chartFontSize } } }
        }
    }

    const isReportFirst = ['report_total', 'attendance', 'participation'].includes(sortConfig.key)

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>学期</label>
                    <select className={styles.filterSelect} value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
                        <option value="">すべての学期</option>
                        {terms.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <MultiSelect label="学年" options={['1年生', '2年生']} selected={selectedGrades} onChange={setSelectedGrades} placeholder="すべての学年" />
                <MultiSelect label="クラス" options={classes} selected={selectedClasses} onChange={setSelectedClasses} placeholder="すべてのクラス" />
            </div>

            <div className={styles.chartsRow}>
                <div className={styles.chartCard}><h3 className={styles.chartTitle}>成績分布</h3><div className={styles.chartContainer}><Bar data={distributions.gradeDistribution} options={chartOptions} /></div></div>
                <div className={styles.chartCard}><h3 className={styles.chartTitle}>期末試験の判定分布</h3><div className={styles.chartContainer}><Bar data={distributions.finalGradeDistribution} options={chartOptions} /></div></div>
                <div className={styles.chartCard}><h3 className={styles.chartTitle}>期末試験6科目合計点数分布</h3><div className={styles.chartContainer}><Bar data={distributions.finalExamDistribution} options={chartOptions} /></div></div>
                <div className={styles.chartCard}><h3 className={styles.chartTitle}>期末試験科目別平均点</h3><div className={styles.chartContainer}><Bar data={distributions.subjectAverages} options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }} /></div></div>
            </div>

            <div className={styles.tableCard}>
                <h3 className={styles.chartTitle}>学生成績順位表 ({filteredGrades.length}名)</h3>
                <div className={styles.tableContainer} style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('rank')} className={styles.sortableHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        順位 {sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('student_id')} className={styles.sortableHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        学籍番号 {sortConfig.key === 'student_id' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('class_name')} className={styles.sortableHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        クラス {sortConfig.key === 'class_name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('name')} className={styles.sortableHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        氏名 {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                    </div>
                                </th>
                                {!isReportFirst && (
                                    <>
                                        <th onClick={() => handleSort('final_total')} style={{ backgroundColor: '#eff6ff' }} className={styles.sortableHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                期末合計 {sortConfig.key === 'final_total' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                            </div>
                                        </th>
                                        <th style={{ backgroundColor: '#eff6ff' }}>評定</th>
                                        {['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(k => (
                                            <th key={k} onClick={() => handleSort(k)} style={{ backgroundColor: '#f0f9ff' }} className={styles.sortableHeader}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {LABEL_MAP[k] || k} {sortConfig.key === k ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                                </div>
                                            </th>
                                        ))}
                                    </>
                                )}
                                <th onClick={() => handleSort('report_total')} style={{ backgroundColor: '#dcfce7' }} className={styles.sortableHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        成績総合 {sortConfig.key === 'report_total' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                    </div>
                                </th>
                                <th style={{ backgroundColor: '#dcfce7' }}>評定</th>
                                <th onClick={() => handleSort('attendance')} style={{ backgroundColor: '#f0fdf4' }} className={styles.sortableHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        出席 {sortConfig.key === 'attendance' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('participation')} style={{ backgroundColor: '#f0fdf4' }} className={styles.sortableHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        平常 {sortConfig.key === 'participation' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                    </div>
                                </th>
                                {isReportFirst && (
                                    <>
                                        <th onClick={() => handleSort('final_total')} style={{ backgroundColor: '#eff6ff' }} className={styles.sortableHeader}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                期末合計 {sortConfig.key === 'final_total' ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                            </div>
                                        </th>
                                        <th style={{ backgroundColor: '#eff6ff' }}>評定</th>
                                        {['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(k => (
                                            <th key={k} onClick={() => handleSort(k)} style={{ backgroundColor: '#f0f9ff' }} className={styles.sortableHeader}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {LABEL_MAP[k] || k} {sortConfig.key === k ? (sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUp size={14} style={{ opacity: 0.2 }} />}
                                                </div>
                                            </th>
                                        ))}
                                    </>
                                )}
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedGrades.length === 0 ? (
                                <tr><td colSpan="15" style={{ textAlign: 'center', padding: '2rem' }}>データが見つかりません</td></tr>
                            ) : paginatedGrades.map((student, idx) => {
                                const finalTotal = student.final_exam_data ? Object.values(student.final_exam_data).reduce((a, b) => a + (parseFloat(b) || 0), 0) : 0
                                const finalGrade = getFinalGrade(finalTotal)
                                const reportTotal = student.report_card_total || 0
                                const reportGrade = getReportGrade(reportTotal)
                                return (
                                    <tr key={student.id || idx}>
                                        <td>{student.originalRank}</td>
                                        <td>{student.student_id_text}</td>
                                        <td>{student.class_name}</td>
                                        <td>{student.student_name}</td>
                                        {!isReportFirst && (
                                            <>
                                                <td style={{ backgroundColor: '#eff6ff' }}>{formatNumber(finalTotal)}</td>
                                                <td style={{ color: getRatingColor(finalGrade), backgroundColor: '#eff6ff' }}>{finalGrade}</td>
                                                {['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(k => (
                                                    <td key={k}>{formatNumber(student.final_exam_data?.[k])}</td>
                                                ))}
                                            </>
                                        )}
                                        <td style={{ backgroundColor: '#dcfce7' }}>{formatNumber(reportTotal)}</td>
                                        <td style={{ color: getRatingColor(reportGrade), backgroundColor: '#dcfce7' }}>{reportGrade}</td>
                                        <td>{formatNumber(student.report_card_data?.attendance)}</td>
                                        <td>{formatNumber(student.report_card_data?.participation)}</td>
                                        {isReportFirst && (
                                            <>
                                                <td style={{ backgroundColor: '#eff6ff' }}>{formatNumber(finalTotal)}</td>
                                                <td style={{ color: getRatingColor(finalGrade), backgroundColor: '#eff6ff' }}>{finalGrade}</td>
                                                {['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(k => (
                                                    <td key={k}>{formatNumber(student.final_exam_data?.[k])}</td>
                                                ))}
                                            </>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>前へ</button>
                        <span>{page} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>次へ</button>
                    </div>
                )}
            </div>
        </div>
    )
}
