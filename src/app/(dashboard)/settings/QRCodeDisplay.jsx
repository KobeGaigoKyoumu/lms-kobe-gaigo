'use client'

import { useState, useEffect } from 'react'
import { QrCode } from 'lucide-react'

export default function QRCodeDisplay() {
    const [qrUrl, setQrUrl] = useState('')
    const [pageUrl, setPageUrl] = useState('')

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentOrigin = window.location.origin
            setPageUrl(currentOrigin)
            // api.qrserver.com は無料で商用利用も可能なQRコード生成API
            setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentOrigin)}`)
        }
    }, [])

    if (!qrUrl) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <span style={{ color: '#9ca3af' }}>読込中...</span>
            </div>
        )
    }

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1.5rem',
            background: '#f9fafb',
            borderRadius: '0.75rem',
            border: '1px dashed #d1d5db'
        }}>
            <div style={{
                background: 'white',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="LMS KOBE GAIGO Web App QR Code" width="150" height="150" style={{ display: 'block' }} />
            </div>
            
            <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <QrCode size={16} />
                    スマートフォンへのインストール
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                    上のQRコードをスマートフォンのカメラで読み取り、<br/>
                    ブラウザメニューの「ホーム画面に追加」を実行することで、<br/>
                    このシステムをアプリのように利用できます。
                </p>
                <div style={{ marginTop: '0.5rem', fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace', background: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                    {pageUrl}
                </div>
            </div>
        </div>
    )
}
