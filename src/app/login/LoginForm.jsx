'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loginStudent } from '@/app/actions/studentAuth'
import { loginAdminMember } from '@/app/actions/adminAuth'
import styles from './login.module.css'
import { useRouter } from 'next/navigation'

export default function LoginForm({ 
    memberNames = [], 
    nextPath = '/student/dashboard',
    errorType = null,
    errorMsg = null,
    errorDesc = null
}) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [isInAppBrowser, setIsInAppBrowser] = useState(false)

    // Login Mode: 'member', 'admin', or 'student'
    const [loginMode, setLoginMode] = useState('student')

    useEffect(() => {
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
        setIsInAppBrowser(/Line\//i.test(ua) || /Instagram/i.test(ua) || /; wv/.test(ua))
    }, [errorType, errorMsg, errorDesc])

    const copyCurrentUrl = () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => alert('URLをコピーしました。ChromeやSafariで開いてください。'))
            .catch(() => alert('コピーに失敗しました。手動でURLをコピーしてください。'))
    }

    // Google login functionality removed to save CPU and unify auth

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

    const handleMemberLogin = async (formData) => {
        setLoading(true)
        setError(null)

        try {
            const result = await loginAdminMember(formData)
            if (result?.error) {
                setError(result.error)
                setLoading(false)
            } else if (result?.success) {
                router.refresh()
                router.push('/')
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
                        onClick={() => setLoginMode('student')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            background: 'none',
                            borderBottom: loginMode === 'student' ? '2px solid #10B981' : 'none',
                            color: loginMode === 'student' ? '#10B981' : '#666',
                            fontWeight: loginMode === 'student' ? 'bold' : 'normal',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        学生
                    </button>
                    <button
                        onClick={() => setLoginMode('member')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            background: 'none',
                            borderBottom: loginMode === 'member' ? '2px solid #f59e0b' : 'none',
                            color: loginMode === 'member' ? '#f59e0b' : '#666',
                            fontWeight: loginMode === 'member' ? 'bold' : 'normal',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        教職員
                    </button>
                    <button
                        onClick={() => setLoginMode('admin')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: 'none',
                            background: 'none',
                            borderBottom: loginMode === 'admin' ? '2px solid #3B82F6' : 'none',
                            color: loginMode === 'admin' ? '#3B82F6' : '#666',
                            fontWeight: loginMode === 'admin' ? 'bold' : 'normal',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                        }}
                    >
                        管理者
                    </button>
                </div>

                {/* エラーメッセージ */}
                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                {/* 管理者ログインフォーム (教職員と同じ仕組みを使用) */}
                {loginMode === 'admin' && (
                    <form action={handleMemberLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label htmlFor="adminName" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555' }}>
                                管理者名
                            </label>
                            <select
                                id="adminName"
                                name="memberName"
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem',
                                    background: '#fff'
                                }}
                            >
                                <option value="">選択してください</option>
                                {memberNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="adminPassword" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555' }}>
                                パスワード (4桁)
                            </label>
                            <input
                                id="adminPassword"
                                name="memberPassword"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="4桁のパスワード"
                                required
                                autoComplete="off"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem',
                                    letterSpacing: '0.3em',
                                    textAlign: 'center'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.googleButton}
                            disabled={loading}
                            style={{
                                justifyContent: 'center',
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                border: 'none'
                            }}
                        >
                            {loading ? <span className={styles.spinner}></span> : '管理者ログイン'}
                        </button>
                    </form>
                )}

                {/* メンバーログインフォーム */}
                {loginMode === 'member' && (
                    <form action={handleMemberLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label htmlFor="memberName" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555' }}>
                                名前
                            </label>
                            <select
                                id="memberName"
                                name="memberName"
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem',
                                    background: '#fff'
                                }}
                            >
                                <option value="">選択してください</option>
                                {memberNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="memberPassword" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#555' }}>
                                パスワード (4桁)
                            </label>
                            <input
                                id="memberPassword"
                                name="memberPassword"
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="4桁のパスワード"
                                required
                                autoComplete="off"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    border: '1px solid #ccc',
                                    fontSize: '1rem',
                                    letterSpacing: '0.3em',
                                    textAlign: 'center'
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.googleButton}
                            disabled={loading}
                            style={{
                                justifyContent: 'center',
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                border: 'none'
                            }}
                        >
                            {loading ? <span className={styles.spinner}></span> : '教職員ログイン'}
                        </button>
                    </form>
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
