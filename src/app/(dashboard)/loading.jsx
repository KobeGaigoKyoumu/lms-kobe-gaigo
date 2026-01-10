import styles from './loading.module.css'

export default function DashboardLoading() {
    return (
        <div className={styles.loadingContainer}>
            {/* メインローディングインジケーター */}
            <div className={styles.loaderWrapper}>
                <div className={styles.loader}>
                    <div className={styles.loaderRing}></div>
                    <div className={styles.loaderRing}></div>
                    <div className={styles.loaderRing}></div>
                    <div className={styles.loaderCore}></div>
                </div>
                <div className={styles.loaderText}>
                    <span>読み込み中</span>
                    <span className={styles.dots}>
                        <span>.</span><span>.</span><span>.</span>
                    </span>
                </div>
            </div>

            {/* 背景のスケルトン（ぼかし効果付き） */}
            <div className={styles.skeletonBackground}>
                <div className={styles.skeletonHeader}>
                    <div className={styles.skeletonTitle}></div>
                    <div className={styles.skeletonSubtitle}></div>
                </div>

                <div className={styles.skeletonCards}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className={styles.skeletonCardIcon}></div>
                            <div className={styles.skeletonCardContent}>
                                <div className={styles.skeletonCardLabel}></div>
                                <div className={styles.skeletonCardValue}></div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.skeletonSections}>
                    <div className={styles.skeletonSection}>
                        <div className={styles.skeletonSectionHeader}></div>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={styles.skeletonRow} style={{ animationDelay: `${i * 0.15}s` }}></div>
                        ))}
                    </div>
                    <div className={styles.skeletonSection}>
                        <div className={styles.skeletonSectionHeader}></div>
                        {[1, 2, 3].map(i => (
                            <div key={i} className={styles.skeletonRow} style={{ animationDelay: `${i * 0.15}s` }}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
