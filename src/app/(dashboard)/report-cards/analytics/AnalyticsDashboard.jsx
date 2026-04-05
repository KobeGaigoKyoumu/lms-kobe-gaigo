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
    initialGradeData = [],
    initialJlptData = {},
    initialNationalStats = null,
    initialSectionStats = null,
    initialCareerStats = null,
    initialStudentDb = []
}) {
    const [activeTab, setActiveTab] = useState('grade')
    const [chartFontSize, setChartFontSize] = useState(12)

    useEffect(() => {
        const handleResize = () => {
            setChartFontSize(window.innerWidth < 768 ? 10 : 12)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
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
                {activeTab === 'grade' && (
                    <GradeTab 
                        initialGrades={initialGradeData} 
                        chartFontSize={chartFontSize} 
                    />
                )}
                {activeTab === 'jlpt' && (
                    <JlptTab 
                        initialStats={initialJlptData}
                        nationalStats={initialNationalStats}
                        sectionScoreStats={initialSectionStats}
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
                        studentDb={initialStudentDb} 
                    />
                )}
            </main>
        </div>
    )
}
