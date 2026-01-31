'use client'

import { useState } from 'react'
import { sendBroadcast } from '@/actions/messenger'
import { Send, Users, UserCheck, AlertCircle } from 'lucide-react'

export default function BroadcastForm({ classes }) {
    const [targetType, setTargetType] = useState('class') // 'all', 'class', 'students'
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

        const res = await sendBroadcast(message, targetType, targetValue)
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
                            全員 (連携済みのみ)
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
                            <div>
                                送信数: <strong>{result.count}</strong> 件
                                {result.failed > 0 && <span style={{ marginLeft: '12px', color: '#dc2626' }}>失敗: {result.failed} 件</span>}
                            </div>
                            {result.count === 0 && result.failed === 0 && (
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                                    ※ 連携済みの対象学生がいませんでした。
                                </p>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                            <AlertCircle size={20} />
                            送信エラー: {result.error}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
