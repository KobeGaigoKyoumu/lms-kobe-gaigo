import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'

// 24時間キャッシュ（ISR）
export const revalidate = 86400

export default async function GradesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // プロファイル取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

    const isStudent = profile?.role === 'student'
    const isTeacher = profile?.role === 'teacher'

    // 学生の場合: 自分の成績を取得
    let grades = []
    if (isStudent) {
        const { data } = await supabase
            .from('submissions')
            .select(`
        *,
        assignment:assignments (
          id,
          title,
          max_score,
          course:courses (
            id,
            title
          )
        )
      `)
            .eq('student_id', user?.id)
            .eq('status', 'graded')
            .order('graded_at', { ascending: false })
        grades = data || []
    }

    // 教師の場合: 担当コースの課題を取得
    let teacherCourses = []
    if (isTeacher) {
        const { data } = await supabase
            .from('courses')
            .select(`
        id,
        title,
        assignments (
          id,
          title,
          max_score,
          submissions (
            id,
            score,
            status
          )
        )
      `)
            .eq('teacher_id', user?.id)
        teacherCourses = data || []
    }

    // 統計計算（学生用）
    const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0)
    const totalMaxScore = grades.reduce((sum, g) => sum + (g.assignment?.max_score || 0), 0)
    const averagePercent = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>成績</h1>
                <p className={styles.subtitle}>
                    {isStudent ? '課題の成績一覧' : '担当コースの成績管理'}
                </p>
            </header>

            {/* 学生用表示 */}
            {isStudent && (
                <>
                    <div className={styles.stats}>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{grades.length}</span>
                            <span className={styles.statLabel}>採点済み課題</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{totalScore}/{totalMaxScore}</span>
                            <span className={styles.statLabel}>合計得点</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={`${styles.statValue} ${styles.highlight}`}>{averagePercent}%</span>
                            <span className={styles.statLabel}>平均スコア</span>
                        </div>
                    </div>

                    {grades.length === 0 ? (
                        <div className={styles.empty}>
                            <p>まだ採点された課題がありません</p>
                        </div>
                    ) : (
                        <div className={styles.gradeList}>
                            {grades.map(grade => (
                                <div key={grade.id} className={styles.gradeCard}>
                                    <div className={styles.gradeInfo}>
                                        <h3>{grade.assignment?.title}</h3>
                                        <p>{grade.assignment?.course?.title}</p>
                                    </div>
                                    <div className={styles.gradeScore}>
                                        <span className={styles.score}>{grade.score}</span>
                                        <span className={styles.maxScore}>/{grade.assignment?.max_score}</span>
                                        <span className={styles.percent}>
                                            ({Math.round((grade.score / grade.assignment?.max_score) * 100)}%)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* 教師用表示 */}
            {isTeacher && (
                <div className={styles.courseList}>
                    {teacherCourses.length === 0 ? (
                        <div className={styles.empty}>
                            <p>担当コースがありません</p>
                        </div>
                    ) : (
                        teacherCourses.map(course => (
                            <div key={course.id} className={styles.courseCard}>
                                <h3>{course.title}</h3>
                                <div className={styles.assignmentStats}>
                                    {course.assignments?.map(assignment => {
                                        const submitted = assignment.submissions?.filter(s => s.status === 'submitted').length || 0
                                        const graded = assignment.submissions?.filter(s => s.status === 'graded').length || 0
                                        return (
                                            <div key={assignment.id} className={styles.assignmentRow}>
                                                <span>{assignment.title}</span>
                                                <div className={styles.progressInfo}>
                                                    <span>提出: {submitted + graded}</span>
                                                    <span>採点済: {graded}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {(!course.assignments || course.assignments.length === 0) && (
                                        <p className={styles.noAssignments}>課題がありません</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
