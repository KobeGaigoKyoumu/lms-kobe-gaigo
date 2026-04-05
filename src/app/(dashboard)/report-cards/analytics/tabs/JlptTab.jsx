'use client'

import { useState, useMemo, useEffect } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { MultiSelect } from '../components/MultiSelect'
import { JlptSessionRow } from '../components/JlptSessionRow'
import styles from '../page.module.css'

export default function JlptTab({ 
    initialStats, 
    nationalStats: initialNationalStats,
    sectionScoreStats: initialSectionStats,
    chartFontSize 
}) {
    const [jlptSubTab, setJlptSubTab] = useState('summary')
    const [selectedJlptClass, setSelectedJlptClass] = useState('')
    const [sectionDetailOpen, setSectionDetailOpen] = useState(false)
    const [nationalStats] = useState(initialNationalStats)
    const [sectionScoreStats] = useState(initialSectionStats)

    // Standardized Color Constants
    const COLOR_PASS = '#22c55e'
    const COLOR_FAIL = '#ef4444'
    const COLOR_WARN = '#f59e0b'
    const COLOR_INFO = '#3b82f6'
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

    const classSummaryList = useMemo(() => {
        if (!initialStats?.studentStats) return [];
        return initialStats.studentStats
            .sort((a, b) => parseFloat(b.n3PlusRate) - parseFloat(a.n3PlusRate));
    }, [initialStats])

    const currentClassStats = useMemo(() => {
        if (!selectedJlptClass || !initialStats?.studentStats) return null;
        return initialStats.studentStats.find(c => c.className === selectedJlptClass);
    }, [selectedJlptClass, initialStats])

    return (
        <>
            <div className={styles.subTabs}>
                <button className={`${styles.subTab} ${jlptSubTab === 'summary' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('summary')}>全体要約</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'class' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('class')}>クラス別分析</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'compare' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('compare')}>全国比較</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'section' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('section')}>科目得点分析</button>
            </div>

            {jlptSubTab === 'summary' && (
                <div className={styles.tabContent}>
                    <div className={styles.statsGrid}>
                        {initialStats.levelStats.map(stat => (
                            <div className={styles.statCard} key={stat.level}>
                                <span className={`${styles.badge} ${styles[`badge${stat.level}`]}`}>{stat.level}</span>
                                <div className={styles.statValueRow}>
                                    <span className={styles.statValue}>{stat.passRate}%</span>
                                    <span className={styles.statUnit}>{stat.passers}/{stat.total}名</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>レベル別合格率 (%)</h3>
                            <div className={styles.chartContainer}>
                                <Bar
                                    data={{
                                        labels: initialStats.levelStats.map(s => s.level),
                                        datasets: [{
                                            data: initialStats.levelStats.map(s => s.passRate),
                                            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#3b82f6'],
                                        }]
                                    }}
                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                />
                            </div>
                        </div>
                        <div className={styles.chartCard} style={{ flex: 2 }}>
                            <h3 className={styles.chartTitle}>合格率の推移 (年度別)</h3>
                            <div className={styles.chartContainer}>
                                <Line
                                    data={{
                                        labels: initialStats.yearlyTrend.map(d => `${d.year}年度`),
                                        datasets: [{
                                            label: '合格率',
                                            data: initialStats.yearlyTrend.map(d => d.passRate),
                                            borderColor: '#3b82f6',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            fill: true,
                                            tension: 0.4
                                        }]
                                    }}
                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                />
                            </div>
                        </div>
                    </div>

                    <h3 className={styles.sectionTitle}>試験回別詳細</h3>
                    <div className={styles.sessionsList}>
                        {initialStats.sessionStats.map(session => (
                            <JlptSessionRow key={session.session} sessionData={session} />
                        ))}
                    </div>
                </div>
            )}

            {jlptSubTab === 'class' && (
                <div className={styles.tabContent}>
                    {!selectedJlptClass ? (
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
                                        <tr key={cls.className} onClick={() => setSelectedJlptClass(cls.className)} className={styles.clickableRow}>
                                            <td style={{ fontWeight: 600 }}>{cls.className}</td>
                                            <td>{cls.total}名</td>
                                            <td style={{ fontWeight: 600, color: parseFloat(cls.n3PlusRate) >= 50 ? COLOR_PASS : COLOR_WARN }}>{cls.n3PlusRate}%</td>
                                            <td>{cls.n3Plus}名</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <button onClick={() => setSelectedJlptClass('')} className={styles.backButton}><ArrowLeft size={16} /> 戻る</button>
                                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{selectedJlptClass} の詳細</h2>
                            </div>
                            {currentClassStats && (
                                <>
                                    <div className={styles.statsGrid}>
                                        <div className={styles.statCard}><span className={styles.statLabel}>在籍数</span><div className={styles.statValueRow}><span className={styles.statValue}>{currentClassStats.total}</span>名</div></div>
                                        <div className={styles.statCard}><span className={styles.statLabel}>N3以上取得率</span><div className={styles.statValueRow}><span className={styles.statValue}>{currentClassStats.n3PlusRate}%</span></div></div>
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
                                                {currentClassStats.students.map(student => (
                                                    <tr key={student.studentId}>
                                                        <td>{student.studentId}</td>
                                                        <td>{student.name}</td>
                                                        {['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                            const stat = student.levels[level]
                                                            const badgeClass = stat.status === '合格' ? styles.badgePassed : stat.status === '不合格' ? styles.badgeFailed : styles.badgeNone
                                                            return (
                                                                <td key={level}>
                                                                    {stat.status !== '未受験' && <span className={`${styles.badge} ${badgeClass}`}>{stat.score || stat.status}</span>}
                                                                </td>
                                                            )
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
                </div>
            )}

            {jlptSubTab === 'compare' && (
                <div className={styles.tabContent}>
                    {nationalStats ? (
                        <>
                            <h2 className={styles.sectionTitle}>本校 vs 全国平均（日本国内）</h2>
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>全国平均との比較</span>
                                    <div className={styles.statValueRow}>
                                        <span className={styles.statValue}>+5.2%</span>
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>全国平均以上のレベル数</span>
                                    <div className={styles.statValueRow}><span className={styles.statValue}>4</span>/ 5</div>
                                </div>
                            </div>
                            <div className={styles.chartGrid}>
                                <div className={styles.chartCard}>
                                    <h3 className={styles.chartTitle}>レベル別合格率比較</h3>
                                    <div className={styles.chartContainer}>
                                        <Bar
                                            data={{
                                                labels: ['N1', 'N2', 'N3', 'N4', 'N5'],
                                                datasets: [
                                                    { label: '本校', data: initialStats.levelStats.map(s => s.passRate), backgroundColor: 'rgba(59, 130, 246, 0.7)' },
                                                    { label: '全国', data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(l => nationalStats.averageRates?.japan?.[l]?.average || 0), backgroundColor: 'rgba(239, 68, 68, 0.7)' }
                                                ]
                                            }}
                                            options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.noData}>全国比較データはありません</div>
                    )}
                </div>
            )}

            {jlptSubTab === 'section' && (
                <div className={styles.tabContent}>
                    {sectionScoreStats ? (
                        <>
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>科目別データ件数</span>
                                    <div className={styles.statValueRow}><span className={styles.statValue}>{sectionScoreStats.overall?.totalRecords?.toLocaleString()}</span>件</div>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>全科目平均点</span>
                                    <div className={styles.statValueRow}><span className={styles.statValue}>{sectionScoreStats.overall?.avgScore}</span>点</div>
                                </div>
                            </div>
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
                                                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                                                }]
                                            }}
                                            options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 60 } } }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.noData}>科目別得点データはありません</div>
                    )}
                </div>
            )}
        </>
    )
}
