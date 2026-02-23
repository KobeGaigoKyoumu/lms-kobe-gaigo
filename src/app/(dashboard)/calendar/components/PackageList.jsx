'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from '../page.module.css'

export default function PackageList({ onApplyPackage, onUnapplyPackage, onEditPackage, refreshTrigger }) {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [classes, setClasses] = useState([])
    const [applyingPkgId, setApplyingPkgId] = useState(null)
    const [selectedClasses, setSelectedClasses] = useState([])
    const [appliedClasses, setAppliedClasses] = useState({}) // { packageId: ['classA', 'classB'] }

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
            // 各パッケージの適用済みクラスを取得
            await fetchAppliedClasses(data.map(p => p.id))
        } else {
            console.error(error)
        }
        setLoading(false)
    }

    const fetchAppliedClasses = async (packageIds) => {
        if (!packageIds || packageIds.length === 0) return
        const supabase = createClient()
        const { data } = await supabase
            .from('calendar_events')
            .select('package_id, target_class')
            .in('package_id', packageIds)
            .not('target_class', 'is', null)

        if (data) {
            const map = {}
            data.forEach(evt => {
                if (!evt.package_id || !evt.target_class) return
                if (!map[evt.package_id]) map[evt.package_id] = new Set()
                map[evt.package_id].add(evt.target_class)
            })
            // Convert Sets to arrays
            const result = {}
            Object.keys(map).forEach(pid => {
                result[pid] = [...map[pid]].sort()
            })
            setAppliedClasses(result)
        }
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

    const handleUnapply = async (packageId, targetClass) => {
        await onUnapplyPackage(packageId, targetClass)
        // 適用済みクラス一覧を更新
        setAppliedClasses(prev => {
            const updated = { ...prev }
            if (updated[packageId]) {
                updated[packageId] = updated[packageId].filter(c => c !== targetClass)
                if (updated[packageId].length === 0) delete updated[packageId]
            }
            return updated
        })
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

                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>
                                イベント数: {pkg.events?.length || 0}件
                            </div>

                            {/* 適用済みクラス表示 */}
                            {appliedClasses[pkg.id] && appliedClasses[pkg.id].length > 0 && (
                                <div style={{ marginBottom: '12px', padding: '8px 10px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#166534', marginBottom: '6px' }}>
                                        適用済みクラス:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {appliedClasses[pkg.id].map(cls => (
                                            <div
                                                key={cls}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '3px 10px', borderRadius: '20px',
                                                    background: '#dcfce7', border: '1px solid #86efac',
                                                    fontSize: '0.8rem', color: '#166534'
                                                }}
                                            >
                                                <span>{cls}</span>
                                                <button
                                                    onClick={() => handleUnapply(pkg.id, cls)}
                                                    style={{
                                                        background: 'none', border: 'none', color: '#dc2626',
                                                        cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700',
                                                        padding: '0 2px', lineHeight: '1'
                                                    }}
                                                    title={`${cls} の適用を解除`}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
