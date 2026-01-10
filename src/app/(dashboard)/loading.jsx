import styles from './page.module.css'

export default function DashboardLoading() {
    return (
        <div className={styles.page}>
            {/* ヘッダースケルトン */}
            <header className={styles.header}>
                <div>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonSubtitle}></div>
                </div>
                <div className={styles.skeletonDate}></div>
            </header>

            {/* 統計カードスケルトン */}
            <div className={styles.statsGrid}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={styles.statCardSkeleton}>
                        <div className={styles.skeletonIcon}></div>
                        <div className={styles.skeletonContent}>
                            <div className={styles.skeletonLabel}></div>
                            <div className={styles.skeletonValue}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* メインコンテンツスケルトン */}
            <div className={styles.mainGrid}>
                <section className={styles.section}>
                    <div className={styles.skeletonSectionTitle}></div>
                    <div className={styles.skeletonList}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={styles.skeletonItem}></div>
                        ))}
                    </div>
                </section>
                <section className={styles.section}>
                    <div className={styles.skeletonSectionTitle}></div>
                    <div className={styles.skeletonList}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={styles.skeletonItem}></div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
