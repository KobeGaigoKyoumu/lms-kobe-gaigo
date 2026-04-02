'use client'

import { useState } from 'react'
import { Users, GraduationCap, ChevronRight, School } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

export default function ClassesClient({ adminMember, initialClasses = [], initialStudentCounts = {} }) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredClasses = initialClasses.filter(cls => 
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.course?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <h1>クラス一覧</h1>
                    <p>全クラスの情報を管理します</p>
                </div>
                {adminMember.role === 'admin' && (
                    <Link href="/classes/new" className={styles.addButton}>
                        + 新規クラス作成
                    </Link>
                )}
            </header>

            <div className={styles.searchBar}>
                <input 
                    type="text" 
                    placeholder="クラス名やコース名で検索..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.grid}>
                {filteredClasses.length === 0 ? (
                    <div className={styles.emptyState}>
                        <School size={48} opacity={0.3} />
                        <p>クラスが見つかりません</p>
                    </div>
                ) : (
                    filteredClasses.map(cls => (
                        <Link href={`/classes/${cls.id}`} key={cls.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.className}>{cls.name}</h3>
                                <ChevronRight size={18} className={styles.arrowIcon} />
                            </div>
                            
                            <div className={styles.courseTag}>
                                <GraduationCap size={14} />
                                <span>{cls.course?.title || 'コース未設定'}</span>
                            </div>

                            <div className={styles.cardMeta}>
                                <div className={styles.metaItem}>
                                    <Users size={16} />
                                    <span>{initialStudentCounts[cls.name] || 0} 名</span>
                                </div>
                                <div className={styles.teacherLink}>
                                    {cls.homeroom_teacher_name || '担当未設定'}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
