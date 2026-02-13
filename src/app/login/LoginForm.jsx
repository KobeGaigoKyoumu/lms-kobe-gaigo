'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loginStudent } from '@/app/actions/studentAuth'
import styles from './login.module.css'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const nextPath = searchParams.get('next') || '/student/dashboard'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isInAppBrowser, setIsInAppBrowser] = useState(false)

    // Login Mode: 'google' (default) or 'student'
    const [loginMode, setLoginMode] = useState('google')

    useEffect(() => {
        // Handle error from URL parameters (e.g., from auth callback)
        const errorType = searchParams.get('error')
        const errorMsg = searchParams.get('msg')
        const errorDesc = searchParams.get('desc')

        if (errorType) {
            let fullError = ''
            if (errorType === 'auth_failed' || errorType === 'no_code') {
                fullError = '認証に失敗しました。'
            } else if (errorType === 'access_denied') {
                fullError = 'アクセスが拒否されました。'
            } else {
                fullError = `エラーが発生しました (${errorType})。`
            }

            if (errorMsg || errorDesc) {
                fullError += ` 詳細: ${errorMsg || ''} ${errorDesc || ''}`
            } else if (errorType === 'auth_failed') {
                fullError += ' Googleアカウントの設定や権限を確認してください。'
            }
            setError(fullError)
        }

        const ua = navigator.userAgent || navigator.vendor || window.opera
        // Detect LINE, Instagram, or generic WebView (Android)
        const isInApp = /Line\//i.test(ua) ||
            /Instagram/i.test(ua) ||
            /; wv/.test(ua)

        setIsInAppBrowser(isInApp)
    }, [searchParams])

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
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            },
        })

        if (error) {
            console.error('ログインエラー:', error.message)
            setError('ログインに失敗しました。もう一度お試しください。')
            setLoading(false)
        }
    }

    const handleStudentLogin = async (formData) => {
        setLoading(true)
        setError(null)

        try {
            const result = await loginStudent(formData)
            if (result?.error) {
                setError(result.error)
                setLoading(false)
            } else if (result?.success) {
                // Login successful
                router.refresh() // Refresh Server Components to pick up the cookie
                router.push(nextPath)
            }
        } catch (e) {
            console.error(e)
            setError('システムエラーが発生しました。')
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

                {/* モード切り替えタブ */}
                <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #e0e0e0' }}>
                    <button
                        onClick={() => setLoginMode('google')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            background: 'none',
                            borderBottom: loginMode === 'google' ? '2px solid #3B82F6' : 'none',
                            color: loginMode === 'google' ? '#3B82F6' : '#666',
                            fontWeight: loginMode === 'google' ? 'bold' : 'normal',
                            cursor: 'pointer'
                        }}
                    >
                        教職員 / 管理者
                    </button>
                    <button
                        onClick={() => setLoginMode('student')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            background: 'none',
                            borderBottom: loginMode === 'student' ? '2px solid #3B82F6' : 'none',
                            color: loginMode === 'student' ? '#3B82F6' : '#666',
                            fontWeight: loginMode === 'student' ? 'bold' : 'normal',
                            cursor: 'pointer'
                        }}
                    >
                        学生
                    </button>
                </div>

                {/* エラーメッセージ */}
                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                {/* アプリ内ブラウザ警告 */}
                {isInAppBrowser && loginMode === 'google' && (
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

                {/* Google ログインフォーム */}
                {loginMode === 'google' && (
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
                )}

                {/* 学生ログインフォーム */}
                {loginMode === 'student' && (
                    <form action={handleStudentLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label htmlFor="className" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555' }}>
                                クラス名 (例: 2-1)
                            </label>
                            <input
                                id="className"
                                name="className"
                                type="text"
                                placeholder="例: 2-1"
                                required
                                autoComplete="on"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <div>
                            <label htmlFor="studentId" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555' }}>
                                学籍番号 (パスコード)
                            </label>
                            <input
                                id="studentId"
                                name="studentId"
                                type="text"
                                placeholder="例: 2404159"
                                required
                                autoComplete="on"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.googleButton} // Reuse button style
                            disabled={loading}
                            style={{
                                justifyContent: 'center',
                                backgroundColor: '#10B981', // Green for students
                                color: 'white',
                                border: 'none'
                            }}
                        >
                            {loading ? <span className={styles.spinner}></span> : '学生ログイン'}
                        </button>
                    </form>
                )}

                {/* フッター */}
                <div className={styles.footer}>
                    <p>© 2026 神戸外語. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}

