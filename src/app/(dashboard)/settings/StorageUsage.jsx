import styles from './StorageUsage.module.css';

const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function StorageUsage({ imageKit, supabase }) {
    return (
        <div className={styles.container}>
            {/* ImageKit Card */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.iconWrapper} style={{ backgroundColor: '#0052FF' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    <div>
                        <h3 className={styles.cardTitle}>ImageKit (Main)</h3>
                        <p className={styles.cardSubtitle}>画像・動画・教材用</p>
                    </div>
                </div>

                <div className={styles.usageInfo}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{
                                width: `${imageKit.percent || 0}%`,
                                background: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                            }}
                        />
                    </div>
                    <div className={styles.stats}>
                        <span className={styles.percentage}>{imageKit.percent || 0}% 使用中</span>
                        <span className={styles.raw}>
                            {formatSize(imageKit.used || 0)} / {formatSize(imageKit.limit || (20 * 1024 * 1024 * 1024))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Supabase Card */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.iconWrapper} style={{ backgroundColor: '#22c55e' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                            <line x1="10" y1="3" x2="10" y2="10" />
                        </svg>
                    </div>
                    <div>
                        <h3 className={styles.cardTitle}>Supabase Storage</h3>
                        <p className={styles.cardSubtitle}>レガシー・システム用</p>
                    </div>
                </div>

                <div className={styles.usageInfo}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{
                                width: `${supabase.percent}%`,
                                background: 'linear-gradient(90deg, #22c55e, #4ade80)'
                            }}
                        />
                    </div>
                    <div className={styles.stats}>
                        <span className={styles.percentage}>{supabase.percent}% 使用中</span>
                        <span className={styles.raw}>
                            {formatSize(supabase.used)} / {formatSize(supabase.limit)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
