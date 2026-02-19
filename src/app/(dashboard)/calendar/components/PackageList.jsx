'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../page.module.css'

export default function PackageList({ onApplyPackage, onEditPackage, refreshTrigger }) {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [applyingPkgId, setApplyingPkgId] = useState(null)
    const [targetYear, setTargetYear] = useState(new Date().getFullYear())

    useEffect(() => {
        fetchPackages()
    }, [refreshTrigger])

    const fetchPackages = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('event_packages')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) {
            setPackages(data)
        } else {
            console.error(error)
        }
        setLoading(false)
    }

    const handleApplyClick = (pkg) => {
        if (applyingPkgId === pkg.id) {
            setApplyingPkgId(null)
        } else {
            setApplyingPkgId(pkg.id)
            setTargetYear(new Date().getFullYear())
        }
    }

    const handleConfirmApply = (pkg) => {
        if (!targetYear) return
        onApplyPackage(pkg, targetYear)
        setApplyingPkgId(null)
    }

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>読み込み中...</div>

    return (
        <div className={styles.packageListContainer} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#111827' }}>パッケージ一覧</h3>

            {packages.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
                    登録されたパッケージはありません
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {packages.map(pkg => (
                        <div key={pkg.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <h4 style={{ margin: '0', fontSize: '1rem', fontWeight: '600' }}>{pkg.title}</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => onEditPackage(pkg)}
                                        style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.9rem' }}
                                    >
                                        編集
                                    </button>
                                </div>
                            </div>

                            {pkg.description && (
                                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#6b7280' }}>{pkg.description}</p>
                            )}

                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '12px' }}>
                                イベント数: {pkg.events?.length || 0}件
                            </div>

                            {applyingPkgId === pkg.id ? (
                                <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '6px' }}>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>適用する年（西暦）:</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={targetYear}
                                            onChange={(e) => setTargetYear(parseInt(e.target.value))}
                                            min="2000"
                                            max="2100"
                                            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', flexGrow: 1 }}
                                        />
                                        <button
                                            onClick={() => handleConfirmApply(pkg)}
                                            disabled={!targetYear}
                                            style={{
                                                background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '0 12px', cursor: 'pointer',
                                                opacity: !targetYear ? 0.5 : 1
                                            }}
                                        >
                                            確定
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleApplyClick(pkg)}
                                    style={{
                                        width: '100%', padding: '8px', background: 'white', border: '1px solid #3b82f6', color: '#3b82f6',
                                        borderRadius: '6px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#eff6ff' }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
                                >
                                    カレンダーに適用
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
