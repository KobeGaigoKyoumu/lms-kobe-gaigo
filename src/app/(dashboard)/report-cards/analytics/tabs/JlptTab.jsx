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
            .sort((a, b) => {
                // Priority 1: Active classes first
                if (a.isHistorical !== b.isHistorical) {
                    return a.isHistorical ? 1 : -1;
                }
                // Priority 2: Higher N3+ rate first
                return parseFloat(b.n3PlusRate || 0) - parseFloat(a.n3PlusRate || 0);
            });
    }, [statsObj])

    const currentClassStats = useMemo(() => {
        if (!selectedJlptClass || !statsObj?.studentStats) return null;
        return statsObj.studentStats.find(c => c.className === selectedJlptClass);
    }, [selectedJlptClass, statsObj])

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className={styles.subTabs}>
                <button className={`${styles.subTab} ${jlptSubTab === 'summary' ? styles.active : ''}`} onClick={() => setJlptSubTab('summary')}>年度別分析</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'nationality' ? styles.active : ''}`} onClick={() => setJlptSubTab('nationality')}>国籍別分析</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'class' ? styles.active : ''}`} onClick={() => setJlptSubTab('class')}>クラス別分析</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'compare' ? styles.active : ''}`} onClick={() => setJlptSubTab('compare')}>全国比較</button>
                <button className={`${styles.subTab} ${jlptSubTab === 'section' ? styles.active : ''}`} onClick={() => setJlptSubTab('section')}>科目得点分析</button>
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

                    <div className={styles.chartsRow} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>合格率の推移</h3>
                            <div className={styles.chartContainer}>
                                <Line
                                    data={{
                                        labels: [...(statsObj?.sessionStats || [])].reverse().map(s => s.session),
                                        datasets: [{
                                            label: '合格率 (%)',
                                            data: [...(statsObj?.sessionStats || [])].reverse().map(s => s.passRate),
                                            borderColor: '#3b82f6',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            borderWidth: 3,
                                            pointRadius: 4,
                                            pointBackgroundColor: '#3b82f6',
                                            fill: false,
                                            tension: 0.4
                                        }]
                                    }}
                                    options={{ 
                                        ...chartOptions, 
                                        scales: { 
                                            y: { beginAtZero: true, max: 100, ticks: { stepSize: 10, font: { size: chartFontSize } } },
                                            x: { ticks: { font: { size: chartFontSize - 2 }, maxRotation: 45, minRotation: 45 } }
                                        } 
                                    }}

                                />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>年度別 合格率推移</h3>
                            <div className={styles.chartContainer}>
                                <Line
                                    data={{
                                        labels: (statsObj?.yearlyTrend || []).map(d => `${d.year}年`),
                                        datasets: [
                                            {
                                                label: '合格率 (%)',
                                                data: (statsObj?.yearlyTrend || []).map(d => d.passRate),
                                                borderColor: '#22c55e',
                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                borderWidth: 3,
                                                pointRadius: 4,
                                                pointBackgroundColor: '#22c55e',
                                                fill: false,
                                                tension: 0.4
                                            },
                                            {
                                                label: 'トレンド',
                                                data: (statsObj?.yearlyTrend || []).map((d, i, arr) => {
                                                    // Simple moving average for trend line
                                                    const start = Math.max(0, i - 1);
                                                    const end = Math.min(arr.length - 1, i + 1);
                                                    const subset = arr.slice(start, end + 1);
                                                    return subset.reduce((acc, curr) => acc + parseFloat(curr.passRate), 0) / subset.length;
                                                }),
                                                borderColor: '#f97316',
                                                borderDash: [5, 5],
                                                borderWidth: 2,
                                                pointRadius: 0,
                                                fill: false,
                                                tension: 0.4
                                            }
                                        ]
                                    }}
                                    options={{ 
                                        ...chartOptions, 
                                        scales: { 
                                            y: { beginAtZero: true, max: 100, ticks: { stepSize: 10, font: { size: chartFontSize } } },
                                            x: { ticks: { font: { size: chartFontSize } } }
                                        } 
                                    }}
                                />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>レベル別合格率 (%)</h3>
                            <div className={styles.chartContainer}>
                                <Bar
                                    data={{
                                        labels: (statsObj?.levelStats || []).map(s => s.level),
                                        datasets: [{
                                            label: '合格率 (%)',
                                            data: (statsObj?.levelStats || []).map(s => s.passRate),
                                            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#3b82f6'],
                                            borderRadius: 4
                                        }]
                                    }}
                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <h3 className={styles.chartTitle}>レベル別 平均点</h3>
                            <div className={styles.chartContainer}>
                                <Bar
                                    data={{
                                        labels: ['N1', 'N2', 'N3', 'N4', 'N5'],
                                        datasets: [{
                                            label: '平均点 (全期間)',
                                            data: ['N1', 'N2', 'N3', 'N4', 'N5'].map(l => {
                                                const s = (statsObj?.levelStats || []).find(x => x.level?.trim() === l);
                                                return s && s.avgScore ? parseFloat(s.avgScore) : 0;
                                            }),

                                            backgroundColor: [
                                                'rgba(248, 113, 113, 0.7)', // N1 Red
                                                'rgba(251, 146, 60, 0.7)',  // N2 Orange
                                                'rgba(251, 191, 36, 0.7)',  // N3 Yellow
                                                'rgba(163, 230, 53, 0.7)',  // N4 Green
                                                'rgba(96, 165, 250, 0.7)'   // N5 Blue
                                            ],
                                            borderRadius: 4
                                        }]
                                    }}
                                    options={{ 
                                        ...chartOptions, 
                                        plugins: {
                                            ...chartOptions.plugins,
                                            legend: { display: true, position: 'top', labels: { boxWidth: 20, font: { size: chartFontSize - 2 } } }
                                        },
                                        scales: { 
                                            y: { beginAtZero: true, max: 180, ticks: { stepSize: 20, font: { size: chartFontSize } } },
                                            x: { ticks: { font: { size: chartFontSize } } }
                                        } 
                                    }}
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
            {jlptSubTab === 'nationality' && (
                <div className={styles.tabContent}>
                    <div className={styles.chartsRow}>
                        <div className={styles.chartCard} style={{ flex: 1 }}>
                            <h3 className={styles.chartTitle}>国籍別合格率 (%)</h3>
                            <div className={styles.chartContainer}>
                                <Bar
                                    data={{
                                        labels: (statsObj?.nationalityStats || []).map(s => s.country),
                                        datasets: [{
                                            label: '合格率',
                                            data: (statsObj?.nationalityStats || []).map(s => s.passRate),
                                            backgroundColor: 'rgba(59, 130, 246, 0.6)',
                                        }]
                                    }}
                                    options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100 } } }}
                                />
                            </div>
                        </div>
                        <div className={styles.chartCard} style={{ flex: 1.5 }}>
                            <h3 className={styles.chartTitle}>国籍別詳細統計</h3>
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
                                        {(statsObj?.nationalityStats || []).map((row, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 600 }}>{row.country}</td>
                                                <td>{row.total}名</td>
                                                <td>{row.passed}名</td>
                                                <td style={{ fontWeight: 600, color: parseFloat(row.passRate) >= 50 ? COLOR_PASS : COLOR_WARN }}>{row.passRate}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                                <button onClick={() => setSelectedJlptClass('')} className={styles.backButton}>← 一覧に戻る</button>
                                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>詳細分析: {selectedJlptClass}</h2>
                            </div>
                            {currentClassStats && (() => {
                                const hasStudents = currentClassStats.students && currentClassStats.students.length > 0;
                                const n1Count = hasStudents ? currentClassStats.students.filter(s => s.levels?.['N1']?.status === '合格').length : '-';
                                const n2Count = hasStudents ? currentClassStats.students.filter(s => s.levels?.['N2']?.status === '合格').length : '-';
                                const n3Count = hasStudents ? currentClassStats.students.filter(s => s.levels?.['N3']?.status === '合格').length : '-';
                                return (
                                    <>
                                        <div className={styles.statsGrid}>
                                            <div className={styles.statCard}>
                                                <span className={styles.statLabel}>在籍数</span>
                                                <div className={styles.statValueRow}>
                                                    <span className={styles.statValue}>{currentClassStats.total || 0}</span>
                                                    <span className={styles.statUnit} style={{ marginLeft: '0.2rem' }}>名</span>
                                                </div>
                                            </div>
                                            <div className={styles.statCard}>
                                                <span className={styles.statLabel}>N3以上取得率</span>
                                                <div className={styles.statValueRow}>
                                                    <span className={styles.statValue}>{currentClassStats.n3PlusRate || 0}%</span>
                                                    <span className={styles.statUnit} style={{ marginLeft: '0.5rem', alignSelf: 'center', fontSize: '0.875rem' }}>{currentClassStats.n3Plus || 0}/{currentClassStats.total || 0}名</span>
                                                </div>
                                            </div>
                                            <div className={styles.statCard}>
                                                <span className={styles.statLabel}>合格者内訳</span>
                                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.15rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>N1</span>
                                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b91c1c', marginTop: '1px' }}>{n1Count}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>N2</span>
                                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b91c1c', marginTop: '1px' }}>{n2Count}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>N3</span>
                                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#b91c1c', marginTop: '1px' }}>{n3Count}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    {currentClassStats.students && currentClassStats.students.length > 0 ? (
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
                                                    {currentClassStats.students.map((student, idx) => (
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
                                    ) : (
                                        <div className={styles.noData} style={{ marginTop: '2rem', padding: '3rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                                            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                                                過去の公式集計データのため、個別の学生リストは表示できません。<br/>
                                                （上部の集計数値は正確な実績値です）
                                            </p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {jlptSubTab === 'compare' && (() => {
                if (!nationalStats || !nationalStats.sessions) return <div className={styles.noData}>全国比較データはありません</div>;
                const levels = ['N1', 'N2', 'N3', 'N4', 'N5'];
                const nationalSessions = nationalStats.sessions;
                
                // 1. Calculate national average per level (across all sessions)
                const natLevelStats = {};
                let betterCount = 0;
                let totalDiff = 0;
                
                levels.forEach(lvl => {
                    const passRates = nationalSessions.map(s => s.japan?.[lvl]?.pass_rate).filter(r => r !== undefined && !isNaN(r));
                    const avg = passRates.length > 0 ? (passRates.reduce((a, b) => a + b, 0) / passRates.length) : 0;
                    const max = passRates.length > 0 ? Math.max(...passRates) : 0;
                    const min = passRates.length > 0 ? Math.min(...passRates) : 0;
                    natLevelStats[lvl] = { avg, max, min, count: passRates.length };
                    
                    const myStat = (statsObj?.levelStats || []).find(s => s.level === lvl)?.passRate || 0;
                    const diff = myStat - avg;
                    totalDiff += diff;
                    if (diff >= 0) betterCount++;
                });
                
                const avgDiff = (totalDiff / 5).toFixed(1);
                const isOverallBetter = parseFloat(avgDiff) >= 0;

                // 2. Yearly comparison
                const recentYears = (statsObj?.yearlyTrend || []).map(y => parseInt(y.year)).filter(y => !isNaN(y)).sort((a,b)=>b-a).slice(0, 3);
                const displayYears = recentYears.length >= 3 ? recentYears : [2025, 2024, 2023];
                
                const yearlyCompare = displayYears.map(year => {
                    const myStatRaw = (statsObj?.yearlyTrend || []).find(y => parseInt(y.year) === year)?.passRate || 0;
                    const myStat = parseFloat(myStatRaw) || 0;
                    // national pass rate for this year (average of all sessions in this year, average of all levels)
                    const yearSessions = nationalSessions.filter(s => s.year === year);
                    let natSum = 0;
                    let natCount = 0;
                    yearSessions.forEach(s => {
                        levels.forEach(lvl => {
                            if (s.japan?.[lvl]?.pass_rate !== undefined && !isNaN(s.japan[lvl].pass_rate)) {
                                natSum += s.japan[lvl].pass_rate;
                                natCount++;
                            }
                        });
                    });
                    const natAvg = natCount > 0 ? (natSum / natCount) : 0;
                    const diff = myStat - natAvg;
                    return { year: `${year}年度`, myStat, natAvg, diff };
                });
                
                const my3YrAvg = yearlyCompare.length > 0 ? yearlyCompare.reduce((sum, y) => sum + y.myStat, 0) / yearlyCompare.length : 0;
                const nat3YrAvg = yearlyCompare.length > 0 ? yearlyCompare.reduce((sum, y) => sum + y.natAvg, 0) / yearlyCompare.length : 0;
                const diff3Yr = my3YrAvg - nat3YrAvg;

                // 3. Line chart data (national sessions)
                const chartLabels = nationalSessions.map(s => s.session_name);
                const chartDatasets = levels.map((lvl, idx) => {
                    const colors = [
                        'rgba(239, 68, 68, 1)',  // N1: Red
                        'rgba(249, 115, 22, 1)', // N2: Orange
                        'rgba(234, 179, 8, 1)',  // N3: Yellow
                        'rgba(132, 204, 22, 1)', // N4: Green
                        'rgba(59, 130, 246, 1)'  // N5: Blue
                    ];
                    return {
                        label: lvl,
                        data: nationalSessions.map(s => s.japan?.[lvl]?.pass_rate || null),
                        borderColor: colors[idx],
                        backgroundColor: colors[idx],
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false
                    };
                });

                return (
                    <div className={styles.tabContent}>
                        <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div className={styles.statCard}>
                                <span className={styles.statLabel}>全国平均との比較</span>
                                <div className={styles.statValueRow}>
                                    <span className={styles.statValue} style={{ color: isOverallBetter ? COLOR_PASS : COLOR_FAIL }}>
                                        {isOverallBetter ? `+${avgDiff}` : avgDiff}%
                                    </span>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statLabel}>全国平均以上のレベル数</span>
                                <div className={styles.statValueRow}><span className={styles.statValue}>{betterCount}</span><span style={{ fontSize: '1rem', marginLeft: '0.5rem', color: '#6b7280' }}>/ 5レベル</span></div>
                            </div>
                            <div className={styles.statCard}>
                                <span className={styles.statLabel}>データ収集期間</span>
                                <div className={styles.statValueRow}><span className={styles.statValue}>{nationalSessions.length}</span><span style={{ fontSize: '1rem', marginLeft: '0.5rem', color: '#6b7280' }}>回分</span></div>
                            </div>
                        </div>

                        <h3 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>レベル別合格率比較</h3>
                        <div className={styles.chartGrid}>
                            <div className={styles.chartCard}>
                                <h3 className={styles.chartTitle}>本校 vs 全国平均（日本国内）</h3>
                                <div className={styles.chartContainer}>
                                    <Bar
                                        data={{
                                            labels: levels,
                                            datasets: [
                                                { label: '本校', data: levels.map(l => (statsObj?.levelStats || []).find(s => s.level === l)?.passRate || 0), backgroundColor: 'rgba(59, 130, 246, 0.7)' },
                                                { label: '全国平均（日本国内）', data: levels.map(l => natLevelStats[l].avg), backgroundColor: 'rgba(239, 68, 68, 0.7)' }
                                            ]
                                        }}
                                        options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '合格率 (%)' } } } }}
                                    />
                                </div>
                            </div>
                            <div className={styles.chartCard}>
                                <h3 className={styles.chartTitle}>全国平均の推移（全レベル）</h3>
                                <div className={styles.chartContainer}>
                                    <Line
                                        data={{
                                            labels: chartLabels,
                                            datasets: chartDatasets
                                        }}
                                        options={{ ...chartOptions, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: '合格率 (%)' } }, x: { ticks: { maxRotation: 45, minRotation: 45 } } }, plugins: { legend: { display: true, position: 'top' } } }}
                                    />
                                </div>
                            </div>
                        </div>

                        <h3 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>直近3ヶ年の推移</h3>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th colSpan="4" style={{ backgroundColor: '#f9fafb', textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>直近3ヶ年の合格率比較</th>
                                    </tr>
                                    <tr>
                                        <th>年度</th>
                                        <th>本校合格率</th>
                                        <th>全国平均合格率</th>
                                        <th>差分</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearlyCompare.map((y, i) => {
                                        const isBetter = y.diff >= 0;
                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{y.year}</td>
                                                <td style={{ color: '#3b82f6', fontWeight: 600 }}>{y.myStat.toFixed(1)}%</td>
                                                <td>{y.natAvg.toFixed(1)}%</td>
                                                <td style={{ color: isBetter ? COLOR_PASS : COLOR_FAIL, fontWeight: 600 }}>
                                                    {isBetter ? `+${y.diff.toFixed(1)}` : y.diff.toFixed(1)}%
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    <tr style={{ backgroundColor: '#f0fdfa' }}>
                                        <td style={{ fontWeight: 600 }}>3年平均</td>
                                        <td style={{ color: '#3b82f6', fontWeight: 600 }}>{my3YrAvg.toFixed(1)}%</td>
                                        <td>{nat3YrAvg.toFixed(1)}%</td>
                                        <td style={{ color: diff3Yr >= 0 ? COLOR_PASS : COLOR_FAIL, fontWeight: 600 }}>
                                            {diff3Yr >= 0 ? `+${diff3Yr.toFixed(1)}` : diff3Yr.toFixed(1)}%
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.tableContainer} style={{ marginTop: '2rem' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th colSpan="8" style={{ backgroundColor: '#f9fafb', textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>レベル別詳細比較</th>
                                    </tr>
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
                                    {levels.map(lvl => {
                                        const myStat = (statsObj?.levelStats || []).find(s => s.level === lvl) || { passRate: 0, total: 0 };
                                        const nat = natLevelStats[lvl];
                                        const diff = myStat.passRate - nat.avg;
                                        const isBetter = diff >= 0;
                                        
                                        return (
                                            <tr key={lvl}>
                                                <td><span className={`${styles.badge} ${styles[`badge${lvl}`]}`}>{lvl}</span></td>
                                                <td style={{ fontWeight: 600 }}>{myStat.passRate}%</td>
                                                <td>{myStat.total}名</td>
                                                <td>{nat.avg.toFixed(1)}%</td>
                                                <td style={{ color: '#9ca3af' }}>{nat.min.toFixed(1)}%</td>
                                                <td style={{ color: '#9ca3af' }}>{nat.max.toFixed(1)}%</td>
                                                <td style={{ color: isBetter ? COLOR_PASS : COLOR_FAIL, fontWeight: 600 }}>
                                                    {isBetter ? `+${diff.toFixed(1)}` : diff.toFixed(1)}%
                                                </td>
                                                <td style={{ color: isBetter ? COLOR_PASS : COLOR_FAIL }}>
                                                    {diff > 5 ? '◎ 優秀' : isBetter ? '○ 標準' : '△ 課題'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.tableContainer} style={{ marginTop: '2rem' }}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th colSpan="6" style={{ backgroundColor: '#f9fafb', textAlign: 'left', padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>直近の全国試験データ(合格率)</th>
                                    </tr>
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
                                    {nationalSessions.slice(-5).reverse().map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{s.session_name}</td>
                                            <td>{s.japan?.N1?.pass_rate !== undefined ? `${s.japan.N1.pass_rate}%` : '-'}</td>
                                            <td>{s.japan?.N2?.pass_rate !== undefined ? `${s.japan.N2.pass_rate}%` : '-'}</td>
                                            <td>{s.japan?.N3?.pass_rate !== undefined ? `${s.japan.N3.pass_rate}%` : '-'}</td>
                                            <td>{s.japan?.N4?.pass_rate !== undefined ? `${s.japan.N4.pass_rate}%` : '-'}</td>
                                            <td>{s.japan?.N5?.pass_rate !== undefined ? `${s.japan.N5.pass_rate}%` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

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
