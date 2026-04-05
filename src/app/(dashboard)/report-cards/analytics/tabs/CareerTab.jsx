'use client'

import { useState, useMemo } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import styles from '../page.module.css'

export default function CareerTab({ careerStats = null }) {
    const [selectedYear, setSelectedYear] = useState('2024')

    const stats = useMemo(() => {
        if (!careerStats) return null
        return careerStats[selectedYear] || careerStats[Object.keys(careerStats)[0]]
    }, [careerStats, selectedYear])

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { boxWidth: 12, padding: 15, font: { size: 11 } }
            }
        }
    }

    if (!careerStats || !stats) {
        return <div className={styles.noData}>進路分析データはありません</div>
    }

    const { summary, destination_types, top_universities, top_vocational } = stats

    return (
        <div className={styles.tabContent} style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className={styles.filters} style={{ justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>卒業年度</label>
                    <select 
                        className={styles.filterSelect} 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        {Object.keys(careerStats).map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>進路決定率</span>
                    <div className={styles.statValueRow}>
                        <span className={styles.statValue}>{summary?.placement_rate || 0}%</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>大学・大学院進学</span>
                    <div className={styles.statValueRow}>
                        <span className={styles.statValue}>{summary?.university_count || 0}</span>名
                    </div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>専門学校進学</span>
                    <div className={styles.statValueRow}>
                        <span className={styles.statValue}>{summary?.vocational_count || 0}</span>名
                    </div>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>就職・その他</span>
                    <div className={styles.statValueRow}>
                        <span className={styles.statValue}>{summary?.others_count || 0}</span>名
                    </div>
                </div>
            </div>

            <div className={styles.chartsRow}>
                <div className={styles.chartCard} style={{ flex: 1 }}>
                    <h3 className={styles.chartTitle}>進路内訳</h3>
                    <div className={styles.chartContainer} style={{ height: '300px' }}>
                        <Pie
                            data={{
                                labels: (destination_types || []).map(d => d.type),
                                datasets: [{
                                    data: (destination_types || []).map(d => d.count),
                                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#94a3b8']
                                }]
                            }}
                            options={chartOptions}
                        />
                    </div>
                </div>

                <div className={styles.chartCard} style={{ flex: 2 }}>
                    <h3 className={styles.chartTitle}>主な進学先ランク</h3>
                    <div className={styles.chartContainer}>
                        <Bar
                            data={{
                                labels: [...(top_universities || []).slice(0, 5), ...(top_vocational || []).slice(0, 5)].map(d => d.name),
                                datasets: [{
                                    label: '合格者数',
                                    data: [...(top_universities || []).slice(0, 5), ...(top_vocational || []).slice(0, 5)].map(d => d.count),
                                    backgroundColor: 'rgba(59, 130, 246, 0.7)'
                                }]
                            }}
                            options={{
                                ...chartOptions,
                                indexAxis: 'y',
                                plugins: { ...chartOptions.plugins, legend: { display: false } }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
