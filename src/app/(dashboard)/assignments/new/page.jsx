'use client'

import { useState } from 'react'
import { createAssignment } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import styles from './page.module.css'

export default function NewAssignmentPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (formData) => {
        setLoading(true)
        const result = await createAssignment(formData)

        if (result.error) {
            alert(result.error)
            setLoading(false)
        } else {
            alert('課題を作成しました')
            router.push('/assignments')
            router.refresh()
        }
    }

    return (
        <div className={styles.container}>
            <Link href="/assignments" className={styles.backLink}>
                <ChevronLeft size={16} />
                一覧に戻る
            </Link>

            <h1 className={styles.title}>新規課題作成</h1>

            <form action={handleSubmit} className={styles.form}>

                <div className={styles.formGroup}>
                    <label className={styles.label}>タイトル <span className={styles.required}>*</span></label>
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
                        <label className={styles.label}>対象クラス <span className={styles.required}>*</span></label>
                        <input
                            name="className"
                            type="text"
                            required
                            className={styles.input}
                            placeholder="例: 2-1"
                        />
                        <p className={styles.hint}>※ 正確なクラス名を入力してください</p>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>提出期限 <span className={styles.required}>*</span></label>
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
        </div>
    )
}
