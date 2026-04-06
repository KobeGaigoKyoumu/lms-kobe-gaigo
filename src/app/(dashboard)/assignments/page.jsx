import { getTeacherAssignments, getClassesList } from '@/app/actions/homework'

import Link from 'next/link'
import styles from './page.module.css'
import { Plus } from 'lucide-react'



export const dynamic = 'force-dynamic'

export default async function AssignmentsPage() {
    const [assignments, classes] = await Promise.all([
        getTeacherAssignments(),
        getClassesList()
    ])

    // Initialize stats with all classes
    const classStats = classes.reduce((acc, cls) => {
        acc[cls.name] = {
            name: cls.name,
            count: 0,
            activeCount: 0
        }
        return acc
    }, {})

    // Update stats based on assignments
    assignments.forEach(assignment => {
        const className = assignment.class_name || '未分類'
        if (!classStats[className]) {
            classStats[className] = {
                name: className,
                count: 0,
                activeCount: 0
            }
        }
        classStats[className].count++
        if (!assignment.deadline || new Date(assignment.deadline) >= new Date()) {
            classStats[className].activeCount++
        }
    })

    // Sort classes
    const sortedClasses = Object.values(classStats).sort((a, b) => a.name.localeCompare(b.name))

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>課題管理</h1>
                    <p className={styles.subtitle}>クラスを選択して課題を確認・作成します</p>
                </div>
                {/* Note: New Assignment button might need to ask for class first or stay here */}
                <Link href="/assignments/new" className={styles.createButton}>
                    <Plus size={20} />
                    新規課題作成
                </Link>
            </header>

            {sortedClasses.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>課題はまだ作成されていません</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {sortedClasses.map(cls => (
                        <Link
                            key={cls.name}
                            href={`/assignments/class/${encodeURIComponent(cls.name)}`}
                            className={styles.classCard}
                        >
                            <div className={styles.classInfo}>
                                <h2 className={styles.className}>{cls.name}</h2>
                                <p className={styles.classMeta}>{cls.count}件の課題</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
