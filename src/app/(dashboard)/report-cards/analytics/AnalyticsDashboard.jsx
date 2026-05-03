'use client'

import { useState, useEffect } from 'react'
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    LineElement, 
    PointElement, 
    Title, 
    Tooltip, 
    Legend, 
    ArcElement, 
    Filler 
} from 'chart.js'
import styles from './page.module.css'

// Import Tabs
import GradeTab from './tabs/GradeTab'
import JlptTab from './tabs/JlptTab'
import DatabaseTab from './tabs/DatabaseTab'
import CareerTab from './tabs/CareerTab'



ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

export default function AnalyticsDashboard({ 
    initialCareerStats = null
}) {
    const [activeTab, setActiveTab] = useState('grade')
    const [chartFontSize, setChartFontSize] = useState(12)

    // Data State
    const [gradeData, setGradeData] = useState([])
    const [jlptData, setJlptData] = useState({})
    const [studentDb, setStudentDb] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const handleResize = () => {
            setChartFontSize(window.innerWidth < 768 ? 10 : 12)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const fetchAnalyticsData = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
                let targetUrl = workerUrl ? (workerUrl.startsWith('http') ? workerUrl : `https://${workerUrl}`) : null;

                let gradeResData = null;
                let jlptResData = null;

                // 1. Try Cloudflare Worker first (Ultra-fast, zero Vercel CPU)
                if (targetUrl) {
                    try {
                        const [cfGradeRes, cfJlptRes] = await Promise.all([
                            fetch(`${targetUrl}?action=get-analytics&type=grades_v4`),
                            fetch(`${targetUrl}?action=get-analytics&type=jlpt_v4`)
                        ]);

                        if (cfGradeRes.ok) {
                            const cfData = await cfGradeRes.json();
                            if (cfData && cfData.data) gradeResData = cfData;
                        }
                        if (cfJlptRes.ok) {
                            const cfData = await cfJlptRes.json();
                            if (cfData && (cfData.stats || cfData.enhanced)) jlptResData = cfData;
                        }
                    } catch (e) {
                        console.error('Cloudflare fetch failed on client:', e);
                    }
                }

                // 2. Fallback to Next.js API Route if Cloudflare fails or is missing data
                if (!gradeResData) {
                    console.log('Falling back to API Route for grades...');
                    const res = await fetch('/api/analytics?type=grades');
                    if (res.ok) {
                        gradeResData = await res.json();
                    }
                }
                if (!jlptResData) {
                    console.log('Falling back to API Route for jlpt...');
                    const res = await fetch('/api/analytics?type=jlpt');
                    if (res.ok) {
                        jlptResData = await res.json();
                    }
                }

                setGradeData(gradeResData?.data || []);
                setJlptData(jlptResData || {});
                setStudentDb(jlptResData?.enhanced?.allStudentStats || []);

            } catch (err) {
                console.error('Analytics Data Fetch Error:', err)
                setError('データの取得に失敗しました。')
            } finally {
                setIsLoading(false)
            }
        }

        fetchAnalyticsData()
    }, [])

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>成績・進路分析ダッシュボード</h1>
                <p className={styles.subtitle}>学生の学力推移と進路実績の多角的な分析</p>
            </header>

            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${activeTab === 'grade' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('grade')}
                >
                    成績分析
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'jlpt' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('jlpt')}
                >
                    JLPT分析
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'career' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('career')}
                >
                    進路分析
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'database' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('database')}
                >
                    学生データベース
                </button>
            </div>

            <main className={styles.mainContent}>
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '1rem' }}>
                        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(59, 130, 246, 0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: '#6b7280' }}>データを読み込んでいます...</p>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : error ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '0.5rem' }}>
                        {error}
                    </div>
                ) : (
                    <>
                        {activeTab === 'grade' && (
                            <GradeTab 
                                initialGrades={gradeData} 
                                chartFontSize={chartFontSize} 
                            />
                        )}
                        {activeTab === 'jlpt' && (
                            <JlptTab 
                                initialStats={jlptData?.enhanced || { stats: jlptData?.stats || [] }}
                                nationalStats={jlptData?.nationalStats || null}
                                sectionScoreStats={jlptData?.sectionScores || null}
                                chartFontSize={chartFontSize} 
                            />
                        )}
                        {activeTab === 'career' && (
                            <CareerTab 
                                careerStats={initialCareerStats}
                                chartFontSize={chartFontSize} 
                            />
                        )}
                        {activeTab === 'database' && (
                            <DatabaseTab 
                                studentDb={studentDb} 
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
