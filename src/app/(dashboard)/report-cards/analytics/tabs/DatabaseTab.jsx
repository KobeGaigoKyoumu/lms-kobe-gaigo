'use client'

import { useState, useMemo, useEffect } from 'react'
import styles from '../page.module.css'

export default function DatabaseTab({ studentDb }) {
    const [dbSearchQuery, setDbSearchQuery] = useState('')
    const [dbYearFilter, setDbYearFilter] = useState('')
    const [dbClassFilter, setDbClassFilter] = useState('')
    const [dbNationalityFilter, setDbNationalityFilter] = useState('')
    const [dbLevelFilter, setDbLevelFilter] = useState('')
    const [dbCurrentPage, setDbCurrentPage] = useState(1)
    const DB_ITEMS_PER_PAGE = 50

    // Standardized Color Constants
    const COLOR_PASS = '#22c55e'
    const COLOR_FAIL = '#ef4444'

    const dbFilterOptions = useMemo(() => {
        const years = [...new Set(studentDb.map(s => s.enrollmentYear))].filter(Boolean).sort().reverse()
        const classes = [...new Set(studentDb.map(s => s.class))].filter(Boolean).sort()
        const nationalities = [...new Set(studentDb.map(s => s.nationality))].filter(Boolean).sort()
        const levels = ['N1', 'N2', 'N3', 'N4', 'N5']
        return { years, classes, nationalities, levels }
    }, [studentDb])

    const dbFilteredStudents = useMemo(() => {
        return studentDb.filter(student => {
            const query = dbSearchQuery.toLowerCase().replace(/\s+/g, '')
            const nameMatch = !query || student.name.toLowerCase().includes(query) || (student.studentId || '').toLowerCase().includes(query) || (student.destination || '').toLowerCase().includes(query)
            const yearMatch = !dbYearFilter || student.enrollmentYear === dbYearFilter
            const classMatch = !dbClassFilter || student.class === dbClassFilter
            const nationalityMatch = !dbNationalityFilter || student.nationality === dbNationalityFilter
            const levelMatch = !dbLevelFilter || student.highestLevel === dbLevelFilter
            return nameMatch && yearMatch && classMatch && nationalityMatch && levelMatch
        })
    }, [studentDb, dbSearchQuery, dbYearFilter, dbClassFilter, dbNationalityFilter, dbLevelFilter])

    useEffect(() => {
        setDbCurrentPage(1)
    }, [dbSearchQuery, dbYearFilter, dbClassFilter, dbNationalityFilter, dbLevelFilter])

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            <div className={styles.filters}>
                <div className={styles.filterGroup} style={{ flex: '1 1 300px' }}>
                    <label className={styles.filterLabel}>生徒検索</label>
                    <input
                        type="text"
                        placeholder="名前/学籍番号/進学先などで絞り込み..."
                        className={styles.filterSelect}
                        style={{ width: '100%', padding: '0.5rem' }}
                        value={dbSearchQuery}
                        onChange={(e) => setDbSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>入学年度</label>
                    <select className={styles.filterSelect} value={dbYearFilter} onChange={(e) => setDbYearFilter(e.target.value)}>
                        <option value="">すべて</option>
                        {dbFilterOptions.years.map(y => <option key={y} value={y}>{y}年度</option>)}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>クラス</label>
                    <select className={styles.filterSelect} value={dbClassFilter} onChange={(e) => setDbClassFilter(e.target.value)}>
                        <option value="">すべて</option>
                        {dbFilterOptions.classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>国籍</label>
                    <select className={styles.filterSelect} value={dbNationalityFilter} onChange={(e) => setDbNationalityFilter(e.target.value)}>
                        <option value="">すべて</option>
                        {dbFilterOptions.nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>JLPT最高レベル</label>
                    <select className={styles.filterSelect} value={dbLevelFilter} onChange={(e) => setDbLevelFilter(e.target.value)}>
                        <option value="">すべて</option>
                        {dbFilterOptions.levels.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>学籍番号</th>
                            <th>名前</th>
                            <th>入学年度</th>
                            <th>クラス</th>
                            <th>国籍</th>
                            <th>進学先</th>
                            <th>JLPT最高レベル</th>
                            <th>詳細</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dbFilteredStudents.length === 0 ? (
                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>データが見つかりません</td></tr>
                        ) : (
                            dbFilteredStudents.slice((dbCurrentPage - 1) * DB_ITEMS_PER_PAGE, dbCurrentPage * DB_ITEMS_PER_PAGE).map((student, idx) => (
                                <tr key={idx}>
                                    <td>{student.studentId || '-'}</td>
                                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                                    <td>{student.enrollmentYear || '-'}</td>
                                    <td>{student.class || '-'}</td>
                                    <td>{student.nationality || '-'}</td>
                                    <td>{student.destination || '-'}</td>
                                    <td>{student.highestLevel ? <span className={`${styles.badge} ${styles[`badge${student.highestLevel}`]}`}>{student.highestLevel}</span> : '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                                            {['N1', 'N2', 'N3'].map(lvl => {
                                                const s = student.levels?.[lvl]
                                                if (!s) return null
                                                const color = s.status === '合格' ? COLOR_PASS : COLOR_FAIL
                                                return <span key={lvl} style={{ color, fontWeight: 'bold' }}>{lvl}: {s.score}点</span>
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {dbFilteredStudents.length > DB_ITEMS_PER_PAGE && (
                <div className={styles.pagination}>
                    <button onClick={() => setDbCurrentPage(p => Math.max(1, p - 1))} disabled={dbCurrentPage === 1}>前へ</button>
                    <span>{dbCurrentPage} / {Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE)}</span>
                    <button onClick={() => setDbCurrentPage(p => Math.min(p + 1, Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE)))} disabled={dbCurrentPage >= Math.ceil(dbFilteredStudents.length / DB_ITEMS_PER_PAGE)}>次へ</button>
                </div>
            )}
        </div>
    )
}
