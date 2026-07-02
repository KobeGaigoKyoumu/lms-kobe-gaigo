'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import styles from './page.module.css'
import SubmissionMatrix from './SubmissionMatrix'
import StudyRecordsMatrix from './StudyRecordsMatrix'

export default function ClassAssignmentsPage({ params }) {
    const resolvedParams = use(params)
    const className = decodeURIComponent(resolvedParams.className)

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isArchived, setIsArchived] = useState(false)
    const [selectedSubject, setSelectedSubject] = useState('all')
    const [pastPage, setPastPage] = useState(1)
    const [activeView, setActiveView] = useState('assignments') // 'assignments' | 'study-records'
    const PAGE_SIZE = 10

    useEffect(() => {
        let isMounted = true
        setLoading(true)
        async function fetchData() {
            try {
                const res = await fetch(`/api/teacher/class-assignments/${encodeURIComponent(className)}?archived=${isArchived}`)
                if (!res.ok) {
                    throw new Error('Failed to fetch data')
                }
                const json = await res.json()
                if (isMounted) setData(json)
            } catch (err) {
                console.error(err)
                if (isMounted) setError('データの読み込みに失敗しました')
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchData()
        return () => { isMounted = false }
    }, [className, isArchived])

    useEffect(() => {
        setPastPage(1)
    }, [selectedSubject, isArchived])

    if (error) {
        return (
            <div className={styles.container}>
                <Link href="/assignments" className={styles.backLink}>
                    <ChevronLeft size={16} />
                    クラス一覧に戻る
                </Link>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f' }}>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    if (loading || !data) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <div className={styles.titleGroup}>
                        <Link href="/assignments" className={styles.backLink}>
                            <ChevronLeft size={16} />
                            クラス一覧に戻る
                        </Link>
                        <h1 className={styles.title}>
                            <div className={styles.classIcon}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            {className || '...'}
                        </h1>
                        <p className={styles.subtitle}>課題一覧</p>
                    </div>
                </header>

                <div className={styles.tabsContainer} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
                    <button
                        onClick={() => setIsArchived(false)}
                        style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: isArchived ? 'normal' : 'bold', color: isArchived ? '#666' : '#2563eb', borderBottom: isArchived ? 'none' : '2px solid #2563eb' }}
                    >
                        今年の課題
                    </button>
                    <button
                        onClick={() => setIsArchived(true)}
                        style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: isArchived ? 'bold' : 'normal', color: isArchived ? '#2563eb' : '#666', borderBottom: isArchived ? '2px solid #2563eb' : 'none' }}
                    >
                        過去の課題 (アーカイブ)
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
            </div>
        )
    }

    const { assignments, matrixData } = data
    const now = new Date()
    
    // Group assignments by subject name (text) for tabs
    const uniqueSubjects = [...new Set(
        assignments
            .map(a => a.subject?.trim())
            .filter(Boolean)
    )].sort()

    const filteredAssignments = selectedSubject === 'all' 
        ? assignments 
        : assignments.filter(a => a.subject === selectedSubject)

    const upcoming = filteredAssignments.filter(a => !a.deadline || new Date(a.deadline) >= now)
    const past = filteredAssignments.filter(a => a.deadline && new Date(a.deadline) < now)
    
    const totalPastPages = Math.ceil(past.length / PAGE_SIZE)
    const paginatedPast = past.slice((pastPage - 1) * PAGE_SIZE, pastPage * PAGE_SIZE)

    // Filter matrix data for SubmissionMatrix
    const filteredMatrixAssignments = selectedSubject === 'all' 
        ? matrixData.assignments 
        : matrixData.assignments.filter(a => a.subject === selectedSubject)
    
    const filteredAssignmentIds = new Set(filteredMatrixAssignments.map(a => a.id))
    const filteredSubmissions = matrixData.submissions.filter(s => filteredAssignmentIds.has(s.assignment_id))


    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <Link href="/assignments" className={styles.backLink}>
                        <ChevronLeft size={16} />
                        クラス一覧に戻る
                    </Link>
                    <h1 className={styles.title}>
                        <div className={styles.classIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        {className}
                    </h1>
                    <p className={styles.subtitle}>課題一覧</p>
                </div>
            </header>

            {/* メインタブ切り替え（課題管理 vs 学習記録） */}
            <div className={styles.tabsContainer} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveView('assignments')}
                    style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeView === 'assignments' ? 'bold' : 'normal', color: activeView === 'assignments' ? '#2563eb' : '#666', borderBottom: activeView === 'assignments' ? '2px solid #2563eb' : 'none' }}
                >
                    課題管理
                </button>
                <button
                    onClick={() => setActiveView('study-records')}
                    style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeView === 'study-records' ? 'bold' : 'normal', color: activeView === 'study-records' ? '#2563eb' : '#666', borderBottom: activeView === 'study-records' ? '2px solid #2563eb' : 'none' }}
                >
                    📋 学生の学習記録
                </button>
            </div>

            {activeView === 'study-records' ? (
                <StudyRecordsMatrix className={className} />
            ) : (
                <>
                    <div className={styles.tabsContainer} style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #eee', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
                        <button
                            onClick={() => setIsArchived(false)}
                            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: isArchived ? 'normal' : 'bold', color: isArchived ? '#666' : '#2563eb', borderBottom: isArchived ? 'none' : '2px solid #2563eb' }}
                        >
                            今年の課題
                        </button>
                        <button
                            onClick={() => setIsArchived(true)}
                            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontWeight: isArchived ? 'bold' : 'normal', color: isArchived ? '#2563eb' : '#666', borderBottom: isArchived ? '2px solid #2563eb' : 'none' }}
                        >
                            過去の課題 (アーカイブ)
                        </button>
                    </div>

                    {uniqueSubjects.length > 0 && (
                        <div className={styles.subjectTabs} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                            <button
                                onClick={() => setSelectedSubject('all')}
                                className={selectedSubject === 'all' ? styles.activeSubjectTab : styles.subjectTab}
                            >
                                すべて
                            </button>
                            {uniqueSubjects.map(subjectName => (
                                <button
                                    key={subjectName}
                                    onClick={() => setSelectedSubject(subjectName)}
                                    className={selectedSubject === subjectName ? styles.activeSubjectTab : styles.subjectTab}
                                >
                                    {subjectName}
                                </button>
                            ))}
                            {assignments.some(a => !a.subject) && (
                                <button
                                    onClick={() => setSelectedSubject(null)}
                                    className={selectedSubject === null ? styles.activeSubjectTab : styles.subjectTab}
                                >
                                    未分類
                                </button>
                            )}
                        </div>
                    )}

                    {/* Upcoming Assignments */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="10" cy="10" r="8" />
                                <path d="M10 6v4l2 2" />
                            </svg>
                            進行中の課題 ({upcoming.length})
                        </h2>

                        {upcoming.length === 0 ? (
                            <p className={styles.empty}>進行中の課題はありません</p>
                        ) : (
                            <div className={styles.list}>
                                {upcoming.map(assignment => (
                                    <Link
                                        href={`/assignments/${assignment.id}`}
                                        key={assignment.id}
                                        className={styles.card}
                                    >
                                        <div className={styles.cardMain}>
                                            <h3>{assignment.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1 truncate">{assignment.description}</p>
                                        </div>
                                        <div className={styles.cardMeta}>
                                            {assignment.deadline ? (
                                                <span className={styles.dueDate}>
                                                    締切: {new Date(assignment.deadline).toLocaleDateString('ja-JP', {
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            ) : (
                                                <span className={styles.noDue}>締切なし</span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Past Assignments */}
                    {past.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
                                    <path d="M7 10l2 2 4-4" />
                                </svg>
                                終了した課題 ({past.length})
                            </h2>

                            <div className={styles.list}>
                                {paginatedPast.map(assignment => (
                                    <Link
                                        href={`/assignments/${assignment.id}`}
                                        key={assignment.id}
                                        className={`${styles.card} ${styles.past}`}
                                    >
                                        <div className={styles.cardMain}>
                                            <h3>{assignment.title}</h3>
                                        </div>
                                        <div className={styles.cardMeta}>
                                            <span className={styles.dueDate}>
                                                締切: {new Date(assignment.deadline).toLocaleDateString('ja-JP')}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {totalPastPages > 1 && (
                                <div className={styles.pagination}>
                                    <button 
                                        onClick={() => setPastPage(p => Math.max(1, p - 1))}
                                        disabled={pastPage === 1}
                                        className={styles.pageBtn}
                                    >
                                        前へ
                                    </button>
                                    <span className={styles.pageIndicator}>
                                        {pastPage} / {totalPastPages}
                                    </span>
                                    <button 
                                        onClick={() => setPastPage(p => Math.min(totalPastPages, p + 1))}
                                        disabled={pastPage === totalPastPages}
                                        className={styles.pageBtn}
                                    >
                                        次へ
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Submission Matrix Table */}
                    <SubmissionMatrix
                        students={matrixData.students}
                        assignments={filteredMatrixAssignments}
                        submissions={filteredSubmissions}
                        className={className}
                    />
                </>
            )}
        </div>
    )
}
