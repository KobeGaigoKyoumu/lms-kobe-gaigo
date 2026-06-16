'use client'

import { useState, useMemo, Fragment } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { ChevronDown } from 'lucide-react'
import styles from '../page.module.css'

const AccordionChevron = ({ rotated }) => (
    <div style={{
        transform: rotated ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
        <ChevronDown size={18} color="#9ca3af" />
    </div>
)

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const range = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
        range.push(i);
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.375rem',
            marginTop: '1.5rem',
            marginBottom: '1rem',
            userSelect: 'none'
        }}>
            <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : '#ffffff',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    fontSize: '0.875rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none'
                }}
            >
                前へ
            </button>
            
            {start > 1 && (
                <>
                    <button
                        onClick={() => onPageChange(1)}
                        style={{
                            padding: '0.375rem 0.625rem',
                            minWidth: '2rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        1
                    </button>
                    {start > 2 && <span style={{ color: '#9ca3af', margin: '0 0.25rem' }}>...</span>}
                </>
            )}

            {range.map(p => (
                <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    style={{
                        padding: '0.375rem 0.625rem',
                        minWidth: '2rem',
                        borderRadius: '0.375rem',
                        border: p === currentPage ? '1px solid #2563eb' : '1px solid #d1d5db',
                        backgroundColor: p === currentPage ? '#2563eb' : '#ffffff',
                        color: p === currentPage ? '#ffffff' : '#374151',
                        fontWeight: p === currentPage ? 600 : 'normal',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        outline: 'none'
                    }}
                >
                    {p}
                </button>
            ))}

            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span style={{ color: '#9ca3af', margin: '0 0.25rem' }}>...</span>}
                    <button
                        onClick={() => onPageChange(totalPages)}
                        style={{
                            padding: '0.375rem 0.625rem',
                            minWidth: '2rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#ffffff',
                            color: '#374151',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        {totalPages}
                    </button>
                </>
            )}

            <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#ffffff',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    fontSize: '0.875rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    outline: 'none'
                }}
            >
                次へ
            </button>
        </div>
    );
};

const renderStatValue = (passedVal, failedVal, isAverage = false) => {
    const passedStr = passedVal !== null && passedVal !== undefined ? (isAverage ? passedVal.toFixed(1) : passedVal) : '-';
    const failedStr = failedVal !== null && failedVal !== undefined ? (isAverage ? failedVal.toFixed(1) : failedVal) : '-';
    
    return (
        <span>
            <span style={{ color: '#22c55e', fontWeight: 600 }}>{passedStr}</span>
            <span style={{ color: '#9ca3af', margin: '0 0.25rem' }}>/</span>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>{failedStr}</span>
        </span>
    );
};

export default function CareerTab({ careerStats, chartFontSize, studentDb = [] }) {
    const [careerSubTab, setCareerSubTab] = useState('overview')
    const [selectedYear, setSelectedYear] = useState('all') // Default to all years
    const [expandedSchoolId, setExpandedSchoolId] = useState(null)

    // 学校別詳細用のState
    const [schoolsSearchQuery, setSchoolsSearchQuery] = useState('')
    const [schoolsPage, setSchoolsPage] = useState(1)

    // 全年度実績詳細用のState
    const [careerSearchQuery, setCareerSearchQuery] = useState('')
    const [expandedPast5YearsSchoolId, setExpandedPast5YearsSchoolId] = useState(null)
    const [past5YearsPage, setPast5YearsPage] = useState(1)

    // JLPT入りやすさランキング用のState
    const [rankingPage, setRankingPage] = useState(1)

    const ITEMS_PER_PAGE = 50

    // 各進学先の進学者リストのJLPT成績を集計する
    const getStudentJlptStats = useMemo(() => {
        return (schoolStudents) => {
            if (!schoolStudents || schoolStudents.length === 0 || !studentDb || studentDb.length === 0) {
                return [];
            }
            
            const matchingDbStudents = schoolStudents.map(s => {
                return studentDb.find(dbStudent => 
                    String(dbStudent.studentId) === String(s.id) ||
                    dbStudent.name === s.name
                );
            }).filter(Boolean);

            const levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
            const statsByLevel = {};

            matchingDbStudents.forEach(dbStudent => {
                levels.forEach(lvl => {
                    const levelData = dbStudent.levels?.[lvl];
                    if (levelData && levelData.status && (levelData.status === '合格' || levelData.status === '不合格')) {
                        const status = levelData.status;
                        let score = parseFloat(levelData.score);
                        if (isNaN(score) || score === 0) {
                            const matches = String(levelData.score).match(/\d+/);
                            if (matches) {
                                score = parseFloat(matches[0]);
                            } else {
                                score = NaN;
                            }
                        }
                        
                        if (!isNaN(score) && score > 0) {
                            if (!statsByLevel[lvl]) {
                                statsByLevel[lvl] = {
                                    level: lvl,
                                    passed: { count: 0, sum: 0, max: -Infinity, min: Infinity },
                                    failed: { count: 0, sum: 0, max: -Infinity, min: Infinity }
                                };
                            }
                            
                            const targetGroup = status === '合格' ? statsByLevel[lvl].passed : statsByLevel[lvl].failed;
                            targetGroup.count += 1;
                            targetGroup.sum += score;
                            if (score > targetGroup.max) targetGroup.max = score;
                            if (score < targetGroup.min) targetGroup.min = score;
                        }
                    }
                });
            });

            return levels.map(lvl => {
                const lvlStat = statsByLevel[lvl];
                if (!lvlStat) return null;
                
                return {
                    level: lvl,
                    passed: {
                        count: lvlStat.passed.count,
                        average: lvlStat.passed.count > 0 ? parseFloat((lvlStat.passed.sum / lvlStat.passed.count).toFixed(1)) : null,
                        max: lvlStat.passed.count > 0 ? lvlStat.passed.max : null,
                        min: lvlStat.passed.count > 0 ? lvlStat.passed.min : null
                    },
                    failed: {
                        count: lvlStat.failed.count,
                        average: lvlStat.failed.count > 0 ? parseFloat((lvlStat.failed.sum / lvlStat.failed.count).toFixed(1)) : null,
                        max: lvlStat.failed.count > 0 ? lvlStat.failed.max : null,
                        min: lvlStat.failed.count > 0 ? lvlStat.failed.min : null
                    }
                };
            }).filter(Boolean);
        };
    }, [studentDb]);

    // 各年度ごとのJLPT保有率を集計する
    const getYearlyJlptStats = useMemo(() => {
        return (schoolStudents) => {
            if (!schoolStudents || schoolStudents.length === 0 || !studentDb || studentDb.length === 0) {
                return {};
            }
            
            const matchingDbStudents = schoolStudents.map(s => {
                const dbStudent = studentDb.find(dbStudent => 
                    String(dbStudent.studentId) === String(s.id) ||
                    dbStudent.name === s.name
                );
                if (dbStudent) {
                    return {
                        ...dbStudent,
                        year: s.year
                    };
                }
                return null;
            }).filter(Boolean);

            const yearlyData = {};

            matchingDbStudents.forEach(dbStudent => {
                const year = dbStudent.year;
                if (!year) return;

                if (!yearlyData[year]) {
                    yearlyData[year] = {
                        totalStudents: 0,
                        hasN1: 0,
                        hasN2: 0,
                        hasN3: 0
                    };
                }

                yearlyData[year].totalStudents += 1;

                const isN1 = dbStudent.levels?.['N1']?.status === '合格';
                const isN2 = dbStudent.levels?.['N2']?.status === '合格';
                const isN3 = dbStudent.levels?.['N3']?.status === '合格';

                if (isN1) {
                    yearlyData[year].hasN1 += 1;
                }
                if (isN1 || isN2) {
                    yearlyData[year].hasN2 += 1;
                }
                if (isN1 || isN2 || isN3) {
                    yearlyData[year].hasN3 += 1;
                }
            });

            const result = {};
            Object.keys(yearlyData).forEach(year => {
                const total = yearlyData[year].totalStudents;
                result[year] = {
                    n1Rate: total > 0 ? parseFloat((yearlyData[year].hasN1 / total * 100).toFixed(1)) : 0,
                    n2Rate: total > 0 ? parseFloat((yearlyData[year].hasN2 / total * 100).toFixed(1)) : 0,
                    n3Rate: total > 0 ? parseFloat((yearlyData[year].hasN3 / total * 100).toFixed(1)) : 0,
                    n1Count: yearlyData[year].hasN1,
                    n2Count: yearlyData[year].hasN2,
                    n3Count: yearlyData[year].hasN3,
                    totalCount: total
                };
            });

            return result;
        };
    }, [studentDb]);

    // Ensure the year selector is populated correctly
    const availableYears = useMemo(() => {
        if (!careerStats?.yearlyTrends) return []
        return [...careerStats.yearlyTrends].map(t => String(t.year)).sort((a, b) => Number(b) - Number(a))
    }, [careerStats])

    const targetYears = useMemo(() => {
        return availableYears.map(Number)
    }, [availableYears])

    const processedPast5YearsData = useMemo(() => {
        if (!careerStats?.topDestinations || targetYears.length === 0) return []
        
        return careerStats.topDestinations
            .map(dest => {
                const counts = {}
                targetYears.forEach(year => {
                    counts[year] = dest.years?.[String(year)] || 0
                })
                const totalYears = Object.values(counts).reduce((a, b) => a + b, 0)
                
                if (totalYears === 0) return null

                const query = careerSearchQuery.trim().toLowerCase()
                const nameMatches = dest.name.toLowerCase().includes(query)
                
                const matchingStudents = (dest.students || []).filter(s => {
                    const isTargetYear = targetYears.includes(Number(s.year))
                    if (!isTargetYear) return false
                    if (!query) return true
                    
                    return s.name.toLowerCase().includes(query) || 
                           (s.nationality && s.nationality.toLowerCase().includes(query)) ||
                           String(s.id).includes(query)
                })

                if (query && !nameMatches && matchingStudents.length === 0) {
                    return null
                }

                return {
                    ...dest,
                    counts,
                    total5Years: totalYears,
                    displayStudents: query && !nameMatches ? matchingStudents : (dest.students || []).filter(s => targetYears.includes(Number(s.year)))
                }
            })
            .filter(Boolean)
            .sort((a, b) => b.total5Years - a.total5Years)
    }, [careerStats, careerSearchQuery, targetYears])

    // Fetch the stats for the selected year
    const stats = useMemo(() => {
        if (!careerStats?.yearlyTrends) return null
        
        if (selectedYear === 'all') {
            const totalRecords = careerStats.yearlyTrends.reduce((sum, t) => sum + (t.total || 0), 0)
            const totalGraduates = careerStats.yearlyTrends.reduce((sum, t) => sum + (t.graduated || 0), 0)
            
            const categoryStats = {}
            careerStats.yearlyTrends.forEach(t => {
                if (t.categories) {
                    Object.entries(t.categories).forEach(([cat, val]) => {
                        categoryStats[cat] = (categoryStats[cat] || 0) + val
                    })
                }
            })

            const topDestinations = (careerStats.topDestinations || [])
                .map(d => ({ 
                    name: d.name, 
                    count: d.count || 0, 
                    students: d.students || [] 
                }))
                .filter(d => d.count > 0)
                .sort((a, b) => b.count - a.count)

            return {
                summary: {
                    totalRecords,
                    totalGraduates
                },
                categoryStats,
                topDestinations
            }
        } else {
            let targetYear = selectedYear
            if (!availableYears.includes(targetYear) && availableYears.length > 0) {
                targetYear = availableYears[0]
            }

            const trend = careerStats.yearlyTrends.find(t => String(t.year) === targetYear)
            if (!trend) return null

            return {
                summary: {
                    totalRecords: trend.total || 0,
                    totalGraduates: trend.graduated || 0
                },
                categoryStats: trend.categories || {},
                topDestinations: (careerStats.topDestinations || [])
                    .filter(d => d.years && d.years[targetYear])
                    .map(d => ({ 
                        name: d.name, 
                        count: d.years[targetYear], 
                        students: d.students?.filter(s => String(s.year) === targetYear) || [] 
                    }))
                    .sort((a, b) => b.count - a.count)
            }
        }
    }, [careerStats, selectedYear, availableYears])

    // 年度別進学率の推移のグラフ用データ
    const trendsSorted = useMemo(() => {
        if (!careerStats?.yearlyTrends) return [];
        return [...careerStats.yearlyTrends].sort((a, b) => a.year - b.year);
    }, [careerStats]);

    const lineChartData = useMemo(() => {
        return {
            labels: trendsSorted.map(t => `${t.year}年度卒業`),
            datasets: [{
                label: '進学率',
                data: trendsSorted.map(t => {
                    const uni = t.categories?.['大学'] || 0;
                    const grad = t.categories?.['大学院'] || 0;
                    const voc = t.categories?.['専門学校'] || 0;
                    const jr = t.categories?.['短期大学'] || 0;
                    const total = t.total || 1;
                    return parseFloat(((uni + grad + voc + jr) / total * 100).toFixed(1));
                }),
                borderColor: '#10b981', // エメラルドグリーン
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderWidth: 2.5,
                tension: 0.3,
                pointBackgroundColor: '#10b981',
                pointHoverRadius: 6,
                fill: false
            }]
        };
    }, [trendsSorted]);

    const avgAdvancementRate = useMemo(() => {
        if (trendsSorted.length === 0) return '0.0';
        let totalEnrolled = 0;
        let totalRecords = 0;
        trendsSorted.forEach(t => {
            const uni = t.categories?.['大学'] || 0;
            const grad = t.categories?.['大学院'] || 0;
            const voc = t.categories?.['専門学校'] || 0;
            const jr = t.categories?.['短期大学'] || 0;
            totalEnrolled += (uni + grad + voc + jr);
            totalRecords += (t.total || 0);
        });
        return totalRecords > 0 ? ((totalEnrolled / totalRecords) * 100).toFixed(1) : '0.0';
    }, [trendsSorted]);

    // JLPT結果から計る進学先別入りやすさランキング用データ
    const schoolJlptRankings = useMemo(() => {
        if (!stats?.topDestinations || !studentDb || studentDb.length === 0) return [];

        const levelWeights = {
            'N5': 0,
            'N4': 36,
            'N3': 72,
            'N2': 108,
            'N1': 144
        };

        let totalScoreSum = 0;
        let totalSampleCount = 0;
        const rawSchoolData = [];

        stats.topDestinations.forEach(school => {
            let scoreSum = 0;
            let scoreCount = 0;
            const levelScores = {};

            school.students.forEach(s => {
                const dbStudent = studentDb.find(dbStudent => 
                    String(dbStudent.studentId) === String(s.id) ||
                    dbStudent.name === s.name
                );

                if (dbStudent && dbStudent.levels) {
                    Object.entries(dbStudent.levels).forEach(([lvl, lvlData]) => {
                        if (lvlData && (lvlData.status === '合格' || lvlData.status === '不合格')) {
                            let score = parseFloat(lvlData.score);
                            if (isNaN(score) || score === 0) {
                                const matches = String(lvlData.score).match(/\d+/);
                                if (matches) {
                                    score = parseFloat(matches[0]);
                                } else {
                                    score = NaN;
                                }
                            }

                            const base = levelWeights[lvl];
                            if (base !== undefined && !isNaN(score) && score >= 0 && score <= 180) {
                                const integratedScore = base + (score / 5);
                                scoreSum += integratedScore;
                                scoreCount++;
                                levelScores[lvl] = (levelScores[lvl] || 0) + 1;
                            }
                        }
                    });
                }
            });

            if (scoreCount > 0) {
                const averageScore = scoreSum / scoreCount;
                totalScoreSum += scoreSum;
                totalSampleCount += scoreCount;

                const levelsText = Object.entries(levelScores)
                    .map(([lvl, count]) => `${lvl}: ${count}件`)
                    .join(', ');

                rawSchoolData.push({
                    name: school.name,
                    averageScore: averageScore,
                    sampleCount: scoreCount,
                    levelsText: levelsText
                });
            }
        });

        if (rawSchoolData.length === 0 || totalSampleCount === 0) return [];

        // 全体の単純平均
        const overallAverageScore = totalScoreSum / totalSampleCount;
        
        // 信頼度定数 m (最小サンプル数としてのウェイト、m=3.0)
        const m = 3.0;

        // 各校のベイズ平均スコア（信頼加重平均）を算出する
        const rankings = rawSchoolData.map(school => {
            const v = school.sampleCount;
            const R = school.averageScore;
            const C = overallAverageScore;
            
            // ベイズ平均 = (v * R + m * C) / (v + m)
            const bayesianScore = (v * R + m * C) / (v + m);

            return {
                ...school,
                bayesianScore: bayesianScore
            };
        });

        // 入りやすい順（ベイズ平均スコアの昇順＝低い順）でソート
        return rankings.sort((a, b) => a.bayesianScore - b.bayesianScore);
    }, [stats, studentDb]);

    const ITEMS_PER_PAGE_RANKING = 50;

    const paginatedRanking = useMemo(() => {
        const startIndex = (rankingPage - 1) * ITEMS_PER_PAGE_RANKING;
        return schoolJlptRankings.slice(startIndex, startIndex + ITEMS_PER_PAGE_RANKING);
    }, [schoolJlptRankings, rankingPage]);

    const totalRankingPages = Math.max(1, Math.ceil(schoolJlptRankings.length / ITEMS_PER_PAGE_RANKING));

    // 学校別詳細のフィルタリング
    const filteredSchools = useMemo(() => {
        if (!stats?.topDestinations) return []
        const query = schoolsSearchQuery.trim().toLowerCase()
        if (!query) return stats.topDestinations

        return stats.topDestinations.filter(dest => 
            dest.name.toLowerCase().includes(query)
        )
    }, [stats, schoolsSearchQuery])

    // 学校別詳細のページ分割
    const paginatedSchools = useMemo(() => {
        const startIndex = (schoolsPage - 1) * ITEMS_PER_PAGE
        return filteredSchools.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    }, [filteredSchools, schoolsPage])

    const totalSchoolsPages = Math.max(1, Math.ceil(filteredSchools.length / ITEMS_PER_PAGE))

    // 全年度実績詳細のページ分割
    const paginatedPast5YearsData = useMemo(() => {
        const startIndex = (past5YearsPage - 1) * ITEMS_PER_PAGE
        return processedPast5YearsData.slice(startIndex, startIndex + ITEMS_PER_PAGE)
    }, [processedPast5YearsData, past5YearsPage])

    const totalPast5YearsPages = Math.max(1, Math.ceil(processedPast5YearsData.length / ITEMS_PER_PAGE))

    // Standardized Color Constants
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

    if (!stats || availableYears.length === 0) {
        return <div className={styles.noData}>進路分析データがありません</div>
    }

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            {/* Action Bar / Filters */}
            <div className={styles.filters} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <div className={styles.subTabs}>
                    <button className={`${styles.subTab} ${careerSubTab === 'overview' ? styles.active : ''}`} onClick={() => setCareerSubTab('overview')}>全体概要</button>
                    <button className={`${styles.subTab} ${careerSubTab === 'schools' ? styles.active : ''}`} onClick={() => setCareerSubTab('schools')}>学校別詳細</button>
                    <button className={`${styles.subTab} ${careerSubTab === 'past5years' ? styles.active : ''}`} onClick={() => setCareerSubTab('past5years')}>全年度実績詳細</button>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>卒業年度</label>
                    <select 
                        className={styles.filterSelect} 
                        value={selectedYear} 
                        onChange={(e) => {
                            setSelectedYear(e.target.value)
                            setSchoolsPage(1)
                        }}
                    >
                        <option value="all">全年度</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </select>
                </div>
            </div>

            {careerSubTab === 'overview' && (
                <div className={styles.tabContent}>
                    <div style={{
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde047',
                        borderRadius: '0.5rem',
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        color: '#a16207',
                        fontSize: '0.875rem',
                        lineHeight: '1.6',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            <span style={{ color: '#d97706' }}>⚠️</span>
                            <span>COVID-19の影響について：</span>
                        </div>
                        <div>
                            2020年〜2022年は新型コロナウイルスの影響により、入学時期の遅延がありました。2020年度は新入生がいなかったため、2021年度に進学した学生はほとんどいませんでした。
                        </div>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}><span className={styles.statLabel}>総卒業生数</span><div className={styles.statValueRow}><span className={styles.statValue}>{stats.summary.totalGraduates}</span>名</div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>進学率</span><div className={styles.statValueRow}><span className={styles.statValue}>{(((stats.categoryStats['大学'] || 0) + (stats.categoryStats['大学院'] || 0) + (stats.categoryStats['専門学校'] || 0) + (stats.categoryStats['短期大学'] || 0)) / (stats.summary.totalRecords || 1) * 100).toFixed(1)}%</span></div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>就職率</span><div className={styles.statValueRow}><span className={styles.statValue}>{((stats.categoryStats['就職'] || 0) / (stats.summary.totalRecords || 1) * 100).toFixed(1)}%</span></div></div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>対象年度</span>
                            <div className={styles.statValueRow}>
                                <span className={styles.statValue}>
                                    {selectedYear === 'all' ? availableYears.length : selectedYear}
                                </span>
                                {selectedYear === 'all' ? ' 年度' : '年度'}
                            </div>
                        </div>
                    </div>

                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>進路区分別内訳</h3>
                            <div className={styles.chartContainer}>
                                <Bar
                                    data={{
                                        labels: Object.keys(stats.categoryStats),
                                        datasets: [{
                                            data: Object.values(stats.categoryStats),
                                            backgroundColor: ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#6b7280', '#ef4444'],
                                        }]
                                    }}
                                    options={{ ...chartOptions, indexAxis: 'y' }}
                                />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 className={styles.chartTitle} style={{ margin: 0 }}>年度別進学率の推移</h3>
                                <span style={{
                                    backgroundColor: '#e6f4ea',
                                    color: '#137333',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    全年度平均: {avgAdvancementRate}%
                                </span>
                            </div>
                            <div className={styles.chartContainer}>
                                <Line
                                    data={lineChartData}
                                    options={{
                                        ...chartOptions,
                                        scales: {
                                            ...chartOptions.scales,
                                            y: {
                                                ...chartOptions.scales.y,
                                                min: 0,
                                                max: 100,
                                                ticks: {
                                                    ...chartOptions.scales.y.ticks,
                                                    callback: (value) => `${value}%`
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* JLPT結果から計る進学先別入りやすさランキングテーブル */}
                    <div style={{ marginTop: '2.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.75rem' }}>
                            JLPT結果から計る進学先別入りやすさランキング (データあり: {schoolJlptRankings.length}校)
                        </h3>
                        <p style={{ fontSize: '0.825rem', color: '#6b7280', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                            ※ 各進学先に合格・進学した学生のJLPT受験データより、全レベルをひとつの尺度（N5の0点〜N1の180点）に統合し、**ベイズ平均（信頼加重平均）**を用いて算出した入りやすさ指標です（数値が低いほど入りやすい）。サンプル数が極めて少ない学校の偏りを全体平均を用いて自動的に補正しています。
                        </p>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px', textAlign: 'center' }}>順位</th>
                                        <th>学校名</th>
                                        <th style={{ textAlign: 'right' }}>入りやすさ指標 (加重スコア: 0〜180)</th>
                                        <th style={{ textAlign: 'right' }}>受験データサンプル数</th>
                                        <th>対象レベル内訳 (受験件数)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRanking.map((school, index) => {
                                        const globalIndex = (rankingPage - 1) * ITEMS_PER_PAGE_RANKING + index;
                                        return (
                                            <tr key={school.name}>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: globalIndex < 3 ? '#eab308' : '#4b5563' }}>
                                                    #{globalIndex + 1}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{school.name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>
                                                    {school.bayesianScore.toFixed(1)}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>
                                                    {school.sampleCount} 件
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: '#4b5563' }}>
                                                    {school.levelsText}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {schoolJlptRankings.length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                                ランキング対象となるJLPT受験データがありません。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <Pagination 
                                currentPage={rankingPage} 
                                totalPages={totalRankingPages} 
                                onPageChange={setRankingPage} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {careerSubTab === 'schools' && (
                <div className={styles.tabContent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                            主な合格・進学実績とJLPT成績 (詳細:合格/不合格)
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="学校名で検索..."
                                value={schoolsSearchQuery}
                                onChange={(e) => {
                                    setSchoolsSearchQuery(e.target.value)
                                    setSchoolsPage(1)
                                }}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    width: '240px',
                                    outline: 'none',
                                }}
                            />
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                {filteredSchools.length}校
                            </span>
                        </div>
                    </div>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>学校名</th>
                                    <th>合格者数</th>
                                    <th>JLPTデータ</th>
                                    <th>詳細</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSchools.map((dest, idx) => {
                                    const isExpanded = expandedSchoolId === dest.name;
                                    const jlptStats = getStudentJlptStats(dest.students);
                                    const availableLevels = jlptStats.map(s => s.level);
                                    
                                    return (
                                        <Fragment key={dest.name || idx}>
                                            <tr onClick={() => setExpandedSchoolId(isExpanded ? null : dest.name)} className={styles.clickableRow}>
                                                <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                                <td>{dest.count}名</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                        {availableLevels.map(lvl => (
                                                            <span key={lvl} className={`${styles.badge} ${styles[`badge${lvl}`]}`}>
                                                                {lvl}
                                                            </span>
                                                        ))}
                                                        {availableLevels.length === 0 && <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>-</span>}
                                                    </div>
                                                </td>
                                                <td><AccordionChevron rotated={isExpanded} /></td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="4">
                                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc' }}>
                                                            {jlptStats.length > 0 ? (
                                                                <>
                                                                    <table className={styles.table} style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.375rem', width: '100%' }}>
                                                                       <thead>
                                                                           <tr>
                                                                               <th style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', fontWeight: 600 }}>レベル</th>
                                                                               <th style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', fontWeight: 600 }}>
                                                                                   データ数<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6b7280' }}>(合格/不合格)</span>
                                                                               </th>
                                                                               <th style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', fontWeight: 600 }}>
                                                                                   平均点<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6b7280' }}>(合格/不合格)</span>
                                                                               </th>
                                                                               <th style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', fontWeight: 600 }}>
                                                                                   最高点<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6b7280' }}>(合格/不合格)</span>
                                                                               </th>
                                                                               <th style={{ backgroundColor: '#f3f4f6', padding: '0.5rem', fontWeight: 600 }}>
                                                                                   最低点<br/><span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6b7280' }}>(合格/不合格)</span>
                                                                               </th>
                                                                           </tr>
                                                                       </thead>
                                                                       <tbody>
                                                                           {jlptStats.map(row => (
                                                                               <tr key={row.level}>
                                                                                   <td style={{ padding: '0.5rem' }}>
                                                                                       <span className={`${styles.badge} ${styles[`badge${row.level}`]}`}>
                                                                                           {row.level}
                                                                                       </span>
                                                                                   </td>
                                                                                   <td style={{ padding: '0.5rem' }}>
                                                                                       {renderStatValue(row.passed.count, row.failed.count)}
                                                                                   </td>
                                                                                   <td style={{ padding: '0.5rem' }}>
                                                                                       {renderStatValue(row.passed.average, row.failed.average, true)}
                                                                                   </td>
                                                                                   <td style={{ padding: '0.5rem' }}>
                                                                                       {renderStatValue(row.passed.max, row.failed.max)}
                                                                                   </td>
                                                                                   <td style={{ padding: '0.5rem' }}>
                                                                                       {renderStatValue(row.passed.min, row.failed.min)}
                                                                                   </td>
                                                                               </tr>
                                                                           ))}
                                                                       </tbody>
                                                                    </table>
                                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', lineHeight: '1.4' }}>
                                                                        ※ 1人の学生が複数のJLPTレベル（例: N3とN2など）を受験している場合、それぞれのレベルでデータがのべ数としてカウントされるため、JLPTのデータ総数が合格者数を上回る場合があります。
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>JLPTの受験データがありません。</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                                {filteredSchools.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>該当する実績データはありません</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Pagination currentPage={schoolsPage} totalPages={totalSchoolsPages} onPageChange={setSchoolsPage} />
                    </div>
                </div>
            )}

            {careerSubTab === 'past5years' && (
                <div className={styles.tabContent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                            全年度の合格・進学実績詳細 ({targetYears.length > 0 ? `${Math.min(...targetYears)}-${Math.max(...targetYears)}` : ''})
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="学校名・氏名で検索..."
                                value={careerSearchQuery}
                                onChange={(e) => {
                                    setCareerSearchQuery(e.target.value)
                                    setPast5YearsPage(1)
                                }}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    width: '240px',
                                    outline: 'none',
                                }}
                            />
                            <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                {processedPast5YearsData.length}校
                            </span>
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>学校名</th>
                                    <th style={{ textAlign: 'right' }}>累計</th>
                                    {targetYears.map(year => (
                                        <th key={year} style={{ textAlign: 'right' }}>{year}年度</th>
                                    ))}
                                    <th style={{ textAlign: 'center', width: '80px' }}>詳細</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPast5YearsData.map((dest, idx) => {
                                    const isExpanded = expandedPast5YearsSchoolId === dest.name;
                                    const trendYears = [...targetYears].sort((a, b) => a - b);
                                    const trendData = trendYears.map(year => dest.counts[year] || 0);
                                    const yearlyJlptStats = getYearlyJlptStats(dest.students);

                                    return (
                                        <Fragment key={dest.name || idx}>
                                            <tr onClick={() => setExpandedPast5YearsSchoolId(isExpanded ? null : dest.name)} className={styles.clickableRow}>
                                                <td style={{ fontWeight: 600, color: '#1f2937' }}>{dest.name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{dest.total5Years}名</td>
                                                {targetYears.map(year => {
                                                    const count = dest.counts[year];
                                                    return (
                                                        <td key={year} style={{ textAlign: 'right', color: count > 0 ? '#1f2937' : '#9ca3af' }}>
                                                            {count > 0 ? `${count}名` : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td>
                                                    <AccordionChevron rotated={isExpanded} />
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={3 + targetYears.length}>
                                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                                {/* グラフ1: 受験者数のトレンド (合格・進学者数推移) */}
                                                                <div style={{ flex: '1 1 300px', minWidth: '280px', backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                                                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem', textAlign: 'center' }}>
                                                                        合格・進学者数の推移トレンド
                                                                    </h4>
                                                                    <div style={{ height: '180px', position: 'relative' }}>
                                                                        <Line
                                                                            data={{
                                                                                labels: trendYears.map(y => `${y}年度`),
                                                                                datasets: [{
                                                                                    label: '合格・進学者数',
                                                                                    data: trendData,
                                                                                    borderColor: '#3b82f6',
                                                                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                                                    borderWidth: 2,
                                                                                    tension: 0.3,
                                                                                    pointBackgroundColor: '#3b82f6',
                                                                                    fill: true
                                                                                }]
                                                                            }}
                                                                            options={{
                                                                                responsive: true,
                                                                                maintainAspectRatio: false,
                                                                                plugins: {
                                                                                    legend: { display: false },
                                                                                    tooltip: {
                                                                                        callbacks: {
                                                                                            label: (context) => `${context.raw}名`
                                                                                        }
                                                                                    }
                                                                                },
                                                                                scales: {
                                                                                    y: {
                                                                                        beginAtZero: true,
                                                                                        ticks: { stepSize: 1, font: { size: 10 } },
                                                                                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                                                                                    },
                                                                                    x: {
                                                                                        grid: { display: false },
                                                                                        ticks: { font: { size: 10 } }
                                                                                    }
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* グラフ2: JLPT保有率の推移 */}
                                                                <div style={{ flex: '1 1 400px', minWidth: '280px', backgroundColor: '#ffffff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                                                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem', textAlign: 'center' }}>
                                                                        合格・進学者のJLPT保有率の推移 (N3以上/N2以上/N1)
                                                                    </h4>
                                                                    <div style={{ height: '180px', position: 'relative' }}>
                                                                        {Object.keys(yearlyJlptStats).length > 0 ? (
                                                                            <Line
                                                                                data={{
                                                                                    labels: trendYears.map(y => `${y}年度`),
                                                                                    datasets: [
                                                                                        {
                                                                                            label: 'N3以上保有率',
                                                                                            data: trendYears.map(y => yearlyJlptStats[y]?.n3Rate ?? null),
                                                                                            borderColor: '#10b981',
                                                                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                                                            borderWidth: 2,
                                                                                            tension: 0.3,
                                                                                            pointBackgroundColor: '#10b981',
                                                                                            spanGaps: true
                                                                                        },
                                                                                        {
                                                                                            label: 'N2以上保有率',
                                                                                            data: trendYears.map(y => yearlyJlptStats[y]?.n2Rate ?? null),
                                                                                            borderColor: '#3b82f6',
                                                                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                                                            borderWidth: 2,
                                                                                            tension: 0.3,
                                                                                            pointBackgroundColor: '#3b82f6',
                                                                                            spanGaps: true
                                                                                        },
                                                                                        {
                                                                                            label: 'N1保有率',
                                                                                            data: trendYears.map(y => yearlyJlptStats[y]?.n1Rate ?? null),
                                                                                            borderColor: '#8b5cf6',
                                                                                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                                                            borderWidth: 2,
                                                                                            tension: 0.3,
                                                                                            pointBackgroundColor: '#8b5cf6',
                                                                                            spanGaps: true
                                                                                        }
                                                                                    ]
                                                                                }}
                                                                                options={{
                                                                                    responsive: true,
                                                                                    maintainAspectRatio: false,
                                                                                    plugins: {
                                                                                        legend: {
                                                                                            position: 'top',
                                                                                            labels: { boxWidth: 12, font: { size: 10 } }
                                                                                        },
                                                                                        tooltip: {
                                                                                            callbacks: {
                                                                                                label: (context) => {
                                                                                                    const year = trendYears[context.dataIndex];
                                                                                                    const stats = yearlyJlptStats[year];
                                                                                                    if (!stats) return '';
                                                                                                    const label = context.dataset.label;
                                                                                                    const value = context.raw;
                                                                                                    let count = 0;
                                                                                                    if (context.datasetIndex === 0) {
                                                                                                        count = stats.n3Count;
                                                                                                    } else if (context.datasetIndex === 1) {
                                                                                                        count = stats.n2Count;
                                                                                                    } else if (context.datasetIndex === 2) {
                                                                                                        count = stats.n1Count;
                                                                                                    }
                                                                                                    return `${label}: ${value}% (${count}/${stats.totalCount}名)`;
                                                                                                }
                                                                                            }
                                                                                        }
                                                                                    },
                                                                                    scales: {
                                                                                        y: {
                                                                                            beginAtZero: true,
                                                                                            min: 0,
                                                                                            max: 100,
                                                                                            ticks: { 
                                                                                                font: { size: 10 },
                                                                                                callback: (value) => `${value}%`
                                                                                            },
                                                                                            grid: { color: 'rgba(0, 0, 0, 0.05)' }
                                                                                        },
                                                                                        x: {
                                                                                            grid: { display: false },
                                                                                            ticks: { font: { size: 10 } }
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                                                                                JLPTの受験データがありません。
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                                {processedPast5YearsData.length === 0 && (
                                    <tr>
                                        <td colSpan={3 + targetYears.length} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            該当する実績データはありません
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Pagination currentPage={past5YearsPage} totalPages={totalPast5YearsPages} onPageChange={setPast5YearsPage} />
                    </div>
                </div>
            )}
        </div>
    )
}
