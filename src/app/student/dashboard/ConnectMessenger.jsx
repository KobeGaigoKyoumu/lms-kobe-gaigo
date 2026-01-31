'use client'

import { MessageCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function ConnectMessenger({ connected, studentId, pageId = '1421716201448413' }) {
    // If we don't have a specific page ID yet, we might need to rely on env or prop.
    // Ideally usage: <ConnectMessenger connected={status.connected} studentId={status.studentId} pageId={process.env.NEXT_PUBLIC_FB_PAGE_ID} />

    const fbPageId = (pageId && pageId !== 'YOUR_PAGE_ID') ? pageId : '1421716201448413';
    const mMeLink = `https://m.me/${fbPageId}?ref=${studentId}`;

    if (connected) {
        return (
            <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                color: '#166534',
                fontSize: '0.9rem'
            }}>
                <CheckCircle2 size={18} />
                <span>Messenger連携済み：重要なお知らせが届きます。</span>
            </div>
        )
    }

    return (
        <div style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#1e40af' }}>
                <MessageCircle size={20} />
                重要なお知らせを受け取る
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#3b82f6' }}>
                Facebook Messengerと連携して、学校からの緊急連絡や課題の通知を受け取りましょう。
            </p>
            <Link
                href={mMeLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#0084FF', // Messenger Brand Color
                    color: 'white',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    marginTop: '8px',
                    width: 'fit-content'
                }}
            >
                <MessageCircle size={18} />
                Messengerで連携する
            </Link>
        </div>
    )
}
