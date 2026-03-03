import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import Link from 'next/link'
import styles from './page.module.css'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export default async function NewClassPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()

    // 権限チェック
    let isAllowed = !!adminMember
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isAllowed = profile?.role === 'teacher' || profile?.role === 'admin'
    }

    if (!isAllowed) {
        redirect('/classes')
    }

    // コース一覧取得（紐付け用）
    const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .order('title')

    // 教師一覧取得
    const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['teacher', 'admin'])
        .order('full_name')

    async function createClass(formData) {
        'use server'

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
            .from('classes')
            .insert({
                name: formData.get('name'),
                description: formData.get('description') || null,
                grade_level: formData.get('grade_level') || null,
                academic_year: parseInt(formData.get('academic_year')) || new Date().getFullYear(),
                course_id: formData.get('course_id') || null,
                teacher_id: formData.get('teacher_id') || user?.id,
                homeroom_teacher_name: formData.get('homeroom_teacher_name') || null
            })

        if (error) {
            console.error(error)
            return
        }

        redirect('/classes')
    }

    const currentYear = new Date().getFullYear()
    const years = [currentYear - 1, currentYear, currentYear + 1]

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.breadcrumb}>
                    <Link href="/classes">クラス</Link>
                    <span>/</span>
                    <span>新規作成</span>
                </div>
                <h1 className={styles.title}>新規クラス作成</h1>
            </header>

            <form action={createClass} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="name">クラス名 *</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        placeholder="例: 1年A組"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="description">説明</label>
                    <textarea
                        id="description"
                        name="description"
                        rows={3}
                        placeholder="クラスの説明..."
                    />
                </div>

                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="grade_level">レベル</label>
                        <select id="grade_level" name="grade_level">
                            <option value="">未設定</option>
                            <option value="初級">初級</option>
                            <option value="中級">中級</option>
                            <option value="上級">上級</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="academic_year">年度</label>
                        <select id="academic_year" name="academic_year" defaultValue={currentYear}>
                            {years.map(year => (
                                <option key={year} value={year}>{year}年度</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="course_id">紐付けるコース</label>
                    <select id="course_id" name="course_id">
                        <option value="">なし</option>
                        {courses?.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="teacher_id">担任教師（システム連携） *</label>
                    <select id="teacher_id" name="teacher_id" required defaultValue={user?.id}>
                        {teachers?.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                        ))}
                    </select>
                    <p className={styles.helpText}>システム内のアカウントと紐付けます。</p>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="homeroom_teacher_name">担任教員</label>
                    <select id="homeroom_teacher_name" name="homeroom_teacher_name">
                        <option value="">未設定</option>
                        {teachers?.map(teacher => (
                            <option key={teacher.id} value={teacher.full_name}>{teacher.full_name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formActions}>
                    <Link href="/classes" className={styles.cancelBtn}>
                        キャンセル
                    </Link>
                    <button type="submit" className={styles.submitBtn}>
                        作成
                    </button>
                </div>
            </form>
        </div>
    )
}
