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
                    <button className={`${styles.subTab} ${careerSubTab === 'past5years' ? styles.active : ''}`} onClick={() => setCareerSubTab('past5years')}>全体実績</button>
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
                    <div className={styles.alertWarning}>
                        <strong>全年度累計：</strong> {Math.min(...availableYears)}年〜{Math.max(...availableYears)}年の進路実績です。
                    </div>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>進学・就職先名</th>
                                    <th>累計人数</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(careerStats.topDestinations || [])
                                    .slice()
                                    .sort((a, b) => b.count - a.count)
                                    .slice(0, 30) // top 30
                                    .map((dest, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                        <td>{dest.count}名</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
