'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

export default function HomeworkListClient({ assignmentsData = { active: [], archived: [] } }) {
    const [viewMode, setViewMode] = useState('active') // 'active', 'archived', 'scores'
    const [filter, setFilter] = useState('all') // 'all', 'unsubmitted', 'submitted'
    const [selectedSubject, setSelectedSubject] = useState(null)

    const currentAssignments = viewMode === 'active' ? assignmentsData.active : 
                               viewMode === 'archived' ? assignmentsData.archived : 
                               [...assignmentsData.active, ...assignmentsData.archived]

    const filteredAssignments = currentAssignments.filter(a => {
        const isSubmitted = a.submission && a.submission.status !== 'returned'
        if (filter === 'unsubmitted') return !isSubmitted
        if (filter === 'submitted') return isSubmitted
        return true
    })

    const getStatusBadge = (assignment) => {
        const isSubmitted = assignment.submission && assignment.submission.status !== 'returned'

        if (isSubmitted) {
            return <span className={`${styles.badge} ${styles.badgeSubmitted}`}>提出済</span>
        }

        const deadline = new Date(assignment.deadline)
        const now = new Date()
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return <span className={`${styles.badge} ${styles.badgeOverdue}`}>期限切れ</span>
        } else if (diffDays <= 3) {
            return <span className={`${styles.badge} ${styles.badgeSoon}`}>あと{diffDays}日</span>
        }
        return null
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return `${date.getMonth() + 1}/${date.getDate()}`
    }

    const renderScoreView = () => {
        const allAssignments = [...assignmentsData.active, ...assignmentsData.archived];
        
        // Group by subject (prefer subject over class_name)
        const grouped = allAssignments.reduce((acc, a) => {
            const subjectName = a.subject || a.class_name || 'その他';
            if (!acc[subjectName]) acc[subjectName] = [];
            acc[subjectName].push(a);
            return acc;
        }, {});

        const subjects = ['すべて', ...Object.keys(grouped)];

        if (allAssignments.length === 0) {
            return (
                <div className={styles.scoreContainer}>
                    <div className={styles.emptyState}>課題はありません</div>
                </div>
            );
        }

        const activeSubject = selectedSubject && subjects.includes(selectedSubject) ? selectedSubject : subjects[0];
        
        let assignments = [];
        if (activeSubject === 'すべて') {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            // 日本の年度（4月始まり）の開始日を計算
            const academicYearStart = new Date(currentMonth < 3 ? currentYear - 1 : currentYear, 3, 1);
            
            assignments = allAssignments.filter(a => {
                const itemDate = new Date(a.deadline || a.created_at || now);
                return itemDate >= academicYearStart;
            });
        } else {
            assignments = grouped[activeSubject] || [];
        }

        // Sort by deadline (descending or ascending? Let's do ascending)
        assignments.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        
        let totalScore = 0;
        assignments.forEach(a => {
            if (a.submission && a.submission.status === 'graded') {
                totalScore += (a.submission.score || 0);
            }
        });

        return (
            <div className={styles.scoreContainer}>
                {/* Subject Tabs */}
                <div className={styles.subjectTabs}>
                    {subjects.map(subj => (
                        <button
                            key={subj}
                            className={`${styles.subjectTab} ${activeSubject === subj ? styles.subjectTabActive : ''}`}
                            onClick={() => setSelectedSubject(subj)}
                        >
                            {subj}
                        </button>
                    ))}
                </div>

                <div className={styles.scoreSection}>
                    <div className={styles.scoreSummary}>
                        <div className={styles.scoreSummaryItem}>
                            <span className={styles.scoreSummaryLabel}>合計得点:</span>
                            <span className={styles.scoreSummaryValue}>
                                <span style={{ color: '#ef4444' }}>{totalScore}</span> / {assignments.length}
                            </span>
                        </div>
                    </div>
                    
                    <div className={styles.scoreTableWrapper}>
                        <table className={styles.scoreTableVertical}>
                            <thead>
                                <tr>
                                    {activeSubject === 'すべて' && <th>科目名</th>}
                                    <th>課題名</th>
                                    <th>期限</th>
                                    <th>結果</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map(a => {
                                    let content = <span style={{ color: '#9ca3af' }}>-</span>;
                                    if (a.submission) {
                                        if (a.submission.status === 'returned') {
                                            content = <span style={{ color: '#ef4444', fontWeight: 'bold' }}>差戻</span>;
                                        } else if (a.submission.status === 'graded') {
                                            content = <span style={{ color: '#10b981', fontWeight: 'bold' }}>{a.submission.score !== null ? a.submission.score : '0'}</span>;
                                        } else {
                                            content = <span style={{ color: '#10b981', fontWeight: 'bold' }}>採点待ち</span>;
                                        }
                                    }
                                    return (
                                        <tr key={a.id}>
                                            {activeSubject === 'すべて' && <td className={styles.scoreTaskTitleCell} style={{ color: '#6b7280', fontSize: '13px' }}>{a.subject || a.class_name || 'その他'}</td>}
                                            <td className={styles.scoreTaskTitleCell}>{a.title}</td>
                                            <td className={styles.scoreTaskDateCell}>{formatDate(a.deadline)}</td>
                                            <td className={styles.scoreResultCell}>{content}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setViewMode('active')}
                    style={{
                        padding: '0.5rem 0', background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer',
                        fontWeight: viewMode === 'active' ? '600' : '400',
                        color: viewMode === 'active' ? '#4f46e5' : '#6b7280',
                        borderBottom: viewMode === 'active' ? '2px solid #4f46e5' : '2px solid transparent',
                        marginBottom: '-9px'
                    }}
                >
                    これからの課題
                </button>
                <button
                    onClick={() => setViewMode('archived')}
                    style={{
                        padding: '0.5rem 0', background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer',
                        fontWeight: viewMode === 'archived' ? '600' : '400',
                        color: viewMode === 'archived' ? '#4f46e5' : '#6b7280',
                        borderBottom: viewMode === 'archived' ? '2px solid #4f46e5' : '2px solid transparent',
                        marginBottom: '-9px'
                    }}
                >
                    過去の課題・提出履歴
                </button>
                <button
                    onClick={() => setViewMode('scores')}
                    style={{
                        padding: '0.5rem 0', background: 'none', border: 'none', fontSize: '15px', cursor: 'pointer',
                        fontWeight: viewMode === 'scores' ? '600' : '400',
                        color: viewMode === 'scores' ? '#4f46e5' : '#6b7280',
                        borderBottom: viewMode === 'scores' ? '2px solid #4f46e5' : '2px solid transparent',
                        marginBottom: '-9px',
                        marginLeft: '1rem'
                    }}
                >
                    スコア表
                </button>
            </div>

            {viewMode === 'scores' ? (
                renderScoreView()
            ) : (
                <>
                    {/* Filter Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    すべて
                </button>
                <button
                    className={`${styles.tab} ${filter === 'unsubmitted' ? styles.active : ''}`}
                    onClick={() => setFilter('unsubmitted')}
                >
                    未提出
                </button>
                <button
                    className={`${styles.tab} ${filter === 'submitted' ? styles.active : ''}`}
                    onClick={() => setFilter('submitted')}
                >
                    提出済
                </button>
            </div>

            {/* List */}
            <div className={styles.list}>
                {filteredAssignments.length === 0 ? (
                    <div className={styles.emptyState}>
                        課題はありません
                    </div>
                ) : (
                    filteredAssignments.map(assignment => (
                        <Link
                            key={assignment.id}
                            href={`/student/homework/${assignment.id}`}
                            className={styles.card}
                            style={viewMode === 'archived' ? { opacity: 0.8, background: '#fafafa' } : {}}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitle}>
                                    {assignment.title}
                                    {viewMode === 'archived' && (
                                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                                            ({assignment.class_name})
                                        </span>
                                    )}
                                </div>
                                <ChevronRight size={20} className={styles.arrow} />
                            </div>

                            <div className={styles.cardMeta}>
                                <div className={styles.deadline}>
                                    <Clock size={14} />
                                    <span>{formatDate(assignment.deadline)}まで</span>
                                </div>
                                {getStatusBadge(assignment)}
                            </div>
                        </Link>
                    ))
                )}
            </div>
            </>
            )}
        </div>
    )
}
