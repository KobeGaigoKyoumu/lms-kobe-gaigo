'use client'

import Link from 'next/link'
import styles from './StudentList.module.css'

export default function StudentList({ students }) {
    // Curated gradient palettes for avatars
    const avatarGradients = [
        'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', // Indigo
        'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)', // Pink/Purple
        'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', // Cyan
        'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald
        'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Amber
        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // Red
    ];

    const getAvatarStyle = (seed) => {
        const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatarGradients.length;
        return { background: avatarGradients[index] };
    };

    return (
        <div className={styles.listContainer}>
            <div className={styles.header}>
                <h3 className={styles.headerTitle}>学生一覧</h3>
                <span className={styles.studentCount}>{students.length} 名</span>
            </div>

            <div className={styles.list}>
                {students.map(student => (
                    <Link
                        key={student.student_id_text}
                        href={`/communication/${student.student_id_text}`}
                        className={styles.studentItem}
                    >
                        <div className={styles.avatar} style={getAvatarStyle(student.student_id_text)}>
                            {student.name.charAt(0)}
                        </div>
                        <div className={styles.info}>
                            <div className={styles.topRow}>
                                <span className={styles.name}>{student.name}</span>
                                <span className={styles.className}>{student.class_name || 'クラス不明'}</span>
                            </div>
                            <div className={styles.bottomRow}>
                                <span className={styles.lastMessage}>
                                    {student.last_message || 'メッセージはありません'}
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
