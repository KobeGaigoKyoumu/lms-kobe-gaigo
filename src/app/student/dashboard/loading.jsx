
import styles from './page.module.css'

export default function Loading() {
    return (
        <div className={styles.loadingContainer}>
            <div className={styles.header}>
                <div className="skeleton" style={{ width: '200px', height: '32px', background: '#eee', borderRadius: '4px' }}></div>
            </div>

            <div className={styles.grid}>
                {/* Schedule Skeleton */}
                <div className={styles.scheduleCard}>
                    <div className="skeleton" style={{ width: '150px', height: '24px', marginBottom: '16px', background: '#eee' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="skeleton" style={{ width: '100%', height: '60px', background: '#f5f5f5', borderRadius: '8px' }}></div>
                        ))}
                    </div>
                </div>

                {/* Assignments Skeleton */}
                <div className={styles.homeworkCard}>
                    <div className="skeleton" style={{ width: '150px', height: '24px', marginBottom: '16px', background: '#eee' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton" style={{ width: '100%', height: '80px', background: '#f5f5f5', borderRadius: '8px' }}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
