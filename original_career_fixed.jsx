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
                <button className={`${styles.subTab} ${careerSubTab === 'overview' ? styles.activeSubTab : ''}`} onClick={() => setCareerSubTab('overview')}>蜈ｨ菴捺ｦりｦ・/button>
                <button className={`${styles.subTab} ${careerSubTab === 'schools' ? styles.activeSubTab : ''}`} onClick={() => setCareerSubTab('schools')}>蟄ｦ譬｡蛻･隧ｳ邏ｰ</button>
                <button className={`${styles.subTab} ${careerSubTab === 'past5years' ? styles.activeSubTab : ''}`} onClick={() => setCareerSubTab('past5years')}>驕主悉5蟷ｴ隧ｳ邏ｰ</button>
            </div>

            {careerSubTab === 'overview' && (
                <div className={styles.tabContent}>
                    <div className={styles.alertWarning}>
                        <strong>笞・・COVID-19縺ｮ蠖ｱ髻ｿ縺ｫ縺､縺・※・・/strong><br />
                        2020蟷ｴ縲・022蟷ｴ縺ｯ譁ｰ蝙九さ繝ｭ繝翫え繧､繝ｫ繧ｹ縺ｮ蠖ｱ髻ｿ縺ｫ繧医ｊ縲∝・蟄ｦ譎よ悄縺ｮ驕・ｻｶ縺後≠繧翫∪縺励◆縲・020蟷ｴ蠎ｦ縺ｯ譁ｰ蜈･逕溘′縺・↑縺九▲縺溘◆繧√・022蟷ｴ蠎ｦ縺ｮ蜊呈･ｭ逕溘・縺翫ｉ縺壹√ョ繝ｼ繧ｿ縺ｮ險倩ｼ峨′縺ゅｊ縺ｾ縺帙ｓ縲・                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}><span className={styles.statLabel}>邱丞穀讌ｭ逕滓焚</span><div className={styles.statValueRow}><span className={styles.statValue}>{careerStats.summary.totalGraduates}</span>蜷・/div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>騾ｲ蟄ｦ邇・/span><div className={styles.statValueRow}><span className={styles.statValue}>{(((careerStats.categoryStats['螟ｧ蟄ｦ'] || 0) + (careerStats.categoryStats['螟ｧ蟄ｦ髯｢'] || 0) + (careerStats.categoryStats['蟆る摩蟄ｦ譬｡'] || 0)) / careerStats.summary.totalRecords * 100).toFixed(1)}%</span></div></div>
                        <div className={styles.statCard}><span className={styles.statLabel}>蟆ｱ閨ｷ邇・/span><div className={styles.statValueRow}><span className={styles.statValue}>{((careerStats.categoryStats['蟆ｱ閨ｷ'] || 0) / careerStats.summary.totalRecords * 100).toFixed(1)}%</span></div></div>
                    </div>

                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>騾ｲ霍ｯ蛹ｺ蛻・挨蜀・ｨｳ</h3>
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
                                    <th>騾ｲ蟄ｦ蜈亥錐</th>
                                    <th>騾ｲ蟄ｦ閠・焚</th>
                                    <th>JLPT繝・・繧ｿ</th>
                                    <th>隧ｳ邏ｰ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {careerStats.topDestinations.filter(d => d.jlptStats).map((dest, idx) => {
                                    const isExpanded = expandedSchoolId === idx;
                                    return (
                                        <Fragment key={idx}>
                                            <tr onClick={() => setExpandedSchoolId(isExpanded ? null : idx)} className={styles.clickableRow}>
                                                <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                                <td>{dest.count}蜷・/td>
                                                <td>{Object.keys(dest.jlptStats).join(', ')}</td>
                                                <td><AccordionChevron rotated={isExpanded} /></td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="4">
                                                        <div style={{ padding: '1rem' }}>
                                                            {/* Detailed table for school */}
                                                            <p>隧ｳ邏ｰ縺ｪJLPT謌千ｸｾ繝・・繧ｿ縺後％縺薙↓陦ｨ遉ｺ縺輔ｌ縺ｾ縺吶・/p>
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
                                    <th>騾ｲ蟄ｦ蜈亥錐</th>
                                    <th>5蟷ｴ髢灘粋險・/th>
                                </tr>
                            </thead>
                            <tbody>
                                {careerStats.topDestinations.slice(0, 20).map((dest, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{dest.name}</td>
                                        <td>{dest.count}蜷・/td>
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
