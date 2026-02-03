'use client'

import Link from 'next/link'
import styles from './StudentList.module.css'

export default function StudentList({ students }) {
    // students is expected to be an array of: 
    // { student_id_text, name, class_name, last_message, unread_count }

    return (
        <div className={styles.listContainer}>
            <div className={styles.header}>
                <h3>学生一覧</h3>
                {/* Could add search filter here later */}
            </div>

            <div className={styles.list}>
                {students.map(student => (
                    <Link
                        key={student.student_id_text}
                        href={`/communication/${student.student_id_text}`}
                        className={styles.studentItem}
                    >
                        <div className={styles.avatar}>
                            {student.name.charAt(0)}
                        </div>
                        <div className={styles.info}>
                            <div className={styles.topRow}>
                                <span className={styles.name}>{student.name}</span>
                                <span className={styles.className}>{student.class_name}</span>
                            </div>
                            <div className={styles.bottomRow}>
                                <span className={styles.lastMessage}>
                                    {student.last_message || 'メッセージなし'}
                                </span>
                            </div>
                        </div>
                        {student.unread_count > 0 && (
                            <div className={styles.badge}>
                                {student.unread_count}
                            </div>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    )
}
