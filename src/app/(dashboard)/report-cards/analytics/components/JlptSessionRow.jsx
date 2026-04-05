'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import styles from '../page.module.css'

const COLOR_PASS = '#22c55e'
const COLOR_FAIL = '#ef4444'
const COLOR_MUTED = '#9ca3af'

export function JlptSessionRow({ sessionData }) {
    const [isOpen, setIsOpen] = useState(false)
    const passRate = sessionData.totalExaminees > 0
        ? ((sessionData.totalPassers / sessionData.totalExaminees) * 100).toFixed(1)
        : 0

    return (
        <div className={styles.sessionGroup}>
            <div
                className={styles.sessionHeader}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={styles.sessionTitle}>
                    {sessionData.session}
                    <span className={styles.sessionSummary}>
                        受験: {sessionData.totalExaminees}名 / 合格: {sessionData.totalPassers}名 (合格率: {passRate}%)
                    </span>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {isOpen && (
                <div className={styles.sessionDetails} style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>レベル</th>
                                <th>合計</th>
                                <th>合格 / 不合格</th>
                                <th>合格率</th>
                                <th>平均点</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...sessionData.items]
                                .sort((a, b) => {
                                    const levelOrder = { N1: 1, N2: 2, N3: 3, N4: 4, N5: 5 };
                                    return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
                                })
                                .map((row, index) => {
                                    const failed = row.examinees - row.passers;
                                    return (
                                        <tr key={`${row.session}-${row.level}-${index}`}>
                                            <td>
                                                <span className={`${styles.badge} ${styles[`badge${row.level}`]}`}>
                                                    {row.level}
                                                </span>
                                            </td>
                                            <td>{row.examinees}名</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ color: COLOR_PASS, fontWeight: 600 }}>{row.passers}</span>
                                                    <span style={{ color: COLOR_MUTED, fontSize: '0.8em' }}>/</span>
                                                    <span style={{ color: COLOR_FAIL, fontWeight: 600 }}>{failed}</span>
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{row.passRate}%</td>
                                            <td>{row.averageScore}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
