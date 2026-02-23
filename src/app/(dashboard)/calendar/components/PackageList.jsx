'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../page.module.css'

export default function PackageList({ onApplyPackage, onEditPackage, refreshTrigger }) {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [classes, setClasses] = useState([])
    const [applyingPkgId, setApplyingPkgId] = useState(null)
    const [selectedClasses, setSelectedClasses] = useState([])

    useEffect(() => {
        fetchPackages()
        fetchClasses()
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

    const fetchClasses = async () => {
        const supabase = createClient()
        const { data } = await supabase
            .from('students')
            .select('class_name')
            .not('class_name', 'is', null)
            .order('class_name')
        const unique = [...new Set(data?.map(s => s.class_name))].filter(Boolean)
        setClasses(unique)
    }

    const handleApplyClick = (pkg) => {
        if (applyingPkgId === pkg.id) {
            setApplyingPkgId(null)
            setSelectedClasses([])
        } else {
            setApplyingPkgId(pkg.id)
            setSelectedClasses([])
        }
    }

    const toggleClass = (cls) => {
        setSelectedClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
        )
    }

    const handleConfirmApply = (pkg) => {
        if (selectedClasses.length === 0) {
            alert('適用するクラスを1つ以上選択してください')
            return
        }
        onApplyPackage(pkg, selectedClasses)
        setApplyingPkgId(null)
        setSelectedClasses([])
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
                                <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '6px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
                                        適用するクラスを選択（複数可）:
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                        {classes.map(cls => (
                                            <button
                                                key={cls}
                                                type="button"
                                                onClick={() => toggleClass(cls)}
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: '20px',
                                                    border: '1.5px solid',
                                                    borderColor: selectedClasses.includes(cls) ? '#3b82f6' : '#d1d5db',
                                                    background: selectedClasses.includes(cls) ? '#dbeafe' : 'white',
                                                    color: selectedClasses.includes(cls) ? '#1d4ed8' : '#374151',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem',
                                                    fontWeight: selectedClasses.includes(cls) ? '600' : '400',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                {cls}
                                            </button>
                                        ))}
                                        {classes.length === 0 && (
                                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>クラスが見つかりません</span>
                                        )}
                                    </div>
                                    {selectedClasses.length > 0 && (
                                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>
                                            選択中: {selectedClasses.join(', ')}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setApplyingPkgId(null); setSelectedClasses([]) }}
                                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            onClick={() => handleConfirmApply(pkg)}
                                            disabled={selectedClasses.length === 0}
                                            style={{
                                                padding: '6px 16px', borderRadius: '4px', border: 'none',
                                                background: selectedClasses.length > 0 ? '#3b82f6' : '#93c5fd',
                                                color: 'white', cursor: selectedClasses.length > 0 ? 'pointer' : 'default',
                                                fontSize: '0.85rem', fontWeight: '500'
                                            }}
                                        >
                                            確定（{selectedClasses.length}クラス）
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
