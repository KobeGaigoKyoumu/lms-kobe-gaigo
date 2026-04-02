'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ChevronRight, Users, School, Plus, User, Star, Trash2, RefreshCw } from 'lucide-react'
import styles from './page.module.css'
import { cleanupDuplicateClasses, deleteOldAcademicYearData } from '@/app/actions/classData'

export default function ClassesClient({ adminMember, initialClasses = [], initialStudentCounts = {} }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isCleaning, setIsCleaning] = useState(false)
    const [cleanupResult, setCleanupResult] = useState(null)

    const isAdmin = adminMember?.role === 'admin'
    const isTeacher = adminMember?.role === 'teacher'
    const isTeacherOrAdmin = isAdmin || isTeacher

    // Search and process classes
    const filteredClasses = (initialClasses || []).filter(cls => 
        cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.course?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cls.homeroom_teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).map(cls => ({
        ...cls,
        studentCount: initialStudentCounts[cls.name] || 0
    }))

    // Separate My Classes and Other Classes for Teachers
    const myClasses = isAdmin ? [] : filteredClasses.filter(cls => 
        cls.teacher_id === adminMember?.memberId || 
        cls.homeroom_teacher_name === adminMember?.name
    )
    
    const otherClasses = isAdmin ? filteredClasses : filteredClasses.filter(cls => 
        cls.teacher_id !== adminMember?.memberId && 
        cls.homeroom_teacher_name !== adminMember?.name
    )

    const handleCleanup = async () => {
        if (!confirm('重複した空のクラス（担当者・時間割なし）を削除しますか？')) return
        
        setIsCleaning(true)
        try {
            const { success, deletedCount, error, message } = await cleanupDuplicateClasses()
            if (success) {
                setCleanupResult(`クリーンアップ完了: ${deletedCount || 0}件の重複を削除しました。`)
                setTimeout(() => window.location.reload(), 2000)
            } else {
                alert('エラー: ' + (error || message))
            }
        } catch (err) {
            alert('通信エラーが発生しました')
        } finally {
            setIsCleaning(false)
        }
    }

    const handleDeleteOldYear = async () => {
        if (!confirm('【重要】2024年度のすべてのクラスデータを完全に削除しますか？\nこの操作は取り消せません。')) return
        if (!confirm('本当によろしいですか？')) return

        setIsCleaning(true)
        try {
            const { success, count, error } = await deleteOldAcademicYearData(2024)
            if (success) {
                setCleanupResult(`2024年度データの削除完了: ${count}件のクラスを削除しました。`)
                setTimeout(() => window.location.reload(), 2000)
            } else {
                alert('エラー: ' + error)
            }
        } catch (err) {
            alert('通信エラーが発生しました')
        } finally {
            setIsCleaning(false)
        }
    }

    const ClassCard = ({ cls, isMyClass = false, showAdminBadge = false }) => (
        <Link href={`/classes/${cls.id}`} className={`${styles.card} ${isMyClass ? styles.myClassCard : ''} ${showAdminBadge ? styles.adminCard : ''}`}>
            {isMyClass && <div className={styles.myClassBadge}><Star size={12} fill="currentColor" /> 担当</div>}
            {showAdminBadge && !isMyClass && <div className={styles.adminBadge}>管理</div>}
            
            <div className={styles.cardHeader}>
                <span className={styles.cardBadge}>{cls.grade_level || '未設定'}</span>
                <span className={styles.year}>{cls.academic_year || 2026}年度</span>
            </div>
            
            <h3 className={styles.cardTitle}>{cls.name}</h3>
            
            <p className={styles.cardDescription}>
                {cls.description || '説明なし'}
            </p>
            
            {cls.course && (
                <div className={styles.cardCourse}>
                    <GraduationCap size={14} />
                    <span>コース:</span> {cls.course.title}
                </div>
            )}
            
            <div className={styles.cardFooter}>
                <div className={styles.teacher}>
                    <div className={styles.teacherAvatar}>
                        {cls.teacher?.avatar_url ? (
                            <img src={cls.teacher.avatar_url} alt="" />
                        ) : (
                            <User size={14} />
                        )}
                    </div>
                    <span>{cls.homeroom_teacher_name || cls.teacher?.full_name || '担当未設定'}</span>
                </div>
                <div className={styles.memberCount}>
                    <Users size={14} />
                    <span>{cls.studentCount}名</span>
                </div>
            </div>
            <ChevronRight size={18} className={styles.arrowIcon} />
        </Link>
    )

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>クラス一覧</h1>
                    <p className={styles.subtitle}>
                        {isAdmin ? '管理者として全クラスを管理しています' :
                         isTeacher ? 'クラスの管理・作成が可能です' : '所属クラス一覧'}
                    </p>
                </div>
                {isTeacherOrAdmin && (
                    <div className={styles.headerActions}>
                        {isAdmin && !cleanupResult && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={handleCleanup} 
                                    disabled={isCleaning}
                                    className={styles.cleanupBtn}
                                    title="重複した空クラスを削除"
                                >
                                    {isCleaning ? <RefreshCw size={18} className={styles.spin} /> : <Trash2 size={18} />}
                                    重複整理
                                </button>
                                <button 
                                    onClick={handleDeleteOldYear} 
                                    disabled={isCleaning}
                                    className={styles.deleteYearBtn}
                                    title="2024年度データを一括削除"
                                >
                                    {isCleaning ? <RefreshCw size={18} className={styles.spin} /> : <Trash2 size={18} />}
                                    2024削除
                                </button>
                            </div>
                        )}
                        <Link href="/classes/new" className={styles.createBtn}>
                            <Plus size={20} />
                            新規クラス作成
                        </Link>
                    </div>
                )}
            </header>

            {cleanupResult && (
                <div className={styles.cleanupAlert}>
                    {cleanupResult}
                </div>
            )}

            <div className={styles.searchBar}>
                <input 
                    type="text" 
                    placeholder="クラス名、コース、担当者で検索..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* Teacher View: My Classes vs Others */}
            {isTeacher && myClasses.length > 0 && (
                <section className={styles.myClassesSection}>
                    <h2 className={styles.sectionTitle}>
                        <Star size={20} className={styles.sectionIcon} />
                        担当クラス ({myClasses.length})
                    </h2>
                    <div className={styles.grid}>
                        {myClasses.map(cls => (
                            <ClassCard key={cls.id} cls={cls} isMyClass={true} />
                        ))}
                    </div>
                </section>
            )}

            <section className={styles.adminSection}>
                {isTeacher && myClasses.length > 0 && (
                    <h2 className={styles.sectionTitle}>
                        <School size={20} className={styles.sectionIcon} />
                        その他のクラス ({otherClasses.length})
                    </h2>
                )}
                {isAdmin && (
                    <h2 className={styles.sectionTitle}>
                        <School size={20} className={styles.sectionIcon} />
                        全クラス ({filteredClasses.length})
                    </h2>
                )}
                
                <div className={styles.grid}>
                    {(isTeacher ? otherClasses : isAdmin ? filteredClasses : filteredClasses).map(cls => (
                        <ClassCard 
                            key={cls.id} 
                            cls={cls} 
                            isMyClass={cls.teacher_id === adminMember?.memberId}
                            showAdminBadge={isAdmin}
                        />
                    ))}
                </div>

                {filteredClasses.length === 0 && (
                    <div className={styles.empty}>
                        <School size={64} opacity={0.2} />
                        <p>クラスが見つかりません</p>
                        {isTeacherOrAdmin && (
                            <Link href="/classes/new" className={styles.emptyBtn}>
                                最初のアカウントを作成
                            </Link>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}
