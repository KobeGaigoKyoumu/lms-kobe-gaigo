'use client'

import { useState, useEffect } from 'react'
import { createAssignment } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Copy, ExternalLink, Plus } from 'lucide-react'
import Link from 'next/link'
import styles from '@/app/(dashboard)/assignments/new/page.module.css'

export default function AssignmentForm({ classes = [] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [createdAssignmentIds, setCreatedAssignmentIds] = useState(null)
    const [origin, setOrigin] = useState('')

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    const handleSubmit = async (formData) => {
        setLoading(true)
        
        const classNames = formData.getAll('classNames')
        if (!classNames || classNames.length === 0) {
            alert('少なくとも1つのクラスを選択してください')
            setLoading(false)
            return
        }

        const result = await createAssignment(formData)

        if (result.error) {
            alert(result.error)
            setLoading(false)
        } else {
            setCreatedAssignmentIds(result.ids)
            setLoading(false)
            router.refresh()
        }
    }

    if (createdAssignmentIds && createdAssignmentIds.length > 0) {
        return (
            <div className={styles.successContainer}>
                <div className={styles.successIcon}>
                    <Check size={32} />
                </div>
                <h2 className={styles.successTitle}>課題を作成しました！</h2>

                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    選択した{createdAssignmentIds.length}クラスへの課題割り当てが完了しました。<br/>
                    学生は自身のダッシュボードから課題を確認・提出できます。
                </p>

                <div className={styles.successActions}>
                    <button
                        onClick={() => setCreatedAssignmentIds(null)}
                        className={styles.secondaryButton}
                    >
                        <Plus size={18} />
                        別の課題を作成
                    </button>
                    <Link href="/assignments" className={styles.primaryButtonFull}>
                        <ExternalLink size={18} />
                        課題一覧へ移動
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <form action={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label className={styles.label}>
                    タイトル <span className={styles.required}>*</span>
                </label>
                <input
                    name="title"
                    type="text"
                    required
                    className={styles.input}
                    placeholder="例: 第1回 レポート課題"
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>説明文</label>
                <textarea
                    name="description"
                    rows="5"
                    className={styles.textarea}
                    placeholder="課題の内容や注意事項を入力してください"
                />
            </div>

            <div className={styles.formGroup}>
                <label className={styles.label}>
                    対象クラス <span className={styles.required}>*</span>
                    <span className={styles.hint}>（複数選択可）</span>
                </label>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '0.75rem',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    maxHeight: '240px',
                    overflowY: 'auto'
                }}>
                    {classes.length > 0 ? (
                        classes.map(c => (
                            <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="classNames"
                                    value={c.name || c.class_name}
                                    style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)', userSelect: 'none' }}>
                                    {c.name || c.class_name}
                                </span>
                            </label>
                        ))
                    ) : (
                        <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                            クラスが見つかりません
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        提出期限 <span className={styles.required}>*</span>
                    </label>
                    <input
                        name="deadline"
                        type="datetime-local"
                        required
                        className={styles.input}
                    />
                </div>
            </div>

            <div className={styles.actions}>
                <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitButton}
                >
                    {loading && <Loader2 className="animate-spin" size={18} />}
                    {loading ? '作成中...' : '課題を作成する'}
                </button>
            </div>
        </form>
    )
}
