'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import styles from './page.module.css'
import SubmissionMatrix from './SubmissionMatrix'

export default function ClassAssignmentsPage({ params }) {
    const resolvedParams = use(params)
    const className = decodeURIComponent(resolvedParams.className)

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isArchived, setIsArchived] = useState(false)

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
    const upcoming = assignments.filter(a => !a.deadline || new Date(a.deadline) >= now)
    const past = assignments.filter(a => a.deadline && new Date(a.deadline) < now)

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
                        {past.map(assignment => (
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
                </section>
            )}

            {/* Submission Matrix Table */}
            <SubmissionMatrix
                students={matrixData.students}
                assignments={matrixData.assignments}
                submissions={matrixData.submissions}
                className={className}
            />
        </div>
    )
}
