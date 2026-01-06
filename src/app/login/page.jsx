'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isInAppBrowser, setIsInAppBrowser] = useState(false)

    useEffect(() => {
        const ua = navigator.userAgent || navigator.vendor || window.opera
        // Detect LINE, Instagram, Facebook, or generic WebView (Android)
        const isInApp = /Line\//i.test(ua) ||
            /Instagram/i.test(ua) ||
            /FBAN|FBAV/i.test(ua) ||
            /; wv/.test(ua)

        setIsInAppBrowser(isInApp)
    }, [])

    const copyCurrentUrl = () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => alert('URLをコピーしました。ChromeやSafariで開いてください。'))
            .catch(() => alert('コピーに失敗しました。手動でURLをコピーしてください。'))
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        setError(null)

        const supabase = createClient()

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            console.error('ログインエラー:', error.message)
            setError('ログインに失敗しました。もう一度お試しください。')
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.loginBox}>
                {/* ロゴとタイトル */}
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="48" height="48" rx="12" fill="url(#gradient)" />
                            <path d="M14 16H34V20H18V22H30V26H18V32H14V16Z" fill="white" />
                            <path d="M22 28H34V32H22V28Z" fill="white" opacity="0.7" />
                            <defs>
                                <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#3B82F6" />
                                    <stop offset="1" stopColor="#8B5CF6" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className={styles.title}>神戸外語 LMS</h1>
                    <p className={styles.subtitle}>学習管理システム</p>
                </div>

                {/* エラーメッセージ */}
                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                {/* アプリ内ブラウザ警告 */}
                {isInAppBrowser && (
                    <div style={{
                        backgroundColor: '#fff7ed',
                        border: '1px solid #ffedd5',
                        color: '#c2410c',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        lineHeight: '1.5'
                    }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚠️ アプリ内ブラウザを検知しました</p>
                        <p style={{ marginBottom: '12px' }}>
                            LINEやInstagramなどのアプリ内ブラウザではGoogleログインが正常に動作しない場合があります。
                        </p>
                        <button
                            onClick={copyCurrentUrl}
                            style={{
                                width: '100%',
                                padding: '8px',
                                backgroundColor: '#fff',
                                border: '1px solid #fdba74',
                                color: '#c2410c',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                            }}
                        >
                            🔗 URLをコピーしてブラウザで開く
                        </button>
                    </div>
                )}

                {/* ログインボタン */}
                <button
                    onClick={handleGoogleLogin}
                    className={styles.googleButton}
                    disabled={loading}
                >
                    {loading ? (
                        <span className={styles.spinner}></span>
                    ) : (
                        <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    )}
                    <span>{loading ? 'ログイン中...' : 'Googleアカウントでログイン'}</span>
                </button>

                {/* フッター */}
                <div className={styles.footer}>
                    <p>© 2026 神戸外語. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}
