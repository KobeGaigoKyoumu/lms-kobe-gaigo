'use client'

import { useState, useMemo } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { ArrowLeft } from 'lucide-react'
import { MultiSelect } from '../components/MultiSelect'
import { JlptSessionRow } from '../components/JlptSessionRow'
import styles from '../page.module.css'

export default function JlptTab({ 
    initialStats = {}, 
    nationalStats: initialNationalStats = null,
    sectionScoreStats: initialSectionStats = null,
    chartFontSize = 12
}) {
    // If initialStats is the full response object, we use it directly.
    const statsObj = useMemo(() => {
        if (Array.isArray(initialStats)) return { stats: initialStats }
        return initialStats || { stats: [] }
    }, [initialStats])
    
    const [jlptSubTab, setJlptSubTab] = useState('summary')
    const [selectedJlptClass, setSelectedJlptClass] = useState('')
    const nationalStats = initialNationalStats
    const sectionScoreStats = initialSectionStats

    // Standardized Color Constants
    const COLOR_PASS = '#22c55e'
    const COLOR_FAIL = '#ef4444'
    const COLOR_WARN = '#f59e0b'

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
        if (!statsObj?.studentStats) return [];
        return [...statsObj.studentStats]
            .sort((a, b) => parseFloat(b.n3PlusRate || 0) - parseFloat(a.n3PlusRate || 0));
    }, [statsObj])

    const currentClassStats = useMemo(() => {
        if (!selectedJlptClass || !statsObj?.studentStats) return null;
        return statsObj.studentStats.find(c => c.className === selectedJlptClass);
    }, [selectedJlptClass, statsObj])

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className={styles.subTabs}>
                <button className={`${styles.subTab} ${jlptSubTab === 'summary' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('summary')}>年度別分析</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'class' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('class')}>クラス別分析</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'compare' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('compare')}>全国比較</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'section' ? styles.activeSubTab : ''}`} onClick={() => setJlptSubTab('section')}>科目得点分析</button>
            </div>

            {jlptSubTab === 'summary' && (
                <div className={styles.tabContent}>
                    <div className={styles.statsGrid}>
                        {(statsObj?.levelStats || []).map(stat => (
                            <div className={styles.statCard} key={stat.level}>
                                <span className={`${styles.badge} ${styles[`badge${stat.level}`]}`}>{stat.level}</span>
                                <div className={styles.statValueRow}>
                                    <span className={styles.statValue}>{stat.passRate || 0}%</span>
                                    <span className={styles.statUnit}>{stat.passers || 0}/{stat.total || 0}名</span>
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
                                        labels: (statsObj?.levelStats || []).map(s => s.level),
                                        datasets: [{
                                            data: (statsObj?.levelStats || []).map(s => s.passRate),
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
                                        labels: (statsObj?.yearlyTrend || []).map(d => `${d.year}年度`),
                                        datasets: [{
                                            label: '合格率',
                                            data: (statsObj?.yearlyTrend || []).map(d => d.passRate),
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

                    <h3 className={styles.sectionTitle}>年度別 N3以上保有率 (2年終了時)</h3>
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>卒業時期</th>
                                    <th>生徒数</th>
                                    <th>N3以上取得者</th>
                                    <th>N3以上保有率</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(statsObj?.graduationN3PlusRates || []).map((row, idx) => (
                                    <tr key={idx}>
                                        <td>{row.year}</td>
                                        <td>{row.totalStudents}名</td>
                                        <td>{row.n3PlusStudents}名</td>
                                        <td style={{ fontWeight: 600, color: parseFloat(row.rate) >= 50 ? COLOR_PASS : COLOR_WARN }}>{row.rate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <h3 className={styles.sectionTitle}>試験回別詳細</h3>
                    <div className={styles.sessionsList}>
                        {(statsObj?.sessionStats || []).map(session => (
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
                                            <td>{cls.total || 0}名</td>
                                            <td style={{ fontWeight: 600, color: parseFloat(cls.n3PlusRate || 0) >= 50 ? COLOR_PASS : COLOR_WARN }}>{cls.n3PlusRate || 0}%</td>
                                            <td>{cls.n3Plus || 0}名</td>
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
                                        <div className={styles.statCard}><span className={styles.statLabel}>在籍数</span><div className={styles.statValueRow}><span className={styles.statValue}>{currentClassStats.total || 0}</span>名</div></div>
                                        <div className={styles.statCard}><span className={styles.statLabel}>N3以上取得率</span><div className={styles.statValueRow}><span className={styles.statValue}>{currentClassStats.n3PlusRate || 0}%</span></div></div>
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
                                                {(currentClassStats.students || []).map((student, idx) => (
                                                    <tr key={student.studentId || idx}>
                                                        <td>{student.studentId || '-'}</td>
                                                        <td>{student.name || '-'}</td>
                                                        {['N1', 'N2', 'N3', 'N4', 'N5'].map(level => {
                                                            const stat = student.levels?.[level] || { status: '未受験' }
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
                                                    { label: '本校', data: (statsObj?.levelStats || []).map(s => s.passRate), backgroundColor: 'rgba(59, 130, 246, 0.7)' },
                                                    { label: '全国', data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(l => nationalStats.averageRates?.japan?.[l]?.average || 0), backgroundColor: 'rgba(239, 68, 68, 0.7)' }
                                                ]
                                            }}
                                            options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <h3 className={styles.sectionTitle}>レベル別詳細比較</h3>
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>レベル</th>
                                            <th>本校合格率</th>
                                            <th>本校受験者数</th>
                                            <th>全国平均</th>
                                            <th>差分</th>
                                            <th>評価</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {['N1', 'N2', 'N3', 'N4', 'N5'].map(lvl => {
                                            const myStat = (statsObj?.levelStats || []).find(s => s.level === lvl) || { passRate: 0, total: 0 };
                                            const natAvg = nationalStats.averageRates?.japan?.[lvl]?.average || 0;
                                            const diff = (myStat.passRate - natAvg).toFixed(1);
                                            const isBetter = parseFloat(diff) >= 0;
                                            
                                            return (
                                                <tr key={lvl}>
                                                    <td><span className={`${styles.badge} ${styles[`badge${lvl}`]}`}>{lvl}</span></td>
                                                    <td style={{ fontWeight: 600 }}>{myStat.passRate}%</td>
                                                    <td>{myStat.total}名</td>
                                                    <td>{natAvg}%</td>
                                                    <td style={{ color: isBetter ? COLOR_PASS : COLOR_FAIL, fontWeight: 600 }}>
                                                        {isBetter ? `+${diff}` : diff}%
                                                    </td>
                                                    <td style={{ color: isBetter ? COLOR_PASS : COLOR_FAIL }}>
                                                        {parseFloat(diff) > 5 ? '◎ 優秀' : isBetter ? '○ 良好' : '△ 課題'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
                                    <div className={styles.statValueRow}><span className={styles.statValue}>{sectionScoreStats.overall?.totalRecords?.toLocaleString() || 0}</span>件</div>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>全科目平均点</span>
                                    <div className={styles.statValueRow}><span className={styles.statValue}>{sectionScoreStats.overall?.avgScore || 0}</span>点</div>
                                </div>
                            </div>
                            <h3 className={styles.sectionTitle}>科目別全体平均</h3>
                            <div className={styles.tableContainer}>
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
                                        {Object.entries(sectionScoreStats.bySection || {}).map(([name, s]) => (
                                            <tr key={name}>
                                                <td style={{ fontWeight: 600 }}>{name}</td>
                                                <td>{s.count}</td>
                                                <td style={{ fontWeight: 600 }}>{s.avgScore}点</td>
                                                <td>{s.maxScore}点</td>
                                                <td>{s.minScore}点</td>
                                                <td style={{ color: COLOR_PASS }}>{s.passedAvg}点</td>
                                                <td style={{ color: COLOR_FAIL }}>{s.failedAvg}点</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <h3 className={styles.sectionTitle}>科目×レベル別詳細</h3>
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
                                        {(sectionScoreStats.bySectionLevel || []).map((s, idx) => (
                                            <tr key={idx}>
                                                <td>{s.section}</td>
                                                <td><span className={`${styles.badge} ${styles[`badge${s.level}`]}`}>{s.level}</span></td>
                                                <td>{s.count}</td>
                                                <td style={{ fontWeight: 600 }}>{s.avgScore}点</td>
                                                <td>{s.maxScore}点</td>
                                                <td>{s.minScore}点</td>
                                                <td style={{ color: COLOR_PASS }}>{s.passedAvg}点</td>
                                                <td style={{ color: COLOR_FAIL }}>{s.failedAvg}点</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </>
                    ) : (
                        <div className={styles.noData}>科目別得点データはありません</div>
                    )}
                </div>
            )}
        </div>
    )
}
