'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
            }
        },
        x: {
            grid: {
                display: false,
            }
        }
    }
};

export default function JlptStatsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/jlpt/stats');
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className="spinner"></div>
                <p>データを読み込んでいます...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={styles.loadingContainer}>
                <p>データが見つかりませんでした。</p>
            </div>
        );
    }

    // Calculate Overview Stats
    const totalExams = data.reduce((acc, curr) => acc + curr.examinees, 0);
    const totalPassers = data.reduce((acc, curr) => acc + curr.passers, 0);
    const overallPassRate = totalExams > 0 ? ((totalPassers / totalExams) * 100).toFixed(1) : 0;

    // Aggregate for Charts
    // Group by Session for Pass Rate Trend (Aggregate all levels)
    const sessionGroups = {};
    data.forEach(item => {
        if (!sessionGroups[item.session]) {
            sessionGroups[item.session] = { total: 0, passed: 0 };
        }
        sessionGroups[item.session].total += item.examinees;
        sessionGroups[item.session].passed += item.passers;
    });

    const uniqueSessions = Object.keys(sessionGroups); // Already sorted from backend
    const trendLabels = uniqueSessions;
    const trendDataPoints = uniqueSessions.map(session => {
        const s = sessionGroups[session];
        return s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) : 0;
    });

    const trendData = {
        labels: trendLabels,
        datasets: [
            {
                label: '全体合格率 (%)',
                data: trendDataPoints,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.3,
            },
        ],
    };

    // Average Score by Level (Most recent session or average across all?)
    // Let's do Average across all time by Level
    const levelStats = {};
    data.forEach(item => {
        if (!levelStats[item.level]) {
            levelStats[item.level] = { sum: 0, count: 0 };
        }
        const score = parseFloat(item.averageScore);
        if (score > 0) {
            levelStats[item.level].sum += score;
            levelStats[item.level].count += 1;
        }
    });

    const levels = ['N1', 'N2', 'N3', 'N4', 'N5']; // Fixed order
    const scoreDataPoints = levels.map(l => {
        const s = levelStats[l];
        return s && s.count > 0 ? (s.sum / s.count).toFixed(1) : 0;
    });

    const scoreData = {
        labels: levels,
        datasets: [
            {
                label: '平均点 (全期間)',
                data: scoreDataPoints,
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
            }
        ]
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>JLPT 統計・分析</h1>
                <p className={styles.subtitle}>過去の試験結果データの分析概要</p>
            </header>

            {/* Overview Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>総受験者数 (延べ人数)</span>
                    <span className={styles.statValue}>{totalExams.toLocaleString()}</span>
                    <span className={styles.statTrend}>
                        名
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>総合格者数</span>
                    <span className={styles.statValue}>{totalPassers.toLocaleString()}</span>
                    <span className={styles.statTrend}>
                        名
                    </span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>全体合格率</span>
                    <span className={styles.statValue}>{overallPassRate}%</span>
                    <span className={styles.statTrend}>
                        平均
                    </span>
                </div>
            </div>

            {/* Charts */}
            <div className={styles.chartsRow}>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>合格率の推移</h3>
                    <div className={styles.chartContainer}>
                        <Line data={trendData} options={chartOptions} />
                    </div>
                </div>
                <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>レベル別 平均点</h3>
                    <div className={styles.chartContainer}>
                        <Bar data={scoreData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div>
                <h2 className={styles.sectionTitle}>詳細データ</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>実施回</th>
                                <th>レベル</th>
                                <th>受験者数</th>
                                <th>合格者数</th>
                                <th>合格率</th>
                                <th>平均点</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, index) => (
                                <tr key={`${row.session}-${row.level}-${index}`}>
                                    <td>{row.session}</td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[`badge${row.level}`]}`}>
                                            {row.level}
                                        </span>
                                    </td>
                                    <td>{row.examinees}</td>
                                    <td>{row.passers}</td>
                                    <td style={{ fontWeight: 600 }}>{row.passRate}%</td>
                                    <td>{row.averageScore}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
