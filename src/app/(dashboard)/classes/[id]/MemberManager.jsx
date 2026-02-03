'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function MemberManager({ classId, members, className }) {
    const router = useRouter()
    const [showAdd, setShowAdd] = useState(false)
    const [mode, setMode] = useState('email') // 'email' | 'master' | 'bulk'
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Master search state
    const [masterStudents, setMasterStudents] = useState([])
    const [selectedStudents, setSelectedStudents] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    const supabase = createClient()

    // Load students from master when switching to master mode
    useEffect(() => {
        if (mode === 'master' || mode === 'bulk') {
            loadMasterStudents()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode])

    const loadMasterStudents = async () => {
        const { data } = await supabase
            .from('students')
            .select('student_id_text, full_name, email, class_name')
            .eq('status', 'active')
            .order('class_name')
            .order('student_id_text')
        setMasterStudents(data || [])
    }

    // Filter master students based on search and exclude existing members
    const filteredMasterStudents = masterStudents.filter(student => {
        const existingEmails = members.map(m => m.user?.email).filter(Boolean)
        const isAlreadyMember = existingEmails.includes(student.email)
        const matchesSearch =
            student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.student_id_text?.includes(searchQuery) ||
            student.class_name?.includes(searchQuery)
        return !isAlreadyMember && matchesSearch
    })

    // Filter by class for bulk mode
    const classStudents = mode === 'bulk' && className
        ? masterStudents.filter(s => s.class_name === className)
        : []

    const handleAddMember = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // メールアドレスからユーザーを検索
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('email', email)
            .single()

        if (userError || !user) {
            setError('ユーザーが見つかりません')
            setLoading(false)
            return
        }

        // 既に登録されていないか確認
        const isAlreadyMember = members.some(m => m.user?.id === user.id)
        if (isAlreadyMember) {
            setError('このユーザーは既にメンバーです')
            setLoading(false)
            return
        }

        // メンバー追加
        const { error: addError } = await supabase
            .from('class_members')
            .insert({
                class_id: classId,
                user_id: user.id
            })

        if (addError) {
            setError('メンバーの追加に失敗しました')
            setLoading(false)
            return
        }

        setEmail('')
        setShowAdd(false)
        setLoading(false)
        router.refresh()
    }

    const handleAddFromMaster = async () => {
        if (selectedStudents.length === 0) {
            setError('追加する学生を選択してください')
            return
        }

        setLoading(true)
        setError('')
        let addedCount = 0

        for (const studentEmail of selectedStudents) {
            // Find profile by email
            const { data: user } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', studentEmail)
                .single()

            if (user) {
                const { error: addError } = await supabase
                    .from('class_members')
                    .insert({
                        class_id: classId,
                        user_id: user.id
                    })
                if (!addError) addedCount++
            }
        }

        setLoading(false)
        setSelectedStudents([])
        setSuccess(`${addedCount}名を追加しました`)
        setTimeout(() => setSuccess(''), 3000)
        router.refresh()
    }

    const handleBulkAddByClass = async () => {
        if (!className) {
            setError('クラス名が設定されていません')
            return
        }

        setLoading(true)
        setError('')
        let addedCount = 0

        // Get all students in this class from master
        const { data: classStudentsData } = await supabase
            .from('students')
            .select('email')
            .eq('class_name', className)
            .eq('status', 'active')

        if (!classStudentsData || classStudentsData.length === 0) {
            setError(`クラス ${className} の学生がマスターに登録されていません`)
            setLoading(false)
            return
        }

        for (const student of classStudentsData) {
            if (!student.email) continue

            const { data: user } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', student.email)
                .single()

            if (user) {
                // Check if not already a member
                const isAlreadyMember = members.some(m => m.user?.id === user.id)
                if (!isAlreadyMember) {
                    const { error: addError } = await supabase
                        .from('class_members')
                        .insert({
                            class_id: classId,
                            user_id: user.id
                        })
                    if (!addError) addedCount++
                }
            }
        }

        setLoading(false)
        setSuccess(`${addedCount}名を追加しました`)
        setTimeout(() => setSuccess(''), 3000)
        router.refresh()
    }

    const handleRemoveMember = async (memberId) => {
        if (!confirm('このメンバーをクラスから削除しますか？')) return

        const { error } = await supabase
            .from('class_members')
            .delete()
            .eq('id', memberId)

        if (error) {
            alert('削除に失敗しました')
            return
        }

        router.refresh()
    }

    const toggleStudentSelection = (email) => {
        setSelectedStudents(prev =>
            prev.includes(email)
                ? prev.filter(e => e !== email)
                : [...prev, email]
        )
    }

    return (
        <div className={styles.managerSection}>
            {!showAdd ? (
                <button
                    onClick={() => setShowAdd(true)}
                    className={styles.addMemberBtn}
                >
                    + メンバーを追加
                </button>
            ) : (
                <div className={styles.addPanel}>
                    {/* Mode Tabs */}
                    <div className={styles.modeTabs}>
                        <button
                            className={`${styles.modeTab} ${mode === 'email' ? styles.active : ''}`}
                            onClick={() => setMode('email')}
                        >
                            メール検索
                        </button>
                        <button
                            className={`${styles.modeTab} ${mode === 'master' ? styles.active : ''}`}
                            onClick={() => setMode('master')}
                        >
                            マスターから選択
                        </button>
                        {className && (
                            <button
                                className={`${styles.modeTab} ${mode === 'bulk' ? styles.active : ''}`}
                                onClick={() => setMode('bulk')}
                            >
                                クラス一括登録
                            </button>
                        )}
                    </div>

                    {/* Email Mode */}
                    {mode === 'email' && (
                        <form onSubmit={handleAddMember} className={styles.addForm}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="メールアドレスを入力"
                                required
                            />
                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAdd(false)
                                        setError('')
                                    }}
                                    className={styles.cancelBtn}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={styles.submitBtn}
                                >
                                    {loading ? '追加中...' : '追加'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Master Selection Mode */}
                    {mode === 'master' && (
                        <div className={styles.masterPanel}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="学籍番号、名前、クラスで検索..."
                                className={styles.searchInput}
                            />
                            <div className={styles.studentList}>
                                {filteredMasterStudents.slice(0, 20).map(student => (
                                    <label key={student.student_id_text} className={styles.studentItem}>
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.includes(student.email)}
                                            onChange={() => toggleStudentSelection(student.email)}
                                        />
                                        <span className={styles.studentId}>{student.student_id_text}</span>
                                        <span className={styles.studentName}>{student.full_name}</span>
                                        <span className={styles.studentClass}>{student.class_name}</span>
                                    </label>
                                ))}
                                {filteredMasterStudents.length > 20 && (
                                    <p className={styles.moreHint}>他 {filteredMasterStudents.length - 20} 件...</p>
                                )}
                            </div>
                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAdd(false)
                                        setError('')
                                        setSelectedStudents([])
                                    }}
                                    className={styles.cancelBtn}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddFromMaster}
                                    disabled={loading || selectedStudents.length === 0}
                                    className={styles.submitBtn}
                                >
                                    {loading ? '追加中...' : `${selectedStudents.length}名を追加`}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Bulk Add Mode */}
                    {mode === 'bulk' && (
                        <div className={styles.bulkPanel}>
                            <p className={styles.bulkInfo}>
                                クラス「{className}」のマスター登録学生を一括で追加します。
                                <br />
                                <strong>対象: {classStudents.length}名</strong>
                            </p>
                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAdd(false)
                                        setError('')
                                    }}
                                    className={styles.cancelBtn}
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkAddByClass}
                                    disabled={loading || classStudents.length === 0}
                                    className={styles.submitBtn}
                                >
                                    {loading ? '追加中...' : '一括追加'}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <p className={styles.error}>{error}</p>}
                    {success && <p className={styles.success}>{success}</p>}
                </div>
            )}

            {members.length > 0 && (
                <div className={styles.memberActions}>
                    {members.map(member => (
                        <div key={member.id} className={styles.memberAction}>
                            <span>{member.user?.full_name}</span>
                            <button
                                onClick={() => handleRemoveMember(member.id)}
                                className={styles.removeBtn}
                            >
                                削除
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
