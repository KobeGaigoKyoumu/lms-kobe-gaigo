'use client'

import { useState, useEffect } from 'react'
import { getEventPackages, getAppliedClassesForPackages, getTermsForPackages } from '@/app/actions/calendar'
import styles from '../page.module.css'

export default function PackageList({ onApplyPackage, onUnapplyPackage, onEditPackage, refreshTrigger }) {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [terms, setTerms] = useState([])
    const [applyingPkgId, setApplyingPkgId] = useState(null)
    const [selectedClasses, setSelectedClasses] = useState([])
    const [appliedClasses, setAppliedClasses] = useState({}) // { packageId: ['classA', 'classB'] }

    useEffect(() => {
        fetchPackages()
        fetchClasses()
    }, [refreshTrigger])

    const fetchPackages = async () => {
        setLoading(true)
        const { data, error } = await getEventPackages()

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
        const { data } = await getAppliedClassesForPackages(packageIds)

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
        const { data } = await getTermsForPackages()
        if (data) setTerms(data)
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
            alert('適用する入学期を1つ以上選択してください')
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
                                        適用済み入学期:
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
                                                <span>{cls.startsWith('term:') ? cls.replace('term:', '') : cls}</span>
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
                                    {terms.length > 0 && (
                                        <>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '600', marginTop: '12px' }}>
                                                適用する入学期を選択（複数可）:
                                            </label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                                {terms.map(term => {
                                                    const termVal = `term:${term}`
                                                    return (
                                                        <button
                                                            key={termVal}
                                                            type="button"
                                                            onClick={() => toggleClass(termVal)}
                                                            style={{
                                                                padding: '5px 12px',
                                                                borderRadius: '20px',
                                                                border: '1.5px solid',
                                                                borderColor: selectedClasses.includes(termVal) ? '#10b981' : '#d1d5db',
                                                                background: selectedClasses.includes(termVal) ? '#d1fae5' : 'white',
                                                                color: selectedClasses.includes(termVal) ? '#047857' : '#374151',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                fontWeight: selectedClasses.includes(termVal) ? '600' : '400',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            {term}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {selectedClasses.length > 0 && (
                                        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>
                                            選択中: {selectedClasses.map(c => c.startsWith('term:') ? c.replace('term:', '') : c).join(', ')}
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
                                            確定（{selectedClasses.length}期）
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
