'use client'

import { useState, useMemo, Fragment } from 'react'
import { Bar } from 'react-chartjs-2'
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

export default function CareerTab({ careerStats, chartFontSize }) {
    const [careerSubTab, setCareerSubTab] = useState('overview')
    const [selectedYear, setSelectedYear] = useState('2023') // Default to 2023 or latest available
    const [expandedSchoolId, setExpandedSchoolId] = useState(null)

    // 過去5年実績詳細用のState
    const [careerSearchQuery, setCareerSearchQuery] = useState('')
    const [expandedPast5YearsSchoolId, setExpandedPast5YearsSchoolId] = useState(null)

    const targetYears = [2024, 2023, 2022, 2021, 2020]

    const processedPast5YearsData = useMemo(() => {
        if (!careerStats?.topDestinations) return []
        
        return careerStats.topDestinations
            .map(dest => {
                const counts = {
                    2024: dest.years?.["2023"] || 0,
                    2023: dest.years?.["2022"] || 0,
                    2022: dest.years?.["2021"] || 0,
                    2021: dest.years?.["2020"] || 0,
                    2020: dest.years?.["2019"] || 0,
                }
                const total5Years = Object.values(counts).reduce((a, b) => a + b, 0)
                
                if (total5Years === 0) return null

                const query = careerSearchQuery.trim().toLowerCase()
                const nameMatches = dest.name.toLowerCase().includes(query)
                
                const matchingStudents = (dest.students || []).filter(s => {
                    const isTargetYear = Number(s.year) >= 2019 && Number(s.year) <= 2023
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
                    total5Years,
                    displayStudents: query && !nameMatches ? matchingStudents : (dest.students || []).filter(s => Number(s.year) >= 2019 && Number(s.year) <= 2023)
                }
            })
            .filter(Boolean)
            .sort((a, b) => b.total5Years - a.total5Years)
    }, [careerStats, careerSearchQuery])


    // Ensure the year selector is populated correctly
    const availableYears = useMemo(() => {
        if (!careerStats?.yearlyTrends) return []
        return [...careerStats.yearlyTrends].map(t => String(t.year)).sort((a, b) => Number(b) - Number(a))
    }, [careerStats])

    // Fetch the stats for the selected year
    const stats = useMemo(() => {
        if (!careerStats?.yearlyTrends) return null
        
        let targetYear = selectedYear
        if (!availableYears.includes(targetYear) && availableYears.length > 0) {
            targetYear = availableYears[0]
            // We shouldn't setState in useMemo, but we can just use the first available year safely
        }

        const trend = careerStats.yearlyTrends.find(t => String(t.year) === targetYear)
        if (!trend) return null

        // Map the new JSON structure to the old format expected by the UI
        return {
            summary: {
                totalRecords: trend.total || 0,
                totalGraduates: trend.graduated || 0
            },
            categoryStats: trend.categories || {},
            topDestinations: (careerStats.topDestinations || [])
                .filter(d => d.years && d.years[targetYear])
                .map(d => ({ name: d.name, count: d.years[targetYear], students: d.students?.filter(s => String(s.year) === targetYear) || [] }))
                .sort((a, b) => b.count - a.count)
        }
    }, [careerStats, selectedYear, availableYears])

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
                    <button className={`${styles.subTab} ${careerSubTab === 'past5years' ? styles.active : ''}`} onClick={() => setCareerSubTab('past5years')}>過去5年実績詳細</button>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>卒業年度</label>
                    <select 
                        className={styles.filterSelect} 
                        value={availableYears.includes(selectedYear) ? selectedYear : availableYears[0]} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </select>
                </div>
            </div>

            {careerSubTab === 'overview' && (
                <div className={styles.tabContent}>
                    <div className={styles.alertWarning}>
                        <strong>⚠️ COVID-19の影響について：</strong><br />
                        2020年〜2022年は新型コロナウイルスの影響により、入学時期の遅延がありました。2020年度は新入生がいなかったため、2022年度の卒業生はおらず、データの記載がありません。
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}><span className={styles.statLabel}>総卒業生数</span><div className={styles.statValueRow}><span className={styles.statValue}>{stats.summary.totalGraduates}</span>名</div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>進学率</span><div className={styles.statValueRow}><span className={styles.statValue}>{(((stats.categoryStats['大学'] || 0) + (stats.categoryStats['大学院'] || 0) + (stats.categoryStats['専門学校'] || 0)) / (stats.summary.totalRecords || 1) * 100).toFixed(1)}%</span></div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>就職率</span><div className={styles.statValueRow}><span className={styles.statValue}>{((stats.categoryStats['就職'] || 0) / (stats.summary.totalRecords || 1) * 100).toFixed(1)}%</span></div></div>
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
                    </div>
                </div>
            )}

            {careerSubTab === 'schools' && (
                <div className={styles.tabContent}>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>進学・就職先名</th>
                                    <th>進学者数</th>
                                    <th>詳細</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.topDestinations.map((dest, idx) => {
                                    const isExpanded = expandedSchoolId === idx;
                                    return (
                                        <Fragment key={idx}>
                                            <tr onClick={() => setExpandedSchoolId(isExpanded ? null : idx)} className={styles.clickableRow}>
                                                <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                                <td>{dest.count}名</td>
                                                <td><AccordionChevron rotated={isExpanded} /></td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="3">
                                                        <div style={{ padding: '1rem', backgroundColor: '#f8fafc' }}>
                                                            {dest.students && dest.students.length > 0 ? (
                                                                <ul style={{ margin: 0, paddingLeft: '1.5rem', listStyle: 'disc' }}>
                                                                    {dest.students.map(s => (
                                                                        <li key={s.id}>{s.name} ({s.nationality})</li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p>学生データがありません。</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                                {stats.topDestinations.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>この年度の実績データはありません</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {careerSubTab === 'past5years' && (
                <div className={styles.tabContent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                            過去5年間の進学実績詳細 (2019-2023)
                        </h3>
                        <div>
                            <input
                                type="text"
                                placeholder="学校名・氏名で検索..."
                                value={careerSearchQuery}
                                onChange={(e) => setCareerSearchQuery(e.target.value)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    width: '240px',
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>進学先名</th>
                                    <th style={{ textAlign: 'right' }}>5年間合計</th>
                                    {targetYears.map(year => (
                                        <th key={year} style={{ textAlign: 'right' }}>{year}年度</th>
                                    ))}
                                    <th style={{ textAlign: 'center', width: '80px' }}>詳細</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedPast5YearsData.map((dest, idx) => {
                                    const isExpanded = expandedPast5YearsSchoolId === idx;
                                    return (
                                        <Fragment key={idx}>
                                            <tr onClick={() => setExpandedPast5YearsSchoolId(isExpanded ? null : idx)} className={styles.clickableRow}>
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
                                                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151', fontSize: '0.875rem' }}>
                                                                合格者一覧 (年度別):
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                {targetYears.map(year => {
                                                                    const studentsInYear = dest.displayStudents.filter(s => Number(s.year) === year - 1);
                                                                    if (studentsInYear.length === 0) return null;
                                                                    return (
                                                                        <div key={year} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem' }}>
                                                                            <span style={{ fontWeight: 600, minWidth: '70px', color: '#4b5563' }}>{year}年度:</span>
                                                                            <span style={{ color: '#1f2937', flex: 1 }}>
                                                                                {studentsInYear.map((s, sIdx) => (
                                                                                    <span key={s.id || sIdx}>
                                                                                        {s.name} ({s.nationality || '不明'}){sIdx < studentsInYear.length - 1 ? ', ' : ''}
                                                                                    </span>
                                                                                ))}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {dest.displayStudents.length === 0 && (
                                                                    <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.875rem' }}>
                                                                        該当する合格者データがありません
                                                                    </div>
                                                                )}
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
                    </div>
                </div>
            )}
        </div>
    )
}
