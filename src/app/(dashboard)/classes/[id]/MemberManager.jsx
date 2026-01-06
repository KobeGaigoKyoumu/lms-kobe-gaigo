'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function MemberManager({ classId, members }) {
    const router = useRouter()
    const [showAdd, setShowAdd] = useState(false)
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleAddMember = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

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

    const handleRemoveMember = async (memberId) => {
        if (!confirm('このメンバーをクラスから削除しますか？')) return

        const supabase = createClient()
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
                    {error && <p className={styles.error}>{error}</p>}
                </form>
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
