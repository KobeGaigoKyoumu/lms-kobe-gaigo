import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import Link from 'next/link'
import styles from '../../new/page.module.css'

export default async function EditClassPage({ params }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // クラス取得
    const { data: classData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !classData) {
        notFound()
    }

    // 権限チェック
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isOwner = classData.teacher_id === user?.id
    const isAdmin = profile?.role === 'admin'

    if (!isOwner && !isAdmin) {
        redirect(`/classes/${id}`)
    }

    // コース一覧取得
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

    async function updateClass(formData) {
        'use server'

        const supabase = await createClient()

        const { error } = await supabase
            .from('classes')
            .update({
                name: formData.get('name'),
                description: formData.get('description') || null,
                grade_level: formData.get('grade_level') || null,
                academic_year: parseInt(formData.get('academic_year')) || new Date().getFullYear(),
                course_id: formData.get('course_id') || null,
                teacher_id: formData.get('teacher_id') || null,
                homeroom_teacher_name: formData.get('homeroom_teacher_name') || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) {
            console.error(error)
            return
        }

        redirect(`/classes/${id}`)
    }

    async function deleteClass() {
        'use server'

        const supabase = await createClient()
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id)

        if (error) {
            console.error(error)
            return
        }

        revalidateTag('classes')
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
                    <Link href={`/classes/${id}`}>{classData.name}</Link>
                    <span>/</span>
                    <span>編集</span>
                </div>
                <h1 className={styles.title}>クラス編集</h1>
            </header>

            <form action={updateClass} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="name">クラス名 *</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        defaultValue={classData.name}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="description">説明</label>
                    <textarea
                        id="description"
                        name="description"
                        rows={3}
                        defaultValue={classData.description || ''}
                    />
                </div>

                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label htmlFor="grade_level">レベル</label>
                        <select id="grade_level" name="grade_level" defaultValue={classData.grade_level || ''}>
                            <option value="">未設定</option>
                            <option value="初級">初級</option>
                            <option value="中級">中級</option>
                            <option value="上級">上級</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="academic_year">年度</label>
                        <select id="academic_year" name="academic_year" defaultValue={classData.academic_year}>
                            {years.map(year => (
                                <option key={year} value={year}>{year}年度</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="course_id">紐付けるコース</label>
                    <select id="course_id" name="course_id" defaultValue={classData.course_id || ''}>
                        <option value="">なし</option>
                        {courses?.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="teacher_id">担任教師（システム連携） *</label>
                    <select id="teacher_id" name="teacher_id" required defaultValue={classData.teacher_id}>
                        {teachers?.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                        ))}
                    </select>
                    <p className={styles.helpText}>システム内のアカウントと紐付けます。</p>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="homeroom_teacher_name">担任教師名（自由入力）</label>
                    <input
                        type="text"
                        id="homeroom_teacher_name"
                        name="homeroom_teacher_name"
                        defaultValue={classData.homeroom_teacher_name || ''}
                        placeholder="例: 佐藤 太郎（こちらが入力されている場合は優先表示されます）"
                    />
                </div>

                <div className={styles.formActions}>
                    <Link href={`/classes/${id}`} className={styles.cancelBtn}>
                        キャンセル
                    </Link>
                    <button type="submit" className={styles.submitBtn}>
                        更新
                    </button>
                </div>
            </form>

            <div className={styles.deleteSection}>
                <h3>危険なゾーン</h3>
                <p>クラスを削除すると、関連するメンバー情報や時間割も削除されます。</p>
                <form action={deleteClass}>
                    <button type="submit" className={styles.deleteBtn}>
                        クラスを削除
                    </button>
                </form>
            </div>
        </div>
    )
}
