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
        </div>
    )
}
