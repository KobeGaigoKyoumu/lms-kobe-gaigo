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
    const [createdAssignmentId, setCreatedAssignmentId] = useState(null)
    const [copied, setCopied] = useState(false)
    const [origin, setOrigin] = useState('')

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    const handleCopy = () => {
        const url = `${origin}/student/homework/${createdAssignmentId}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSubmit = async (formData) => {
        setLoading(true)
        const result = await createAssignment(formData)

        if (result.error) {
            alert(result.error)
            setLoading(false)
        } else {
            setCreatedAssignmentId(result.id)
            setLoading(false)
            router.refresh()
        }
    }

    if (createdAssignmentId) {
        const studentUrl = `${origin}/student/homework/${createdAssignmentId}`

        return (
            <div className={styles.successContainer}>
                <div className={styles.successIcon}>
                    <Check size={32} />
                </div>
                <h2 className={styles.successTitle}>課題を作成しました！</h2>

                <div className={styles.linkBox}>
                    <label className={styles.linkLabel}>学生用提出ページURL</label>
                    <div className={styles.urlWrapper}>
                        <div className={styles.urlInput}>{studentUrl}</div>
                        <button
                            onClick={handleCopy}
                            className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'コピーしました' : 'コピー'}
                        </button>
                    </div>
                </div>

                <div className={styles.successActions}>
                    <button
                        onClick={() => setCreatedAssignmentId(null)}
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

            <div className={styles.row}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        対象クラス <span className={styles.required}>*</span>
                    </label>
                    <select
                        name="className"
                        required
                        className={styles.input}
                    >
                        <option value="">クラスを選択</option>
                        {classes.length > 0 ? (
                            classes.map(c => (
                                <option key={c.id} value={c.name || c.class_name}>
                                    {c.name || c.class_name}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>クラスが見つかりません</option>
                        )}
                    </select>
                </div>

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
