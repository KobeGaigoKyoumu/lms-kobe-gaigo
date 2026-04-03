'use client'

import { createClient } from '@/lib/supabase/client'
import { toCDNUrl } from '@/lib/utils'
import styles from './page.module.css'

export default function ProfileForm({ profile, user }) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [formData, setFormData] = useState({
        full_name: profile?.full_name || user?.user_metadata?.full_name || '',
        full_name_kana: profile?.full_name_kana || '',
        phone: profile?.phone || '',
        student_id: profile?.student_id || '',
    })

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const supabase = createClient()

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                ...formData,
                updated_at: new Date().toISOString()
            })

        if (error) {
            setMessage({ type: 'error', text: 'プロファイルの更新に失敗しました' })
            console.error(error)
        } else {
            setMessage({ type: 'success', text: 'プロファイルを更新しました' })
        }

        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {message && (
                <div className={`${styles.message} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                    {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                        <img
                            src={toCDNUrl(profile?.avatar_url || user?.user_metadata?.avatar_url)}
                            alt=""
                        />
                    ) : (
                        <span>{formData.full_name?.[0] || '?'}</span>
                    )}
                </div>
                <p className={styles.avatarNote}>
                    アバターは Google アカウントから自動取得されます
                </p>
            </div>

            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label htmlFor="full_name" className={styles.label}>氏名</label>
                    <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="山田 太郎"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="full_name_kana" className={styles.label}>氏名（フリガナ）</label>
                    <input
                        type="text"
                        id="full_name_kana"
                        name="full_name_kana"
                        value={formData.full_name_kana}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="ヤマダ タロウ"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="phone" className={styles.label}>電話番号</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="090-1234-5678"
                    />
                </div>

                {profile?.role === 'student' && (
                    <div className={styles.formGroup}>
                        <label htmlFor="student_id" className={styles.label}>学籍番号</label>
                        <input
                            type="text"
                            id="student_id"
                            name="student_id"
                            value={formData.student_id}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="2024001"
                        />
                    </div>
                )}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? '保存中...' : '変更を保存'}
            </button>
        </form>
    )
}
