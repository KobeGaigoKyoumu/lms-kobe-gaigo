'use server'

import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
// 他のAPIと同様にフォールバック用のサービスロールキーを設定
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:admin@lms-kobe-gaigo.vercel.app',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY)

export async function sendUnifiedBroadcast(message, targetType, targetValue, channels = ['webpush']) {
    try {
        const results = {
            webpush: null,
            totalSent: 0,
            totalFailed: 0,
            errors: []
        }

        let unregisteredStudents = []
        let failedStudents = []

        // Web Push Channel (Smartphone Notifications)
        if (channels.includes('webpush')) {
            try {
                // Get target student IDs and names (only active ones)
                let studentQuery = adminSupabase.from('students').select('student_id_text, full_name').eq('status', 'active')
                if (targetType === 'class') {
                    studentQuery = studentQuery.eq('class_name', targetValue)
                }

                const { data: students, error: studentError } = await studentQuery
                if (studentError) throw new Error(studentError.message)
                if (!students || students.length === 0) {
                    results.webpush = { success: true, count: 0, failed: 0 }
                    return {
                        success: true,
                        count: 0,
                        failed: 0,
                        unregisteredStudents: [],
                        failedStudents: [],
                        results
                    }
                }

                const studentIds = students.map(s => s.student_id_text)
                const studentMap = new Map(students.map(s => [s.student_id_text, s]))

                // Fetch Web Push subscriptions
                const { data: subs, error: subError } = await adminSupabase
                    .from('push_subscriptions')
                    .select('*')
                    .in('user_id', studentIds)

                if (subError) throw new Error(subError.message)
                
                // 1. プッシュ通知を設定していない学生を特定
                const subscribedUserIds = new Set(subs ? subs.map(sub => sub.user_id) : [])
                unregisteredStudents = students
                    .filter(s => !subscribedUserIds.has(s.student_id_text))
                    .map(s => `${s.full_name} (${s.student_id_text})`)

                if (!subs || subs.length === 0) {
                    results.webpush = { success: true, count: 0, failed: 0 }
                    return {
                        success: true,
                        count: 0,
                        failed: 0,
                        unregisteredStudents,
                        failedStudents: [],
                        results
                    }
                }

                // Send notifications
                const pushPayload = JSON.stringify({
                    title: '📢 学校からのお知らせ',
                    body: message,
                    url: '/',
                    icon: '/icon-192.png',
                    badge: 1
                })

                // 学生ごとにサブスクリプションをグループ化
                const studentSubsMap = new Map()
                subs.forEach(sub => {
                    if (!studentSubsMap.has(sub.user_id)) {
                        studentSubsMap.set(sub.user_id, [])
                    }
                    studentSubsMap.get(sub.user_id).push(sub)
                })

                let successCount = 0
                let failureCount = 0

                // 各学生ごとに送信を処理
                for (const [studentId, studentSubs] of studentSubsMap.entries()) {
                    const student = studentMap.get(studentId)
                    const studentName = student ? `${student.full_name} (${studentId})` : studentId

                    const sendPromises = studentSubs.map(async (sub) => {
                        try {
                            await webpush.sendNotification({
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                            }, pushPayload)
                            return { success: true }
                        } catch (e) {
                            // 期限切れや無効なエンドポイントの場合、DBから自動削除（クリーンアップ）
                            if (e.statusCode === 410 || e.statusCode === 404) {
                                await adminSupabase
                                    .from('push_subscriptions')
                                    .delete()
                                    .eq('endpoint', sub.endpoint)
                            }
                            return { success: false, error: e }
                        }
                    })

                    const sendResults = await Promise.all(sendPromises)
                    const succeeded = sendResults.some(r => r.success)

                    if (succeeded) {
                        successCount++
                    } else {
                        failureCount++
                        failedStudents.push(studentName)
                    }
                }

                results.webpush = {
                    success: true,
                    count: successCount,
                    failed: failureCount
                }
                results.totalSent += successCount
                results.totalFailed += failureCount

                if (failureCount > 0) {
                    results.errors.push(`[WebPush] ${failureCount}人の学生への送信に失敗しました`)
                }
            } catch (err) {
                results.errors.push(`[WebPush] ${err.message}`)
                results.webpush = { success: false, error: err.message, count: 0, failed: 0 }
            }
        }

        return {
            success: results.totalSent > 0 || (results.errors.length === 0),
            count: results.totalSent,
            failed: results.totalFailed,
            unregisteredStudents,
            failedStudents,
            results
        }
    } catch (err) {
        console.error('sendUnifiedBroadcast error:', err)
        return {
            success: false,
            count: 0,
            failed: 0,
            unregisteredStudents: [],
            failedStudents: [],
            error: err.message,
            results: { errors: [err.message] }
        }
    }
}
