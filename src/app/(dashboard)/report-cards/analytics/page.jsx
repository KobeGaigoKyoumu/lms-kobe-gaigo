'use client'

import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchJlptAnalyticsData } from '@/app/actions/jlpt'
import careerStatsData from '@/data/career_stats_v2.json'
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
import { ChevronDown, ChevronUp, ArrowLeft, Check, X, ArrowUp, ArrowDown } from 'lucide-react'
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



// Standardized Color Constants (Unified Density/Weight: Lighter)
const COLOR_PASS = '#22c55e' // Green 500
const COLOR_FAIL = '#ef4444' // Red 500
const COLOR_WARN = '#f59e0b' // Amber 500
const COLOR_INFO = '#3b82f6' // Blue 500
const COLOR_MUTED = '#9ca3af' // Gray 400

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
                <div className={styles.sessionDetails} style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>レベル</th>
                                <th>合計</th>
                                <th>合格 / 不合格</th>
                                <th>合格率</th>
                                <th>平均点</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessionData.items.map((row, index) => {
                                const failed = row.examinees - row.passers;
                                return (
                                    <tr key={`${row.session}-${row.level}-${index}`}>
                                        <td>
                                            <span className={`${styles.badge} ${styles[`badge${row.level}`]}`}>
                                                {row.level}
                                            </span>
                                        </td>
                                        <td>{row.examinees}名</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ color: COLOR_PASS, fontWeight: 600 }}>{row.passers}</span>
                                                <span style={{ color: COLOR_MUTED, fontSize: '0.8em' }}>/</span>
                                                <span style={{ color: COLOR_FAIL, fontWeight: 600 }}>{failed}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{row.passRate}%</td>
                                        <td>{row.averageScore}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

const AccordionChevron = ({ className, rotated }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={className}
        style={{
            width: '1em',
            height: '1em',
            transition: 'transform 0.2s',
            transform: rotated ? 'rotate(180deg)' : 'none'
        }}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
)

const MultiSelect = ({ label, options, selected, onChange, placeholder = "選択してください" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div
            ref={containerRef}
            className={styles.filterGroup}
            style={{ position: 'relative', minWidth: '200px' }}
            onMouseLeave={() => setIsOpen(false)}
        >
            <label className={styles.filterLabel}>{label}</label>
            <div
                className={styles.filterSelect}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    cursor: 'pointer',
                    minHeight: '38px',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    backgroundColor: 'white'
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                    {selected.length === 0 ? (
                        <span style={{ color: '#9ca3af' }}>{placeholder}</span>
                    ) : (
                        selected.map(item => (
                            <span key={item} style={{
                                background: '#eff6ff',
                                color: '#3b82f6',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {item}
                                <X
                                    size={12}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(selected.filter(i => i !== item));
                                    }}
                                />
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown size={16} color="#6b7280" style={{ marginLeft: '8px' }} />
            </div>
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0 0 6px 6px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    width: '100%'
                }}>
                    {options.map(option => (
                        <div
                            key={option}
                            onClick={() => {
                                if (selected.includes(option)) {
                                    onChange(selected.filter(i => i !== option));
                                } else {
                                    onChange([...selected, option]);
                                }
                            }}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: selected.includes(option) ? '#eff6ff' : 'white',
                                fontSize: '0.9rem',
                                borderBottom: '1px solid #f3f4f6'
                            }}
                        >
                            <span>{option}</span>
                            {selected.includes(option) && <Check size={14} color="#3b82f6" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function AnalyticsPage() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState('grades') // 'grades' or 'jlpt'

    // Grade analytics state
    const [grades, setGrades] = useState([])
    const [loadingGrades, setLoadingGrades] = useState(true)
    const [selectedTerm, setSelectedTerm] = useState('')
    const [selectedClasses, setSelectedClasses] = useState([])
    const [selectedGrades, setSelectedGrades] = useState([])
    const [terms, setTerms] = useState([])
    const [classes, setClasses] = useState([])

    // Range Filter State
    const [finalExamRange, setFinalExamRange] = useState({ min: 0, max: 600 })
    const [reportCardRange, setReportCardRange] = useState({ min: 0, max: 100 })

    // JLPT analytics state
    const [jlptData, setJlptData] = useState([])
    const [enhancedJlptStats, setEnhancedJlptStats] = useState(null)
    const [sectionScoreStats, setSectionScoreStats] = useState(null) // 科目別分析データ
    const [loadingJlpt, setLoadingJlpt] = useState(true)

    // Database Tab State
    const [dbSearchQuery, setDbSearchQuery] = useState('')
    const [dbFilterStatus, setDbFilterStatus] = useState('all') // 'all', 'enrolled', 'graduated'
    const [dbFilteredStudents, setDbFilteredStudents] = useState([])

    // New Filters
    const [dbYearFilter, setDbYearFilter] = useState('')
    const [dbClassFilter, setDbClassFilter] = useState('')
    const [dbNationalityFilter, setDbNationalityFilter] = useState('')
    const [dbLevelFilter, setDbLevelFilter] = useState('')
    // Pagination State
    const [dbCurrentPage, setDbCurrentPage] = useState(1)
    const DB_ITEMS_PER_PAGE = 50

    // Class Analysis State
    const [selectedJlptClass, setSelectedJlptClass] = useState('')
    const [jlptSubTab, setJlptSubTab] = useState('yearly') // 'yearly', 'class', 'section', or 'compare'
    const [nationalStats, setNationalStats] = useState(null)
    const [loadingNational, setLoadingNational] = useState(false)
    const [debugInfo, setDebugInfo] = useState(null)
    const [sectionDetailOpen, setSectionDetailOpen] = useState(false) // 科目別詳細アコーディオン

    // Career Analytics State
    const [careerStats, setCareerStats] = useState(null)
    const [expandedDestination, setExpandedDestination] = useState(null)
    const [expandedNationality, setExpandedNationality] = useState(null)
    const [showLowRankings, setShowLowRankings] = useState(false)
    const [careerSubTab, setCareerSubTab] = useState('overview') // 'overview' or 'schools'
    const [careerSearchQuery, setCareerSearchQuery] = useState('')
    const [expandedSchoolId, setExpandedSchoolId] = useState(null)
    const [expandedPast5YearsSchoolId, setExpandedPast5YearsSchoolId] = useState(null)

    // Responsive Chart Font Size
    const [chartFontSize, setChartFontSize] = useState(12)

    useEffect(() => {
        const handleResize = () => {
            // Fluid font size: 9px to 13px based on width
            const newSize = Math.max(9, Math.min(13, window.innerWidth / 80))
            setChartFontSize(newSize)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        fetchGrades()
        fetchJlptData()
        setCareerStats(careerStatsData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Database Search and Category Filter Effect
    useEffect(() => {
        if (!enhancedJlptStats?.allStudentStats) return

        let results = (enhancedJlptStats.allStudentStats || []).filter(s =>
            s.studentId !== '学籍番号' && s.name !== '氏名' && s.nationality !== '国籍・地域'
        )

        // Multi-keyword Search (AND logic)
        if (dbSearchQuery) {
            const terms = dbSearchQuery.toLowerCase().trim().split(/\s+/)
            results = results.filter(s =>
                terms.every(term =>
                    (s.name && s.name.toLowerCase().includes(term)) ||
                    (s.studentId && String(s.studentId).includes(term)) ||
                    (s.enrollmentYear && String(s.enrollmentYear).includes(term)) ||
                    (s.class && s.class.toLowerCase().includes(term)) ||
                    (s.nationality && s.nationality.toLowerCase().includes(term)) ||
                    (s.destination && s.destination.toLowerCase().includes(term))
                )
            )
        }

        // Category Filters
        if (dbYearFilter) {
            results = results.filter(s => String(s.enrollmentYear) === dbYearFilter)
        }
        if (dbClassFilter) {
            results = results.filter(s => s.class === dbClassFilter)
        }
        if (dbNationalityFilter) {
            results = results.filter(s => s.nationality === dbNationalityFilter)
        }
        if (dbLevelFilter) {
            results = results.filter(s => s.highestLevel === dbLevelFilter)
        }

        // Default Sort: Student ID ascending (always sorted, just not user-switchable)
        results.sort((a, b) => {
            const nA = parseInt(a.studentId) || 0
            const nB = parseInt(b.studentId) || 0
            return nA - nB
        })

        // Reset to first page on filter change
        setDbCurrentPage(1)

        setDbFilteredStudents(results)
    }, [dbSearchQuery, dbYearFilter, dbClassFilter, dbNationalityFilter, dbLevelFilter, enhancedJlptStats])

    // Generate automatic filter options for Database tab
    const dbFilterOptions = useMemo(() => {
        if (!enhancedJlptStats?.allStudentStats) return { years: [], classes: [], nationalities: [], levels: [] }
        const stats = enhancedJlptStats.allStudentStats
        return {
            years: [...new Set(stats.map(s => s.enrollmentYear).filter(Boolean))].sort().reverse(),
            classes: [...new Set(stats.map(s => s.class).filter(c => c && !['中国人新入生クラス', 'ベトナム人新入生クラス', 'ベトナムっ人新入生クラス'].includes(c)))].sort(),
            nationalities: [...new Set(stats.map(s => s.nationality).filter(n => n && n !== '国籍・地域'))].sort(),
            levels: ['N1', 'N2', 'N3', 'N4', 'N5']
        }
    }, [enhancedJlptStats])

    // Merge Career Stats with JLPT Data
    useEffect(() => {
        if (!careerStatsData || !enhancedJlptStats?.studentStats) return

        const enhancedCareerStats = JSON.parse(JSON.stringify(careerStatsData))
        const studentJlptMap = new Map()

        enhancedJlptStats.studentStats.forEach(s => {
            const key = s.name.replace(/\s+/g, '').toLowerCase()
            studentJlptMap.set(key, s)
            studentJlptMap.set(s.name, s)
        })

        enhancedCareerStats.topDestinations.forEach(dest => {
            if (!dest.students) return

            const destJlptStats = {}

            dest.students.forEach(student => {
                const nameKey = (student.name || '').replace(/\s+/g, '').toLowerCase()
                const jlptInfo = studentJlptMap.get(nameKey)

                if (jlptInfo && jlptInfo.levels) {
                    Object.entries(jlptInfo.levels).forEach(([level, data]) => {
                        if (!destJlptStats[level]) {
                            destJlptStats[level] = {
                                passed: { count: 0, avg: 0, max: 0, min: 999, scores: [] },
                                failed: { count: 0, avg: 0, max: 0, min: 999, scores: [] },
                                overall: { avg: 0, max: 0, min: 999, scores: [] }
                            }
                        }

                        const score = parseInt(data.score) || 0
                        if (data.status === '合格') {
                            destJlptStats[level].passed.scores.push(score)
                        } else if (data.status === '不合格') {
                            destJlptStats[level].failed.scores.push(score)
                        }
                    })
                }
            })

            // Calculate aggregated stats
            Object.keys(destJlptStats).forEach(lvl => {
                const s = destJlptStats[lvl]
                const pScores = s.passed.scores
                const fScores = s.failed.scores
                const allScores = [...pScores, ...fScores]

                s.passed.count = pScores.length
                s.passed.avg = pScores.length > 0 ? pScores.reduce((a, b) => a + b, 0) / pScores.length : 0
                s.passed.max = pScores.length > 0 ? Math.max(...pScores) : '-'
                s.passed.min = pScores.length > 0 ? Math.min(...pScores) : '-'

                s.failed.count = fScores.length
                s.failed.avg = fScores.length > 0 ? fScores.reduce((a, b) => a + b, 0) / fScores.length : 0
                s.failed.max = fScores.length > 0 ? Math.max(...fScores) : '-'
                s.failed.min = fScores.length > 0 ? Math.min(...fScores) : '-'

                s.overall.avg = allScores.length > 0 ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : 0
                s.overall.max = allScores.length > 0 ? Math.max(...allScores) : '-'
                s.overall.min = allScores.length > 0 ? Math.min(...allScores) : '-'

                s.passRate = allScores.length > 0 ? ((s.passed.count / allScores.length) * 100).toFixed(1) : 0
            })

            if (Object.keys(destJlptStats).length > 0) {
                dest.jlptStats = destJlptStats
            }
        })

        setCareerStats(enhancedCareerStats)
    }, [enhancedJlptStats])



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
            setLoadingJlpt(false)
        } catch (error) {
            console.error('Error fetching JLPT data:', error)
        } finally {
            setLoadingJlpt(false)
        }
    }

    // Sort State
    const [sortConfig, setSortConfig] = useState({ key: 'final_total', direction: 'desc' })

    // Handler for Column Sort
    const handleSort = (key) => {
        setSortConfig(current => {
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            // Default to 'desc' for numbers, 'asc' could be better for text but 'desc' is generally safer for high-priority numbers
            return { key, direction: 'desc' }
        })
    }

    // Tooltip for Sort Direction
    const getSortTooltip = (columnKey) => {
        const isCurrent = sortConfig.key === columnKey
        // If current is desc, next is asc. Otherwise (asc or new column), next is desc.
        if (isCurrent && sortConfig.direction === 'desc') return '昇順に並べ替え'
        return '降順に並べ替え'
    }

    // Determine Layout Order: If sorting by Report Total, Attendance, or Participation, put that section first. Otherwise Final Exam first.
    const isReportFirst = ['report_total', 'attendance', 'participation'].includes(sortConfig.key)

    // Helper for Sort Icon
    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <span style={{ width: '1em', display: 'inline-block' }}></span> // Placeholder
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
    }

    // Helper for Rating Colors
    const getRatingColor = (grade) => {
        switch (grade) {
            case 'A': return '#16a34a' // Green 600
            case 'B': return '#2563eb' // Blue 600
            case 'C': return '#ca8a04' // Yellow 600
            case 'D': return '#ea580c' // Orange 600
            case 'F': return '#dc2626' // Red 600
            default: return 'inherit'
        }
    }

    // Helper to truncate to 1 decimal place (floor)
    const formatNumber = (num) => {
        if (num === null || num === undefined || num === '-' || num === '') return '-'
        const val = parseFloat(num)
        if (isNaN(val)) return num
        return Math.floor(val * 10) / 10
    }

    // Final Exam Grade Calculation (Using 600 scale percentages)
    const getFinalGrade = (score) => {
        if (score >= 480) return 'A'
        if (score >= 360) return 'B'
        if (score >= 240) return 'C'
        if (score >= 120) return 'D'
        return 'F'
    }

    // Report Card Grade Calculation
    const getReportGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 70) return 'B'
        if (score >= 60) return 'C'
        if (score >= 50) return 'D'
        return 'F'
    }


    // --- Grade Analytics Processing ---
    const filteredGrades = grades.filter(g => {
        // Calculate Grade Logic: Use selectedTerm or the student's entry term as reference
        let studentGrade = null
        const targetTerm = selectedTerm || g.year_term
        const studentId = g.student_id_text || g.student_id // Use student_id_text primarily

        if (targetTerm && studentId) {
            // Extract Year from Term (e.g. "2024年度 前期" -> 2024)
            const termYearMatch = String(targetTerm).match(/^(\d{4})/)
            const termYear = termYearMatch ? parseInt(termYearMatch[1]) : null

            // Extract Year from Student ID (e.g. "2301001" -> 2023)
            const idStr = String(studentId)
            if (termYear && idStr.length >= 2) {
                const enrollmentPrefix = parseInt(idStr.substring(0, 2))
                const enrollmentYear = 2000 + enrollmentPrefix
                // Grade = TermYear - EnrollmentYear + 1
                studentGrade = termYear - enrollmentYear + 1
            }
        }

        const gradeLabel = studentGrade ? `${studentGrade}年生` : '不明'

        // Basic Filters (Term, Class, Grade)
        const matchTerm = selectedTerm ? g.year_term === selectedTerm : true
        const matchClass = selectedClasses.length > 0 ? selectedClasses.includes(g.class_name) : true
        // Allow filtering by '不明' if needed, or strictly numbered grades
        const matchGrade = selectedGrades.length > 0 ? selectedGrades.includes(gradeLabel) : true

        return matchTerm && matchClass && matchGrade
    })

    // Calculate Ranks (Pre-calculation for persistent rank display)
    const rankedGrades = useMemo(() => {
        // Sort by Final Total Descending to determine Rank
        const sortedForRank = [...filteredGrades].sort((a, b) => {
            const scoreA = a.final_exam_data ? Object.values(a.final_exam_data).reduce((acc, v) => acc + (parseFloat(v) || 0), 0) : 0
            const scoreB = b.final_exam_data ? Object.values(b.final_exam_data).reduce((acc, v) => acc + (parseFloat(v) || 0), 0) : 0
            return scoreB - scoreA
        })
        // Assign Rank
        return sortedForRank.map((item, index) => ({ ...item, originalRank: index + 1 }))
    }, [filteredGrades])

    const getSortedGrades = () => {
        return [...rankedGrades].sort((a, b) => { // Create a copy before sorting
            const { key, direction } = sortConfig
            const modifier = direction === 'asc' ? 1 : -1

            const getVal = (item, k) => {
                switch (k) {
                    case 'rank': return item.originalRank || 9999

                    case 'final_total':
                        return item.final_exam_data
                            ? Object.values(item.final_exam_data).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                            : 0
                    case 'student_id': return item.student_id ? String(item.student_id) : ''
                    case 'class_name': return item.class_name ? String(item.class_name) : ''
                    case 'name': return item.student_name ? String(item.student_name) : ''
                    case 'report_total': return item.report_card_total || 0
                    case 'attendance': return parseFloat(item.report_card_data?.attendance || 0)
                    case 'participation': return parseFloat(item.report_card_data?.participation || 0)
                    // Subject scores
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
    }

    // Memoize Sorted Grades
    const sortedFilteredGrades = useMemo(() => {
        return [...rankedGrades].sort((a, b) => { // Create a copy before sorting
            const { key, direction } = sortConfig
            const modifier = direction === 'asc' ? 1 : -1

            const getVal = (item, k) => {
                switch (k) {
                    case 'rank': return item.originalRank || 9999
                    case 'final_total':
                        return item.final_exam_data
                            ? Object.values(item.final_exam_data).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
                            : 0
                    case 'student_id': return item.student_id ? String(item.student_id) : ''
                    case 'class_name': return item.class_name ? String(item.class_name) : ''
                    case 'name': return item.student_name ? String(item.student_name) : ''
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

    // Pagination for Grades Table (Performance Optimization)
    const [page, setPage] = useState(1);
    const ROWS_PER_PAGE = 50;
    const paginatedGrades = useMemo(() => {
        const start = (page - 1) * ROWS_PER_PAGE;
        return sortedFilteredGrades.slice(start, start + ROWS_PER_PAGE);
    }, [sortedFilteredGrades, page]);

    const totalPages = Math.ceil(sortedFilteredGrades.length / ROWS_PER_PAGE);

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [filteredGrades.length, sortConfig]);

    // --- Grade Analytics Processing ---
    // Memoize Distribution Calculations
    const { gradeDistribution, finalExamDistribution, finalGradeDistribution, subjectAverages } = useMemo(() => {
        // Reordered: Low Score (F) -> High Score (A)
        const gDist = {
            labels: ['F (0-49)', 'D (50-59)', 'C (60-69)', 'B (70-79)', 'A (80-100)'],
            datasets: [{
                label: '人数',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.6)',   // F - Red
                    'rgba(249, 115, 22, 0.6)',  // D - Orange
                    'rgba(250, 204, 21, 0.6)',  // C - Yellow
                    'rgba(59, 130, 246, 0.6)',  // B - Blue
                    'rgba(34, 197, 94, 0.6)',   // A - Green
                ],
                borderWidth: 1,
            }],
        }

        const fExamDist = {
            labels: ['0-299', '300-399', '400-499', '500-600'],
            datasets: [{
                label: '人数',
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.6)',   // 0-299: Red
                    'rgba(250, 204, 21, 0.6)',  // 300-399: Yellow
                    'rgba(59, 130, 246, 0.6)',  // 400-499: Blue
                    'rgba(34, 197, 94, 0.6)',   // 500-600: Green
                ],
                borderWidth: 1,
            }]
        }

        const fGradeDist = {
            labels: ['F (0-119)', 'D (120-239)', 'C (240-359)', 'B (360-479)', 'A (480-600)'],
            datasets: [{
                label: '人数',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.6)', 'rgba(249, 115, 22, 0.6)', 'rgba(250, 204, 21, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(34, 197, 94, 0.6)',
                ],
                borderWidth: 1,
            }]
        }

        const sTotals = { vocab: 0, reading: 0, listening: 0, grammar: 0, writing: 0, conversation: 0 }
        const sCounts = { vocab: 0, reading: 0, listening: 0, grammar: 0, writing: 0, conversation: 0 }

        filteredGrades.forEach(g => {
            // Grade Distribution
            const score = g.report_card_total || 0
            if (score >= 80) gDist.datasets[0].data[4]++
            else if (score >= 70) gDist.datasets[0].data[3]++
            else if (score >= 60) gDist.datasets[0].data[2]++
            else if (score >= 50) gDist.datasets[0].data[1]++
            else gDist.datasets[0].data[0]++

            if (g.final_exam_data) {
                const scores = Object.values(g.final_exam_data)
                const total = scores.reduce((a, b) => a + (parseFloat(b) || 0), 0)

                // Range
                if (total >= 500) fExamDist.datasets[0].data[3]++
                else if (total >= 400) fExamDist.datasets[0].data[2]++
                else if (total >= 300) fExamDist.datasets[0].data[1]++
                else fExamDist.datasets[0].data[0]++

                // Grade
                if (total >= 480) fGradeDist.datasets[0].data[4]++
                else if (total >= 360) fGradeDist.datasets[0].data[3]++
                else if (total >= 240) fGradeDist.datasets[0].data[2]++
                else if (total >= 120) fGradeDist.datasets[0].data[1]++
                else fGradeDist.datasets[0].data[0]++

                // Subjects
                Object.keys(sTotals).forEach(subj => {
                    const val = parseFloat(g.final_exam_data[subj])
                    if (!isNaN(val)) {
                        sTotals[subj] += val
                        sCounts[subj]++
                    }
                })
            }
        })

        const sAverages = {
            labels: ['文字・語彙', '読解', '聴解', '文法', '作文', '会話'],
            datasets: [{
                label: '平均点',
                data: [
                    sCounts.vocab ? (sTotals.vocab / sCounts.vocab).toFixed(1) : 0,
                    sCounts.reading ? (sTotals.reading / sCounts.reading).toFixed(1) : 0,
                    sCounts.listening ? (sTotals.listening / sCounts.listening).toFixed(1) : 0,
                    sCounts.grammar ? (sTotals.grammar / sCounts.grammar).toFixed(1) : 0,
                    sCounts.writing ? (sTotals.writing / sCounts.writing).toFixed(1) : 0,
                    sCounts.conversation ? (sTotals.conversation / sCounts.conversation).toFixed(1) : 0,
                ],
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
            }]
        }

        return { gradeDistribution: gDist, finalExamDistribution: fExamDist, finalGradeDistribution: fGradeDist, subjectAverages: sAverages }
    }, [filteredGrades])


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
            legend: {
                display: false,
                labels: { font: { size: chartFontSize } }
            },
            tooltip: {
                titleFont: { size: chartFontSize + 1 },
                bodyFont: { size: chartFontSize }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { font: { size: chartFontSize } }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: chartFontSize } }
            }
        }
    }

    if (loadingGrades && loadingJlpt) {
        return (
            <div className={styles.loadingContainer} >
                <div className="spinner"></div>
                <p>データを読み込んでいます...</p>
            </div >
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
                <button
                    className={`${styles.tab} ${activeTab === 'career' ? styles.active : ''}`}
                    onClick={() => setActiveTab('career')}
                >
                    進路分析
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'database' ? styles.active : ''}`}
                    onClick={() => setActiveTab('database')}
                >
                    データベース
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

                        {/* Grade Filter */}
                        <MultiSelect
                            label="学年"
                            options={['1年生', '2年生']}
                            selected={selectedGrades}
                            onChange={setSelectedGrades}
                            placeholder="すべての学年"
                        />

                        {/* Class Filter */}
                        <MultiSelect
                            label="クラス"
                            options={classes}
                            selected={selectedClasses}
                            onChange={setSelectedClasses}
                            placeholder="すべてのクラス"
                        />

                        {/* Sort Mode Toggle */}

                    </div>

                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>成績分布</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={gradeDistribution} options={chartOptions} />
                            </div>
                        </div>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>期末試験の判定分布</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={finalGradeDistribution} options={chartOptions} />
                            </div>
                        </div>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>期末試験6科目合計点数分布</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={finalExamDistribution} options={chartOptions} />
                            </div>
                        </div>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>期末試験科目別平均点</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={subjectAverages} options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }} />
                            </div>
                        </div>
                    </div>

                    {/* Student Ranking Table */}
                    <div className={styles.tableCard} style={{ marginTop: '24px', padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 className={styles.chartTitle} style={{ margin: 0 }}>
                                学生成績順位表 ({filteredGrades.length}名)
                                <span style={{ fontSize: '0.8em', fontWeight: 'normal', marginLeft: '10px', color: '#64748b' }}>
                                    {!isReportFirst ? '※ 期末試験・科目中心' : '※ 成績総合・出席中心'}
                                </span>
                            </h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'relative', zIndex: 100 }}>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                        <th onClick={() => handleSort('rank')} data-tooltip={getSortTooltip('rank')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap', borderRight: '1px solid #e5e7eb' }}>順位</th>
                                        <th onClick={() => handleSort('student_id')} data-tooltip={getSortTooltip('student_id')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'left', minWidth: '60px', borderRight: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>学籍番号</div>
                                        </th>
                                        <th onClick={() => handleSort('class_name')} data-tooltip={getSortTooltip('class_name')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'center', minWidth: '50px', borderRight: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>クラス</div>
                                        </th>
                                        <th onClick={() => handleSort('name')} data-tooltip={getSortTooltip('name')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'left', minWidth: '140px', borderRight: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>氏名</div>
                                        </th>

                                        {/* Dynamic Section Ordering */}
                                        {/* Dynamic Section Ordering */}
                                        {/* Final Exam Section (Render First if NOT report sort) */}
                                        {!isReportFirst && (
                                            <>
                                                <th onClick={() => handleSort('final_total')} data-tooltip={getSortTooltip('final_total')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'center', backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>期末合計</div>
                                                    <div style={{ fontSize: '0.8em', color: '#6b7280' }}>(600)</div>
                                                </th>
                                                <th style={{ padding: '12px', textAlign: 'center', backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>評定</th>
                                                {[
                                                    { key: 'vocab', label: '語彙' },
                                                    { key: 'listening', label: '聴解' },
                                                    { key: 'reading', label: '読解' },
                                                    { key: 'grammar', label: '文法' },
                                                    { key: 'writing', label: '作文' },
                                                    { key: 'conversation', label: '会話' }
                                                ].map(subj => (
                                                    <th
                                                        key={subj.key}
                                                        onClick={() => handleSort(subj.key)}
                                                        data-tooltip={getSortTooltip(subj.key)}
                                                        className={styles.sortableHeader}
                                                        style={{ padding: '12px', textAlign: 'center', fontSize: '0.85em', backgroundColor: '#f0f9ff', color: '#4b5563', borderRight: '1px solid #e5e7eb' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>{subj.label}</div>
                                                    </th>
                                                ))}
                                            </>
                                        )}

                                        {/* Report Card Section (Always Rendered, position depends on isReportFirst) */}
                                        <th onClick={() => handleSort('report_total')} data-tooltip={getSortTooltip('report_total')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'center', backgroundColor: '#dcfce7', fontWeight: 'bold', borderRight: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>成績総合</div>
                                            <div style={{ fontSize: '0.8em', color: '#6b7280' }}>(100)</div>
                                        </th>
                                        <th style={{ padding: '12px', textAlign: 'center', backgroundColor: '#dcfce7', fontWeight: 'bold', borderRight: '1px solid #e5e7eb' }}>評定</th>

                                        <th onClick={() => handleSort('attendance')} data-tooltip={getSortTooltip('attendance')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'center', backgroundColor: '#f0fdf4', borderRight: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>出席</div>
                                        </th>
                                        <th onClick={() => handleSort('participation')} data-tooltip={getSortTooltip('participation')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'center', backgroundColor: '#f0fdf4' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>平常</div>
                                        </th>

                                        {/* Final Exam Section (Render Last if isReportFirst) */}
                                        {isReportFirst && (
                                            <>
                                                <th onClick={() => handleSort('final_total')} data-tooltip={getSortTooltip('final_total')} className={styles.sortableHeader} style={{ padding: '12px', textAlign: 'center', backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>期末合計</div>
                                                    <div style={{ fontSize: '0.8em', color: '#6b7280' }}>(600)</div>
                                                </th>
                                                <th style={{ padding: '12px', textAlign: 'center', backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>評定</th>
                                                {[
                                                    { key: 'vocab', label: '語彙' },
                                                    { key: 'listening', label: '聴解' },
                                                    { key: 'reading', label: '読解' },
                                                    { key: 'grammar', label: '文法' },
                                                    { key: 'writing', label: '作文' },
                                                    { key: 'conversation', label: '会話' }
                                                ].map(subj => (
                                                    <th
                                                        key={subj.key}
                                                        onClick={() => handleSort(subj.key)}
                                                        data-tooltip={getSortTooltip(subj.key)}
                                                        className={styles.sortableHeader}
                                                        style={{ padding: '12px', textAlign: 'center', fontSize: '0.85em', backgroundColor: '#f0f9ff', color: '#4b5563', borderRight: '1px solid #e5e7eb' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>{subj.label}</div>
                                                    </th>
                                                ))}
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedGrades.map((student, index) => {
                                        const finalTotal = student.final_exam_data
                                            ? Object.values(student.final_exam_data).reduce((a, b) => a + (parseFloat(b) || 0), 0)
                                            : 0
                                        const finalGrade = getFinalGrade(finalTotal)

                                        const reportTotal = student.report_card_total || 0
                                        const reportGrade = getReportGrade(reportTotal)

                                        const rowBg = index % 2 === 0 ? 'white' : '#f9fafb'

                                        return (
                                            <tr key={student.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: rowBg }}>
                                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', borderRight: '1px solid #e5e7eb' }}>{student.originalRank}</td>
                                                <td style={{ padding: '10px', borderRight: '1px solid #e5e7eb' }}>{student.student_id_text}</td>
                                                <td style={{ padding: '10px', whiteSpace: 'nowrap', borderRight: '1px solid #e5e7eb' }}>{student.class_name || '-'}</td>
                                                <td style={{ padding: '10px', borderRight: '1px solid #e5e7eb' }}>{student.student_name}</td>

                                                {/* Dynamic Section Ordering */}
                                                {!isReportFirst && (
                                                    <>
                                                        {/* Final Exam Section */}
                                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>
                                                            {formatNumber(finalTotal)}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: getRatingColor(finalGrade), backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>
                                                            {finalGrade}
                                                        </td>
                                                        {['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(key => (
                                                            <td key={key} style={{ padding: '10px', textAlign: 'center', fontSize: '0.9em', color: '#6b7280', borderRight: '1px solid #e5e7eb' }}>
                                                                {formatNumber(student.final_exam_data?.[key])}
                                                            </td>
                                                        ))}
                                                    </>
                                                )}

                                                {/* Report Card Section */}
                                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#dcfce7', borderRight: '1px solid #e5e7eb' }}>
                                                    {formatNumber(reportTotal)}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: getRatingColor(reportGrade), backgroundColor: '#dcfce7', borderRight: '1px solid #e5e7eb' }}>
                                                    {reportGrade}
                                                </td>

                                                <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
                                                    {formatNumber(student.report_card_data?.attendance)}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    {formatNumber(student.report_card_data?.participation)}
                                                </td>

                                                {isReportFirst && (
                                                    <>
                                                        {/* Final Exam Section */}
                                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>
                                                            {formatNumber(finalTotal)}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: getRatingColor(finalGrade), backgroundColor: '#eff6ff', borderRight: '1px solid #e5e7eb' }}>
                                                            {finalGrade}
                                                        </td>
                                                        {['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(key => (
                                                            <td key={key} style={{ padding: '10px', textAlign: 'center', fontSize: '0.9em', color: '#6b7280', borderRight: '1px solid #e5e7eb' }}>
                                                                {formatNumber(student.final_exam_data?.[key])}
                                                            </td>
                                                        ))}
                                                    </>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                                >
                                    前のページ
                                </button>
                                <span style={{ fontSize: '14px', color: '#374151' }}>
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db', backgroundColor: page === totalPages ? '#f3f4f6' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                                >
                                    次のページ
                                </button>
                            </div>
                        )}
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
                            全体概要
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
                            className={`${styles.subTab} ${jlptSubTab === 'section' ? styles.active : ''}`}
                            onClick={() => setJlptSubTab('section')}
                        >
                            科目別分析
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
                    </div>

                    {/* Yearly Analysis Content */}
                    {jlptSubTab === 'yearly' && (
                        <>
                            {/* COVID Note */}
                            <div style={{
                                backgroundColor: '#fef3c7',
                                border: '1px solid #f59e0b',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                marginBottom: '24px',
                                fontSize: '14px',
                                color: '#92400e'
                            }}>
                                <strong>⚠️ COVID-19の影響について：</strong>
                                <br />
                                2020年〜2022年は新型コロナウイルスの影響により、入学時期の遅延がありました。2020年度は新入生がいなかったため、2022年度の卒業生はおらず、データの記載がありません。
                            </div>
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
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>対象年度の範囲</span>
                                    <div className={styles.statValueRow}>
                                        <span className={styles.statValue} style={{ fontSize: '1.2rem', whiteSpace: 'nowrap' }}>2017年～2025年</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.chartsRow}>
                                <div className={styles.chartCard}>
                                    <h3 className={styles.chartTitle}>合格率の推移</h3>
                                    <div className={styles.chartContainer}>
                                        <Line data={jlptTrendData} options={chartOptions} />
                                    </div>
                                </div>
                                <div className={styles.chartCard}>
                                    <h3 className={styles.chartTitle}>年度別 合格率推移</h3>
                                    <div className={styles.chartContainer}>
                                        {enhancedJlptStats && (
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
                                        )}
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
                                            <h3 className={styles.chartTitle}>レベル別 平均点</h3>
                                            <div className={styles.chartContainer}>
                                                <Bar data={jlptScoreData} options={chartOptions} />
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
                                                                <td style={{ fontWeight: 600, color: parseFloat(row.rate) >= 50 ? COLOR_PASS : COLOR_WARN }}>
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
                                                        <td style={{ fontWeight: 600, color: parseFloat(cls.n3PlusRate) >= 50 ? COLOR_PASS : COLOR_WARN }}>
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
                                                            <div style={{ fontSize: '0.75rem', color: COLOR_MUTED }}>N1</div>
                                                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: COLOR_FAIL }}>{currentClassStats.n1}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: COLOR_MUTED }}>N2</div>
                                                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#ea580c' }}>{currentClassStats.n2}</div>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: '0.75rem', color: COLOR_MUTED }}>N3</div>
                                                            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: COLOR_WARN }}>{currentClassStats.n3}</div>
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
                    )
                    }

                    {/* Class Analysis - No Data State */}
                    {
                        jlptSubTab === 'class' && (!enhancedJlptStats?.studentStats || enhancedJlptStats.studentStats.length === 0) && (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                                <p>表示できるクラスデータがありません。</p>
                                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                    学生データの読み込みに失敗したか、条件に一致するデータがありません。（対象: {enhancedJlptStats?.students?.length || 0}名）
                                </p>
                            </div>
                        )
                    }

                    {/* National Comparison Content */}
                    {
                        jlptSubTab === 'compare' && (
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
                                                            return schoolAvg >= nationalAvg ? COLOR_PASS : COLOR_WARN;
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
                                                                                color: parseFloat(diff) > 0 ? COLOR_PASS : parseFloat(diff) < 0 ? COLOR_FAIL : COLOR_MUTED
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
                                                                        <td style={{ fontWeight: 700, color: parseFloat(dAvg) > 0 ? COLOR_PASS : parseFloat(dAvg) < 0 ? COLOR_FAIL : COLOR_MUTED }}>
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
                                                                    color: isPositive ? COLOR_PASS : isNegative ? COLOR_FAIL : COLOR_MUTED
                                                                }}>
                                                                    {isPositive ? '+' : ''}{diff}%
                                                                </td>
                                                                <td>
                                                                    {isPositive && <span style={{ color: COLOR_PASS, fontWeight: 600 }}>◎ 優秀</span>}
                                                                    {isNegative && parseFloat(diff) < -5 && <span style={{ color: COLOR_FAIL, fontWeight: 600 }}>△ 要改善</span>}
                                                                    {isNegative && parseFloat(diff) >= -5 && <span style={{ color: COLOR_WARN, fontWeight: 600 }}>○ 標準</span>}
                                                                    {!isPositive && !isNegative && <span style={{ color: COLOR_MUTED }}>○ 同等</span>}
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
                        )
                    }

                    {/* Section Scores (科目別得点) Tab */}
                    {
                        jlptSubTab === 'section' && (
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

                                        {/* Section Overall Average Table */}
                                        <div>
                                            <h2 className={styles.sectionTitle}>科目別全体平均</h2>
                                            <div className={styles.tableContainer} style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' }}>
                                                <table className={styles.table}>
                                                    <thead>
                                                        <tr>
                                                            <th>科目</th>
                                                            <th>データ数</th>
                                                            <th>平均点</th>
                                                            <th>最高点</th>
                                                            <th>最低点</th>
                                                            <th>合格者平均</th>
                                                            <th>不合格者平均</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sectionScoreStats.bySection && Object.entries(sectionScoreStats.bySection).map(([section, data]) => (
                                                            <tr key={section}>
                                                                <td style={{ fontWeight: 600 }}>{section}</td>
                                                                <td>{data.count}</td>
                                                                <td style={{ fontWeight: 600 }}>{data.avgScore}点</td>
                                                                <td>{data.maxScore}点</td>
                                                                <td>{data.minScore}点</td>
                                                                <td style={{ color: data.passedAvg ? COLOR_PASS : COLOR_MUTED, fontWeight: 600 }}>
                                                                    {data.passedAvg ? `${data.passedAvg}点` : '-'}
                                                                </td>
                                                                <td style={{ color: data.failedAvg ? COLOR_FAIL : COLOR_MUTED, fontWeight: 600 }}>
                                                                    {data.failedAvg ? `${data.failedAvg}点` : '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Section Score Details Table - Accordion */}
                                        <div className={styles.sessionGroup} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: '1px solid #e5e7eb' }}>
                                            <div
                                                className={styles.subtleAccordionTrigger}
                                                onClick={() => setSectionDetailOpen(!sectionDetailOpen)}
                                            >
                                                科目×レベル別詳細 ({sectionScoreStats.bySectionLevel?.length || 0}件のデータ)
                                                {sectionDetailOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                            {sectionDetailOpen && (
                                                <div className={styles.sessionDetails} style={{ overflowX: 'auto' }}>
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
                                                            {(sectionScoreStats.bySectionLevel || [])
                                                                .sort((a, b) => {
                                                                    // Sort by Level first (N1 -> N5)
                                                                    const levelOrder = { 'N1': 1, 'N2': 2, 'N3': 3, 'N4': 4, 'N5': 5 };
                                                                    const levelDiff = (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
                                                                    if (levelDiff !== 0) return levelDiff;
                                                                    // Then by Section
                                                                    return a.section.localeCompare(b.section);
                                                                })
                                                                .map((row, idx) => (
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
                                                                        <td style={{ color: row.passedAvg ? COLOR_PASS : COLOR_MUTED, fontWeight: 600 }}>
                                                                            {row.passedAvg ? `${row.passedAvg}点` : '-'}
                                                                        </td>
                                                                        <td style={{ color: row.failedAvg ? COLOR_FAIL : COLOR_MUTED, fontWeight: 600 }}>
                                                                            {row.failedAvg ? `${row.failedAvg}点` : '-'}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
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

            {/* Career Analytics Tab */}
            {
                activeTab === 'career' && careerStats && (
                    <>
                        {/* Sub Tabs */}
                        <div className={styles.subTabs}>
                            <button
                                className={`${styles.subTab} ${careerSubTab === 'overview' ? styles.active : ''}`}
                                onClick={() => setCareerSubTab('overview')}
                            >
                                全体概要
                            </button>
                            <button
                                className={`${styles.subTab} ${careerSubTab === 'schools' ? styles.active : ''}`}
                                onClick={() => setCareerSubTab('schools')}
                            >
                                学校別詳細
                            </button>
                            <button
                                className={`${styles.subTab} ${careerSubTab === 'past5years' ? styles.active : ''}`}
                                onClick={() => setCareerSubTab('past5years')}
                            >
                                過去5年詳細
                            </button>
                        </div>

                        {careerSubTab === 'overview' && (
                            <>
                                {/* COVID Note */}
                                <div style={{
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginBottom: '24px',
                                    fontSize: '14px',
                                    color: '#92400e'
                                }}>
                                    <strong>⚠️ COVID-19の影響について：</strong>
                                    <br />
                                    2020年〜2022年は新型コロナウイルスの影響により、入学時期の遅延がありました。2020年度は新入生がいなかったため、2022年度の卒業生はおらず、データの記載がありません。
                                </div>
                                {/* Summary Stats */}
                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <span className={styles.statLabel}>総卒業生数</span>
                                        <div className={styles.statValueRow}>
                                            <span className={styles.statValue}>{careerStats.summary.totalGraduates.toLocaleString()}</span>
                                            <span className={styles.statUnit}>名</span>
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={styles.statLabel}>進学率（大学・専門学校）</span>
                                        <div className={styles.statValueRow}>
                                            <span className={styles.statValue}>
                                                {(((careerStats.categoryStats['大学'] || 0) +
                                                    (careerStats.categoryStats['大学院'] || 0) +
                                                    (careerStats.categoryStats['専門学校'] || 0) +
                                                    (careerStats.categoryStats['短期大学'] || 0)) /
                                                    careerStats.summary.totalRecords * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={styles.statLabel}>就職率</span>
                                        <div className={styles.statValueRow}>
                                            <span className={styles.statValue}>
                                                {((careerStats.categoryStats['就職'] || 0) /
                                                    careerStats.summary.totalRecords * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.statCard}>
                                        <span className={styles.statLabel}>対象年度</span>
                                        <div className={styles.statValueRow}>
                                            <span className={styles.statValue}>{careerStats.summary.years.length}</span>
                                            <span className={styles.statUnit}>年度</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Row 1: Category Breakdown & Yearly Trends */}
                                <div className={styles.chartsRow}>
                                    <div className={styles.chartCard} style={{ flex: 1.2 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 className={styles.chartTitle} style={{ margin: 0 }}>進路区分別内訳</h3>
                                            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                                                {Object.entries(careerStats.categoryStats)
                                                    .sort((a, b) => b[1] - a[1])
                                                    .slice(0, 3)
                                                    .map(([cat, count], idx) => {
                                                        const total = careerStats.summary.totalRecords;
                                                        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                                                        return (
                                                            <span key={cat} style={{
                                                                background: idx === 0 ? '#eff6ff' : '#f9fafb',
                                                                color: idx === 0 ? '#1d4ed8' : '#4b5563',
                                                                padding: '2px 8px', borderRadius: '4px', border: '1px solid #e5e7eb'
                                                            }}>
                                                                {cat}: {pct}%
                                                            </span>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                        <div className={styles.chartContainer}>
                                            <Bar
                                                data={{
                                                    labels: Object.keys(careerStats.categoryStats),
                                                    datasets: [{
                                                        label: '人数',
                                                        data: Object.values(careerStats.categoryStats),
                                                        backgroundColor: [
                                                            'rgba(59, 130, 246, 0.7)',
                                                            'rgba(34, 197, 94, 0.7)',
                                                            'rgba(249, 115, 22, 0.7)',
                                                            'rgba(168, 85, 247, 0.7)',
                                                            'rgba(236, 72, 153, 0.7)',
                                                            'rgba(107, 114, 128, 0.7)',
                                                            'rgba(239, 68, 68, 0.7)',
                                                            'rgba(245, 158, 11, 0.7)',
                                                            'rgba(16, 185, 129, 0.7)',
                                                            'rgba(99, 102, 241, 0.7)',
                                                        ],
                                                    }]
                                                }}
                                                options={{
                                                    ...chartOptions,
                                                    indexAxis: 'y',
                                                    maintainAspectRatio: false,
                                                    plugins: {
                                                        legend: { display: false },
                                                        tooltip: {
                                                            callbacks: {
                                                                label: function (context) {
                                                                    const value = context.parsed.x;
                                                                    const total = careerStats.summary.totalRecords;
                                                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                                                    return `${context.dataset.label || ''}: ${value}名 (${percentage})`;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.chartCard} style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 className={styles.chartTitle} style={{ margin: 0 }}>年度別卒業率の推移</h3>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '0.25rem 0.75rem', borderRadius: '99px' }}>
                                                全年度平均: {(() => {
                                                    const rates = careerStats.yearlyTrends.map(t => parseFloat(t.graduationRate));
                                                    const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
                                                    return avg.toFixed(1);
                                                })()}%
                                            </span>
                                        </div>
                                        <div className={styles.chartContainer}>
                                            <Line
                                                data={{
                                                    labels: careerStats.yearlyTrends.map(t => (parseInt(t.year) + 1) + '年度卒業'),
                                                    datasets: [
                                                        {
                                                            label: '卒業率 (%)',
                                                            data: careerStats.yearlyTrends.map(t => parseFloat(t.graduationRate)),
                                                            borderColor: 'rgb(34, 197, 94)',
                                                            backgroundColor: 'rgba(34, 197, 94, 0.5)',
                                                            tension: 0.3,
                                                            pointRadius: 4,
                                                            pointHoverRadius: 6
                                                        }
                                                    ]
                                                }}
                                                options={{
                                                    ...chartOptions,
                                                    maintainAspectRatio: false,
                                                    scales: {
                                                        y: {
                                                            beginAtZero: true,
                                                            max: 100,
                                                            ticks: { stepSize: 20 },
                                                            grid: { color: 'rgba(0,0,0,0.05)' }
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Charts Row 2: Yearly Career Breakdown */}

                                {/* Charts Row 2: Yearly Career Breakdown */}
                                <div className={styles.chartsRow}>
                                    <div className={styles.chartCard} style={{ flex: 2 }}>
                                        <h3 className={styles.chartTitle}>年度別進路内訳</h3>
                                        <div className={styles.chartContainer}>
                                            <Bar
                                                data={{
                                                    labels: careerStats.yearlyTrends.map(t => (parseInt(t.year) + 1) + '年度卒業'),
                                                    datasets: [
                                                        {
                                                            label: '専門学校',
                                                            data: careerStats.yearlyTrends.map(t => t.categories['専門学校'] || 0),
                                                            backgroundColor: 'rgba(59, 130, 246, 0.7)',
                                                        },
                                                        {
                                                            label: '大学',
                                                            data: careerStats.yearlyTrends.map(t => t.categories['大学'] || 0),
                                                            backgroundColor: 'rgba(34, 197, 94, 0.7)',
                                                        },
                                                        {
                                                            label: '大学院',
                                                            data: careerStats.yearlyTrends.map(t => t.categories['大学院'] || 0),
                                                            backgroundColor: 'rgba(168, 85, 247, 0.7)',
                                                        },
                                                        {
                                                            label: '就職',
                                                            data: careerStats.yearlyTrends.map(t => t.categories['就職'] || 0),
                                                            backgroundColor: 'rgba(249, 115, 22, 0.7)',
                                                        },
                                                        {
                                                            label: '帰国',
                                                            data: careerStats.yearlyTrends.map(t => t.categories['帰国'] || 0),
                                                            backgroundColor: 'rgba(107, 114, 128, 0.7)',
                                                        },
                                                    ]
                                                }}
                                                options={{
                                                    ...chartOptions,
                                                    plugins: {
                                                        legend: { display: true, position: 'top' },
                                                        tooltip: {
                                                            callbacks: {
                                                                label: function (context) {
                                                                    const value = context.parsed.y;
                                                                    const dataIndex = context.dataIndex;
                                                                    // Calculate total for this specific year (stack)
                                                                    let stackTotal = 0;
                                                                    context.chart.data.datasets.forEach(dataset => {
                                                                        stackTotal += dataset.data[dataIndex] || 0;
                                                                    });
                                                                    const percentage = stackTotal > 0 ? ((value / stackTotal) * 100).toFixed(1) + '%' : '0%';
                                                                    return `${context.dataset.label}: ${value}名 (${percentage})`;
                                                                }
                                                            }
                                                        }
                                                    },
                                                    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tables Row */}
                                <div className={styles.chartsRow}>
                                    {/* Top Destinations */}
                                    <div className={styles.chartCard} style={{ flex: 1.2 }}>
                                        <h3 className={styles.chartTitle}>人気進学先ランキング (TOP 10)</h3>
                                        <div className={styles.tableContainer}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>順位</th>
                                                        <th>進学先</th>
                                                        <th>人数</th>
                                                        <th>詳細</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Top 10 */}
                                                    {careerStats.topDestinations.slice(0, 10).map((dest, idx) => (
                                                        <Fragment key={idx}>
                                                            <tr
                                                                onClick={() => setExpandedDestination(expandedDestination === idx ? null : idx)}
                                                                className={expandedDestination === idx ? styles.expandedRow : ''}
                                                                style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                                                            >
                                                                <td style={{ padding: '0.75rem 1rem' }}>{idx + 1}</td>
                                                                <td style={{ padding: '0.75rem 1rem' }}>{dest.name}</td>
                                                                <td style={{ fontWeight: 600, padding: '0.75rem 1rem' }}>{dest.count}名</td>
                                                                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                                    <AccordionChevron rotated={expandedDestination === idx} />
                                                                </td>
                                                            </tr>
                                                            {expandedDestination === idx && (
                                                                <tr>
                                                                    <td colSpan={4} style={{ padding: '0 1rem 1rem 1rem', backgroundColor: '#f9fafb' }}>
                                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                                                            <strong>年度別内訳:</strong>
                                                                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                                                                {Object.entries(dest.years || {}).sort((a, b) => b[0] - a[0]).map(([year, count]) => (
                                                                                    <li key={year} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                                                                        <span>{parseInt(year) + 1}年度卒</span>
                                                                                        <strong>{count}名</strong>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </Fragment>
                                                    ))}

                                                    {/* 11th and below Accordion */}
                                                    {careerStats.topDestinations.length > 10 && (
                                                        <>
                                                            <tr>
                                                                <td colSpan={4} style={{ padding: 0, border: 'none' }}>
                                                                    <div
                                                                        className={styles.subtleAccordionTrigger}
                                                                        onClick={() => setShowLowRankings(!showLowRankings)}
                                                                        style={{ borderTop: 'none', borderBottom: showLowRankings ? '1px solid #e5e7eb' : 'none' }}
                                                                    >
                                                                        {showLowRankings ? '11位以下を閉じる' : '11位以下を表示'}
                                                                        <AccordionChevron rotated={showLowRankings} />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {showLowRankings && careerStats.topDestinations.slice(10).map((dest, idx) => {
                                                                const realIdx = idx + 10;
                                                                return (
                                                                    <Fragment key={realIdx}>
                                                                        <tr
                                                                            onClick={() => setExpandedDestination(expandedDestination === realIdx ? null : realIdx)}
                                                                            className={expandedDestination === realIdx ? styles.expandedRow : ''}
                                                                            style={{ cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                                                                        >
                                                                            <td style={{ padding: '0.75rem 1rem' }}>{realIdx + 1}</td>
                                                                            <td style={{ padding: '0.75rem 1rem' }}>{dest.name}</td>
                                                                            <td style={{ fontWeight: 600, padding: '0.75rem 1rem' }}>{dest.count}名</td>
                                                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                                                <AccordionChevron rotated={expandedDestination === realIdx} />
                                                                            </td>
                                                                        </tr>
                                                                        {expandedDestination === realIdx && (
                                                                            <tr>
                                                                                <td colSpan={4} style={{ padding: '0 1rem 1rem 1rem', backgroundColor: '#f9fafb' }}>
                                                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                                                                        <strong>年度別内訳:</strong>
                                                                                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                                                                            {Object.entries(dest.years || {}).sort((a, b) => b[0] - a[0]).map(([year, count]) => (
                                                                                                <li key={year} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                                                                                    <span>{parseInt(year) + 1}年度卒</span>
                                                                                                    <strong>{count}名</strong>
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </Fragment>
                                                                );
                                                            })}
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Nationality Stats */}
                                    <div className={styles.chartCard} style={{ flex: 1 }}>
                                        <h3 className={styles.chartTitle}>国籍別進路状況</h3>
                                        <div className={styles.tableContainer}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>国籍</th>
                                                        <th>人数</th>
                                                        <th>主な進路</th>
                                                        <th>詳細</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {careerStats.nationalityStats.slice(0, 8).map((nat, idx) => {
                                                        const topCategory = Object.entries(nat.categories)
                                                            .sort((a, b) => b[1] - a[1])[0];
                                                        const isExpanded = expandedNationality === idx;

                                                        return (
                                                            <Fragment key={idx}>
                                                                <tr
                                                                    key={idx}
                                                                    onClick={() => setExpandedNationality(isExpanded ? null : idx)}
                                                                    className={isExpanded ? styles.expandedRow : ''}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <td>{nat.name}</td>
                                                                    <td>{nat.total}名</td>
                                                                    <td>{topCategory ? `${topCategory[0]} (${topCategory[1]}名)` : '-'}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <AccordionChevron rotated={isExpanded} />
                                                                    </td>
                                                                </tr>
                                                                {isExpanded && (
                                                                    <tr>
                                                                        <td colSpan={4} style={{ padding: '0 1rem 1rem 1rem', backgroundColor: '#f9fafb' }}>
                                                                            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                                                                <strong>進路詳細:</strong>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                                                    {Object.entries(nat.categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                                                                                        <span key={cat} style={{ padding: '0.25rem 0.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '0.85rem' }}>
                                                                                            {cat}: <strong>{count}名</strong>
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                        }


                        {careerSubTab === 'schools' && (
                            <div className={styles.chartCard} style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3 className={styles.chartTitle} style={{ margin: 0 }}>主な進学先とJLPT成績 (詳細:合格/不合格)</h3>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>調査対象: 2018~2024年度卒業生</div>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                        {careerStats.topDestinations.filter(d => d.jlptStats && Object.keys(d.jlptStats).length > 0).length}校
                                    </span>
                                </div>
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>進学先名</th>
                                                <th>進学者数</th>
                                                <th>JLPTデータ</th>
                                                <th>詳細</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {careerStats.topDestinations
                                                .filter(d => d.jlptStats && Object.keys(d.jlptStats).length > 0)
                                                .sort((a, b) => b.count - a.count)
                                                .map((dest, idx) => {
                                                    const isExpanded = expandedSchoolId === idx;
                                                    return (
                                                        <Fragment key={idx}>
                                                            <tr
                                                                onClick={() => setExpandedSchoolId(isExpanded ? null : idx)}
                                                                className={isExpanded ? styles.expandedRow : ''}
                                                                style={{ cursor: 'pointer', borderBottom: isExpanded ? 'none' : '1px solid #e5e7eb' }}
                                                            >
                                                                <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                                                <td>{dest.count}名</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                                        {Object.keys(dest.jlptStats).sort().map(lvl => {
                                                                            const stats = dest.jlptStats[lvl];
                                                                            const hasData = (stats.passed?.count || 0) + (stats.failed?.count || 0) > 0;
                                                                            if (!hasData) return null;
                                                                            return (
                                                                                <span key={lvl} className={`${styles.badge} ${styles[`badge${lvl}`]}`} style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                                                                                    {lvl}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <AccordionChevron rotated={isExpanded} />
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                                    <td colSpan="4" style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                                                        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                                                                            <table className={styles.table} style={{ margin: 0 }}>
                                                                                <thead style={{ background: '#f3f4f6' }}>
                                                                                    <tr>
                                                                                        <th style={{ fontSize: '0.8rem', padding: '0.5rem' }}>レベル</th>
                                                                                        <th style={{ fontSize: '0.8rem', padding: '0.5rem' }}>取得率</th>
                                                                                        <th style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                                                                                            データ数
                                                                                            <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#6b7280' }}>(合格/不合格)</div>
                                                                                        </th>
                                                                                        <th style={{ fontSize: '0.8rem', padding: '0.5rem' }}>全体平均点</th>
                                                                                        <th style={{ fontSize: '0.8rem', padding: '0.5rem' }}>
                                                                                            平均点
                                                                                            <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: '#6b7280' }}>(合格/不合格)</div>
                                                                                        </th>
                                                                                        <th style={{ fontSize: '0.8rem', padding: '0.5rem' }}>最高点 / 最低点</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {Object.entries(dest.jlptStats)
                                                                                        .sort((a, b) => {
                                                                                            const order = { 'N1': 1, 'N2': 2, 'N3': 3, 'N4': 4, 'N5': 5 };
                                                                                            return (order[a[0]] || 99) - (order[b[0]] || 99);
                                                                                        })
                                                                                        .map(([level, stats]) => {
                                                                                            const passed = stats.passed || {};
                                                                                            const failed = stats.failed || {};

                                                                                            // Robust calculation of metrics
                                                                                            const pCount = passed.count || 0;
                                                                                            const fCount = failed.count || 0;
                                                                                            const totalCount = pCount + fCount;

                                                                                            if (totalCount === 0) return null;

                                                                                            const passRate = stats.passRate !== undefined
                                                                                                ? stats.passRate
                                                                                                : (totalCount > 0 ? ((pCount / totalCount) * 100).toFixed(1) : 0);

                                                                                            let overallAvg = stats.overall?.avg;
                                                                                            if (overallAvg === undefined) {
                                                                                                const pSum = (passed.avg || 0) * pCount;
                                                                                                const fSum = (failed.avg || 0) * fCount;
                                                                                                overallAvg = totalCount > 0 ? (pSum + fSum) / totalCount : 0;
                                                                                                overallAvg = overallAvg.toFixed(1);
                                                                                            }

                                                                                            let overallMax = stats.overall?.max;
                                                                                            if (overallMax === undefined) {
                                                                                                const pMax = passed.max !== undefined ? passed.max : -1;
                                                                                                const fMax = failed.max !== undefined ? failed.max : -1;
                                                                                                overallMax = Math.max(pMax, fMax);
                                                                                                if (overallMax === -1) overallMax = '-';
                                                                                            }

                                                                                            let overallMin = stats.overall?.min;
                                                                                            if (overallMin === undefined) {
                                                                                                // Filter out undefined/null/0 if strictly checking, but here we assume valid scores > 0 usually
                                                                                                // If both are missing, result is '-'
                                                                                                const candidates = [];
                                                                                                if (passed.min !== undefined) candidates.push(passed.min);
                                                                                                if (failed.min !== undefined) candidates.push(failed.min);
                                                                                                overallMin = candidates.length > 0 ? Math.min(...candidates) : '-';
                                                                                            }

                                                                                            const renderDual = (pVal, fVal, isBold = false) => (
                                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                    <span style={{ color: COLOR_PASS, fontWeight: 600 }}>{pVal ?? '-'}</span>
                                                                                                    <span style={{ color: COLOR_MUTED, fontSize: '0.8em' }}>/</span>
                                                                                                    <span style={{ color: COLOR_FAIL, fontWeight: 600 }}>{fVal ?? '-'}</span>
                                                                                                </div>
                                                                                            );

                                                                                            return (
                                                                                                <tr key={level}>
                                                                                                    <td style={{ padding: '0.5rem' }}>
                                                                                                        <span className={`${styles.badge} ${styles[`badge${level}`]}`}>{level}</span>
                                                                                                    </td>
                                                                                                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#16a34a' }}>
                                                                                                        {passRate}%
                                                                                                    </td>
                                                                                                    <td style={{ padding: '0.5rem' }}>
                                                                                                        {renderDual(passed.count, failed.count)}
                                                                                                    </td>
                                                                                                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#3b82f6' }}>
                                                                                                        {overallAvg}
                                                                                                    </td>
                                                                                                    <td style={{ padding: '0.5rem' }}>
                                                                                                        {renderDual(passed.avg?.toFixed(1), failed.avg?.toFixed(1), true)}
                                                                                                    </td>
                                                                                                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                            <span style={{ color: '#22c55e' }}>{overallMax}</span>
                                                                                                            <span style={{ color: '#9ca3af', fontSize: '0.8em' }}>/</span>
                                                                                                            <span style={{ color: '#ef4444' }}>{overallMin}</span>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            );
                                                                                        })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </Fragment>
                                                    );
                                                })}
                                            {careerStats.topDestinations.filter(d => d.jlptStats).length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', color: '#6b7280' }}>
                                                        合格者のJLPTスコアデータがありません
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {careerSubTab === 'past5years' && (
                            <div className={styles.chartCard} style={{ marginTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className={styles.chartTitle} style={{ margin: 0 }}>過去5年間の進学実績詳細 (2019-2023)</h3>
                                    <input
                                        type="text"
                                        placeholder="学校名・氏名で検索..."
                                        value={careerSearchQuery}
                                        onChange={(e) => setCareerSearchQuery(e.target.value)}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '0.9rem',
                                            width: '250px'
                                        }}
                                    />
                                </div>
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>進学先名</th>
                                                <th>5年間合計</th>
                                                <th>2024年度</th>
                                                <th>2023年度</th>
                                                <th>2022年度</th>
                                                <th>2021年度</th>
                                                <th>2020年度</th>
                                                <th>詳細</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {careerStats.topDestinations
                                                .filter(d => {
                                                    const q = careerSearchQuery.toLowerCase().replace(/\s+/g, '');
                                                    if (!q) return true;
                                                    // Normalize data for comparison
                                                    const normDestName = d.name.toLowerCase().replace(/\s+/g, '');
                                                    if (normDestName.includes(q)) return true;

                                                    // Check matches in student list
                                                    if (d.students && d.students.some(s => {
                                                        const normName = (s.name || '').toLowerCase().replace(/\s+/g, '');
                                                        return normName.includes(q);
                                                    })) return true;

                                                    return false;
                                                })
                                                .map(d => {
                                                    const matches = careerSearchQuery && d.students
                                                        ? d.students.filter(s => (s.name || '').includes(careerSearchQuery))
                                                        : [];
                                                    const y2023 = (d.years && d.years['2023']) || 0;
                                                    const y2022 = (d.years && d.years['2022']) || 0;
                                                    const y2021 = (d.years && d.years['2021']) || 0;
                                                    const y2020 = (d.years && d.years['2020']) || 0;
                                                    const y2019 = (d.years && d.years['2019']) || 0;
                                                    const total5 = y2023 + y2022 + y2021 + y2020 + y2019;
                                                    return { ...d, y2023, y2022, y2021, y2020, y2019, total5 };
                                                })
                                                .filter(d => d.total5 > 0)
                                                .sort((a, b) => b.total5 - a.total5)
                                                .map((dest, idx) => {
                                                    const matches = careerSearchQuery && dest.students
                                                        ? dest.students.filter(s => {
                                                            const q = careerSearchQuery.toLowerCase().replace(/\s+/g, '');
                                                            const normName = (s.name || '').toLowerCase().replace(/\s+/g, '');
                                                            return normName.includes(q);
                                                        })
                                                        : [];

                                                    const isExpanded = expandedPast5YearsSchoolId === idx;

                                                    return (
                                                        <Fragment key={idx}>
                                                            <tr key={idx}
                                                                onClick={() => setExpandedPast5YearsSchoolId(isExpanded ? null : idx)}
                                                                className={isExpanded ? styles.expandedRow : ''}
                                                                style={{ cursor: 'pointer', borderBottom: isExpanded ? 'none' : '1px solid #e5e7eb' }}
                                                            >
                                                                <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                                                <td>{dest.total5}名</td>
                                                                <td style={{ color: dest.y2023 > 0 ? 'inherit' : '#d1d5db' }}>{dest.y2023 > 0 ? `${dest.y2023}名` : '-'}</td>
                                                                <td style={{ color: dest.y2022 > 0 ? 'inherit' : '#d1d5db' }}>{dest.y2022 > 0 ? `${dest.y2022}名` : '-'}</td>
                                                                <td style={{ color: dest.y2021 > 0 ? 'inherit' : '#d1d5db' }}>{dest.y2021 > 0 ? `${dest.y2021}名` : '-'}</td>
                                                                <td style={{ color: dest.y2020 > 0 ? 'inherit' : '#d1d5db' }}>{dest.y2020 > 0 ? `${dest.y2020}名` : '-'}</td>
                                                                <td style={{ color: dest.y2019 > 0 ? 'inherit' : '#d1d5db' }}>{dest.y2019 > 0 ? `${dest.y2019}名` : '-'}</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <AccordionChevron rotated={isExpanded} />
                                                                </td>
                                                            </tr>
                                                            {matches.length > 0 && !isExpanded && (
                                                                <tr>
                                                                    <td colSpan="8" style={{ backgroundColor: '#f0fdf4', padding: '0.5rem 1rem' }}>
                                                                        <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                                                                            <strong>検索ヒット:</strong> {matches.map(s => `${s.name} (${parseInt(s.year) + 1}年卒)`).join(', ')}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan="8" style={{ padding: '0 1rem 1rem 1rem', backgroundColor: '#f9fafb' }}>
                                                                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                                                            <strong>合格者一覧 (年度別):</strong>
                                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                                                {['2023', '2022', '2021', '2020', '2019'].map(year => {
                                                                                    const studentsInYear = (dest.students || []).filter(s => String(s.year) === String(year));
                                                                                    if (studentsInYear.length === 0) return null;
                                                                                    return (
                                                                                        <div key={year} style={{ display: 'flex', alignItems: 'baseline', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.25rem' }}>
                                                                                            <span style={{ fontWeight: 600, minWidth: '80px', color: '#4b5563' }}>{parseInt(year) + 1}年度卒:</span>
                                                                                            <span style={{ marginLeft: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                                                {studentsInYear.map((s, i) => (
                                                                                                    <span key={i} style={{
                                                                                                        backgroundColor: '#e0f2fe',
                                                                                                        color: '#0369a1',
                                                                                                        padding: '0.25rem 0.5rem',
                                                                                                        borderRadius: '9999px',
                                                                                                        fontSize: '0.85rem',
                                                                                                        whiteSpace: 'nowrap'
                                                                                                    }}>
                                                                                                        {s.name}
                                                                                                    </span>
                                                                                                ))}
                                                                                            </span>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </Fragment>
                                                    )
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

            {/* Database Tab Content */}
            {activeTab === 'database' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                    <div className={styles.filters} style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        <div className={styles.filterGroup} style={{ flex: '1 1 300px' }}>
                            <label className={styles.filterLabel}>生徒検索 (キーワードを入力)</label>
                            <input
                                type="text"
                                placeholder="名前/学籍番号/進学先などで絞り込み..."
                                className={styles.filterSelect}
                                style={{ width: '100%', padding: '0.5rem' }}
                                value={dbSearchQuery}
                                onChange={(e) => setDbSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className={styles.filterGroup} style={{ flex: '0 1 120px' }}>
                            <label className={styles.filterLabel}>入学年度</label>
                            <select
                                className={styles.filterSelect}
                                value={dbYearFilter}
                                onChange={(e) => setDbYearFilter(e.target.value)}
                            >
                                <option value="">すべて</option>
                                {dbFilterOptions.years.map(y => <option key={y} value={y}>{y}年度</option>)}
                            </select>
                        </div>

                        <div className={styles.filterGroup} style={{ flex: '0 1 180px' }}>
                            <label className={styles.filterLabel}>クラス</label>
                            <select
                                className={styles.filterSelect}
                                value={dbClassFilter}
                                onChange={(e) => setDbClassFilter(e.target.value)}
                            >
                                <option value="">すべて</option>
                                {dbFilterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className={styles.filterGroup} style={{ flex: '0 1 120px' }}>
                            <label className={styles.filterLabel}>国籍</label>
                            <select
                                className={styles.filterSelect}
                                value={dbNationalityFilter}
                                onChange={(e) => setDbNationalityFilter(e.target.value)}
                            >
                                <option value="">すべて</option>
                                {dbFilterOptions.nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>

                        <div className={styles.filterGroup} style={{ flex: '0 1 140px' }}>
                            <label className={styles.filterLabel}>JLPT最高レベル</label>
                            <select
                                className={styles.filterSelect}
                                value={dbLevelFilter}
                                onChange={(e) => setDbLevelFilter(e.target.value)}
                            >
                                <option value="">すべて</option>
                                {dbFilterOptions.levels.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>学籍番号</th>
                                    <th>名前</th>
                                    <th>入学年度</th>
                                    <th>クラス</th>
                                    <th>国籍</th>
                                    <th>進学先</th>
                                    <th>JLPT最高レベル</th>
                                    <th>詳細</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dbFilteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            {dbSearchQuery ? '該当する生徒が見つかりません' : '検索条件を入力してください'}
                                        </td>
                                    </tr>
                                ) : (
                                    dbFilteredStudents
                                        .slice((dbCurrentPage - 1) * DB_ITEMS_PER_PAGE, dbCurrentPage * DB_ITEMS_PER_PAGE)
                                        .map((student, idx) => (
                                            <tr key={idx}>
                                                <td>{student.studentId || '-'}</td>
                                                <td style={{ fontWeight: 600, maxWidth: '150px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{student.name}</td>
                                                <td>{student.enrollmentYear || '-'}</td>
                                                <td>{['中国人新入生クラス', 'ベトナム人新入生クラス', 'ベトナムっ人新入生クラス'].includes(student.class) ? '-' : (student.class || '-')}</td>
                                                <td>{student.nationality || '-'}</td>
                                                <td style={{ maxWidth: '150px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{student.destination || '-'}</td>
                                                <td>
                                                    {student.highestLevel ? (
                                                        <span className={`${styles.badge} ${styles[`badge${student.highestLevel}`]}`}>
                                                            {student.highestLevel}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                                                        {['N1', 'N2', 'N3'].map(lvl => {
                                                            const s = student.levels[lvl];
                                                            if (s.status === '合格') return <span key={lvl} style={{ color: COLOR_PASS, fontWeight: 'bold' }}>{lvl}: {s.score}点 ({s.date})</span>;
                                                            if (s.status === '不合格') return <span key={lvl} style={{ color: COLOR_FAIL, fontWeight: 'bold' }}>{lvl}: {s.score}点 ({s.date})</span>;
                                                            return null;
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            全 {dbFilteredStudents.length} 件中 {(dbCurrentPage - 1) * DB_ITEMS_PER_PAGE + 1} - {Math.min(dbCurrentPage * DB_ITEMS_PER_PAGE, dbFilteredStudents.length)} 件を表示
                        </div>

                        {dbFilteredStudents.length > DB_ITEMS_PER_PAGE && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setDbCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={dbCurrentPage === 1}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        backgroundColor: dbCurrentPage === 1 ? '#f3f4f6' : 'white',
                                        color: dbCurrentPage === 1 ? '#9ca3af' : '#374151',
                                        cursor: dbCurrentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    前へ
                                </button>
                                <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', color: '#4b5563' }}>
                                    {dbCurrentPage} / {Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE)}
                                </span>
                                <button
                                    onClick={() => setDbCurrentPage(prev => Math.min(prev + 1, Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE)))}
                                    disabled={dbCurrentPage >= Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        backgroundColor: dbCurrentPage >= Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE) ? '#f3f4f6' : 'white',
                                        color: dbCurrentPage >= Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE) ? '#9ca3af' : '#374151',
                                        cursor: dbCurrentPage >= Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    次へ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={styles.footer}>
                <p>※ データは現在のフィルタ設定に基づいています。</p>
            </div>
        </div>
    )
}
