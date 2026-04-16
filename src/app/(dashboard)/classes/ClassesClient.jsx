'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ChevronRight, Users, School, Plus, User, Star, ChevronLeft } from 'lucide-react'
import styles from './page.module.css'

export default function ClassesClient({ adminMember, initialClasses = [], initialStudentCounts = {} }) {
    const [searchTerm, setSearchTerm] = useState('')

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
                        <Link href="/classes/new" className={styles.createBtn}>
                            <Plus size={20} />
                            新規クラス作成
                        </Link>
                    </div>
                )}
            </header>


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
