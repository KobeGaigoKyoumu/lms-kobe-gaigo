
import styles from './page.module.css'

export default function Loading() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className="skeleton" style={{ width: '200px', height: '32px', background: '#eee', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '100px', height: '40px', background: '#eee', borderRadius: '4px' }}></div>
            </div>

            <div className={styles.content}>
                <div className={styles.listWrapper}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} style={{
                                display: 'flex',
                                padding: '16px',
                                borderBottom: '1px solid #f0f0f0',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eee' }}></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ width: '120px', height: '16px', background: '#eee', marginBottom: '8px' }}></div>
                                    <div style={{ width: '200px', height: '12px', background: '#f9f9f9' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
