'use client'

import { useState, useMemo, Fragment } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
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
    const [expandedDestination, setExpandedDestination] = useState(null)
    const [showLowRankings, setShowLowRankings] = useState(false)
    const [expandedNationality, setExpandedNationality] = useState(null)
    const [expandedSchoolId, setExpandedSchoolId] = useState(null)
    const [careerSearchQuery, setCareerSearchQuery] = useState('')
    const [expandedPast5YearsSchoolId, setExpandedPast5YearsSchoolId] = useState(null)

    // Standardized Color Constants
    const COLOR_PASS = '#22c55e'
    const COLOR_FAIL = '#ef4444'
    const COLOR_MUTED = '#9ca3af'

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

    return (
        <>
            <div className={styles.subTabs}>
                <button className={`${styles.subTab} ${careerSubTab === 'overview' ? styles.activeSubTab : ''}`} onClick={() => setCareerSubTab('overview')}>全体概要</button>
                <button className={`${styles.subTab} ${careerSubTab === 'schools' ? styles.activeSubTab : ''}`} onClick={() => setCareerSubTab('schools')}>学校別詳細</button>
                <button className={`${styles.subTab} ${careerSubTab === 'past5years' ? styles.activeSubTab : ''}`} onClick={() => setCareerSubTab('past5years')}>過去5年詳細</button>
            </div>

            {careerSubTab === 'overview' && (
                <div className={styles.tabContent}>
                    <div className={styles.alertWarning}>
                        <strong>⚠️ COVID-19の影響について：</strong><br />
                        2020年〜2022年は新型コロナウイルスの影響により、入学時期の遅延がありました。2020年度は新入生がいなかったため、2022年度の卒業生はおらず、データの記載がありません。
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}><span className={styles.statLabel}>総卒業生数</span><div className={styles.statValueRow}><span className={styles.statValue}>{careerStats.summary.totalGraduates}</span>名</div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>進学率</span><div className={styles.statValueRow}><span className={styles.statValue}>{(((careerStats.categoryStats['大学'] || 0) + (careerStats.categoryStats['大学院'] || 0) + (careerStats.categoryStats['専門学校'] || 0)) / careerStats.summary.totalRecords * 100).toFixed(1)}%</span></div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>就職率</span><div className={styles.statValueRow}><span className={styles.statValue}>{((careerStats.categoryStats['就職'] || 0) / careerStats.summary.totalRecords * 100).toFixed(1)}%</span></div></div>
                    </div>

                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>進路区分別内訳</h3>
                            <div className={styles.chartContainer}>
                                <Bar
                                    data={{
                                        labels: Object.keys(careerStats.categoryStats),
                                        datasets: [{
                                            data: Object.values(careerStats.categoryStats),
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
                                    <th>進学先名</th>
                                    <th>進学者数</th>
                                    <th>JLPTデータ</th>
                                    <th>詳細</th>
                                </tr>
                            </thead>
                            <tbody>
                                {careerStats.topDestinations.filter(d => d.jlptStats).map((dest, idx) => {
                                    const isExpanded = expandedSchoolId === idx;
                                    return (
                                        <Fragment key={idx}>
                                            <tr onClick={() => setExpandedSchoolId(isExpanded ? null : idx)} className={styles.clickableRow}>
                                                <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                                <td>{dest.count}名</td>
                                                <td>{Object.keys(dest.jlptStats).join(', ')}</td>
                                                <td><AccordionChevron rotated={isExpanded} /></td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="4">
                                                        <div style={{ padding: '1rem' }}>
                                                            {/* Detailed table for school */}
                                                            <p>詳細なJLPT成績データがここに表示されます。</p>
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
            
            {careerSubTab === 'past5years' && (
                <div className={styles.tabContent}>
                    {/* Simplified past 5 years view for now */}
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>進学先名</th>
                                    <th>5年間合計</th>
                                </tr>
                            </thead>
                            <tbody>
                                {careerStats.topDestinations.slice(0, 20).map((dest, idx) => (
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
        </>
    )
}
