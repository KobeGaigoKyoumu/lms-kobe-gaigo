'use client'

import { useState } from 'react'
import { sendUnifiedBroadcast } from '@/actions/broadcast'
import { Send, Users, UserCheck, AlertCircle } from 'lucide-react'

export default function BroadcastForm({ classes }) {
    const [targetType, setTargetType] = useState('class') // 'all', 'class'
    const [targetValue, setTargetValue] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!message) return
        if (targetType === 'class' && !targetValue) return

        setLoading(true)
        setResult(null)

        const res = await sendUnifiedBroadcast(message, targetType, targetValue, ['webpush'])
        setLoading(false)
        setResult(res)

        if (res.success) {
            setMessage('')
        }
    }

    return (
        <div style={{ maxWidth: '600px', backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Target Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} />
                        送信先
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setTargetType('class')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: targetType === 'class' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                backgroundColor: targetType === 'class' ? '#eff6ff' : 'white',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: targetType === 'class' ? 'bold' : 'normal'
                            }}
                        >
                            クラス指定
                        </button>
                        <button
                            type="button"
                            onClick={() => setTargetType('all')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: targetType === 'all' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                backgroundColor: targetType === 'all' ? '#eff6ff' : 'white',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: targetType === 'all' ? 'bold' : 'normal'
                            }}
                        >
                            全員
                        </button>
                    </div>

                    {targetType === 'class' && (
                        <select
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            style={{
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                marginTop: '4px'
                            }}
                            required
                        >
                            <option value="">クラスを選択</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.name}>{cls.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Message Input */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontWeight: '500' }}>メッセージ内容</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="送信するメッセージを入力してください..."
                        rows={6}
                        style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                        }}
                        required
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Send size={18} />
                    {loading ? '送信中...' : '送信する'}
                </button>

            </form>

            {/* Result Feedback */}
            {result && (
                <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: result.success ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
                    color: result.success ? '#166534' : '#991b1b'
                }}>
                    {result.success ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                <UserCheck size={20} />
                                送信完了
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                送信数: <strong>{result.count}</strong> 件
                                {result.failed > 0 && <span style={{ marginLeft: '12px', color: '#dc2626', fontWeight: 'bold' }}>失敗: {result.failed} 件</span>}
                            </div>
                            {result.count === 0 && result.failed === 0 && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                                    ※ プッシュ通知が登録されている対象学生がいませんでした。
                                </p>
                            )}

                            {/* 設定しているのに届かなかった学生 */}
                            {result.failedStudents && result.failedStudents.length > 0 && (
                                <div style={{ marginTop: '12px', borderTop: '1px dashed #bbf7d0', paddingTop: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                                        ⚠️ 設定しているのに届かなかった学生 ({result.failedStudents.length}人):
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {result.failedStudents.map((name, i) => (
                                            <span key={i} style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fee2e2', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* プッシュ通知を設定していない学生 */}
                            {result.unregisteredStudents && result.unregisteredStudents.length > 0 && (
                                <div style={{ marginTop: '12px', borderTop: '1px dashed #bbf7d0', paddingTop: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                                        🚫 プッシュ通知を設定していない学生 ({result.unregisteredStudents.length}人):
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {result.unregisteredStudents.map((name, i) => (
                                            <span key={i} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                <AlertCircle size={20} />
                                送信エラーが発生しました
                            </div>
                            {result.error && <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{result.error}</div>}
                            {result.results?.errors && result.results.errors.length > 0 && (
                                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {result.results.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}

                            {/* エラー時にもプッシュ通知を設定していない学生を表示 */}
                            {result.unregisteredStudents && result.unregisteredStudents.length > 0 && (
                                <div style={{ marginTop: '12px', borderTop: '1px dashed #fecaca', paddingTop: '12px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#4b5563', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>
                                        🚫 プッシュ通知を設定していない学生 ({result.unregisteredStudents.length}人):
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {result.unregisteredStudents.map((name, i) => (
                                            <span key={i} style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
