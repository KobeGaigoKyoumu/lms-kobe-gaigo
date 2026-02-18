
import styles from './page.module.css'

export default function Loading() {
    return (
        <div className={styles.loadingContainer}>
            <div className="skeleton" style={{ width: '120px', height: '24px', marginBottom: '20px', background: '#eee', borderRadius: '4px' }}></div>

            <div className={styles.header}>
                <div className="skeleton" style={{ width: '250px', height: '36px', background: '#eee', borderRadius: '4px' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton" style={{
                        width: '100%',
                        height: '120px',
                        background: '#fff',
                        border: '1px solid #eee',
                        borderRadius: '8px',
                        padding: '16px'
                    }}>
                        <div style={{ width: '60%', height: '24px', background: '#f0f0f0', marginBottom: '12px' }}></div>
                        <div style={{ width: '40%', height: '16px', background: '#f9f9f9' }}></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
