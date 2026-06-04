import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Web Push VAPID Keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:admin@lms-kobe-gaigo.vercel.app',
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const results = {
            announcements: 0,
            assignments_new: 0,
            assignments_due: 0,
            errors: []
        };

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        // Target Date for deadlines (e.g., due tomorrow)
        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

        // ---------------------------------------------------------
        // 1. New Announcements Check - Web Push通知
        // ---------------------------------------------------------
        const { data: newAnnouncements, error: annError } = await supabase
            .from('announcements')
            .select('id, title, content')
            .gt('created_at', oneDayAgo);

        if (annError) {
            results.errors.push(`Announcement Error: ${annError.message}`);
        } else if (newAnnouncements?.length > 0 && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
            // 全学生のpush subscriptionsを取得
            const { data: subs } = await supabase
                .from('push_subscriptions')
                .select('*');

            if (subs && subs.length > 0) {
                for (const ann of newAnnouncements) {
                    const pushPayload = JSON.stringify({
                        title: '📢 新しいお知らせ',
                        body: `${ann.title}: ${ann.content.substring(0, 80)}...`,
                        url: '/student/announcements',
                        icon: '/icon-192.png',
                        badge: 1
                    });

                    await Promise.allSettled(subs.map(sub =>
                        webpush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth }
                        }, pushPayload).catch(e => {
                            if (e.statusCode === 410 || e.statusCode === 404) {
                                supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                            }
                        })
                    ));
                    results.announcements++;
                }
            }
        }

        // ---------------------------------------------------------
        // 2. New Assignments Check - Web Push通知
        // ---------------------------------------------------------
        const { data: newAssignments, error: newAssError } = await supabase
            .from('assignments')
            .select('id, title, course_id')
            .gt('created_at', oneDayAgo);

        if (newAssError) {
            results.errors.push(`New Assignment Error: ${newAssError.message}`);
        } else if (newAssignments?.length > 0 && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
            for (const ass of newAssignments) {
                // Get students enrolled in this course
                const { data: enrolled } = await supabase
                    .from('enrollments')
                    .select('student_id')
                    .eq('course_id', ass.course_id);

                if (enrolled && enrolled.length > 0) {
                    const studentIds = enrolled.map(e => e.student_id);

                    const { data: subs } = await supabase
                        .from('push_subscriptions')
                        .select('*')
                        .in('user_id', studentIds);

                    if (subs && subs.length > 0) {
                        const pushPayload = JSON.stringify({
                            title: '🆕 新しい課題が追加されました',
                            body: ass.title,
                            url: '/student/calendar',
                            icon: '/icon-192.png',
                            badge: 1
                        });

                        await Promise.allSettled(subs.map(sub =>
                            webpush.sendNotification({
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                            }, pushPayload).catch(e => {
                                if (e.statusCode === 410 || e.statusCode === 404) {
                                    supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                                }
                            })
                        ));
                        results.assignments_new++;
                    }
                }
            }
        }

        // ---------------------------------------------------------
        // 3. Deadline Alerts (Unsubmitted & Due Tomorrow) - Web Push通知
        // ---------------------------------------------------------
        const { data: dueAssignments, error: dueError } = await supabase
            .from('assignments')
            .select('id, title, due_date, course_id')
            .gte('due_date', tomorrowStart.toISOString())
            .lt('due_date', tomorrowEnd.toISOString());

        if (dueError) {
            results.errors.push(`Due Assignment Error: ${dueError.message}`);
        } else if (dueAssignments?.length > 0) {
            for (const ass of dueAssignments) {
                // 1. Get all enrolled students for this course
                const { data: enrolled } = await supabase
                    .from('enrollments')
                    .select('student_id')
                    .eq('course_id', ass.course_id);

                if (!enrolled || enrolled.length === 0) continue;

                // 2. Get students who HAVE submitted
                const { data: submitted } = await supabase
                    .from('submissions')
                    .select('student_id')
                    .eq('assignment_id', ass.id)
                    .in('status', ['submitted', 'graded']); // Draft is not submitted

                const submittedIds = new Set(submitted?.map(s => s.student_id));

                // 3. Filter: Enrolled BUT NOT Submitted
                const unsubmittedStudents = enrolled.filter(e => !submittedIds.has(e.student_id));

                if (unsubmittedStudents.length > 0) {
                    const dateStr = new Date(ass.due_date).toLocaleDateString('ja-JP');

                    // Web Push Notifications
                    const studentIds = unsubmittedStudents.map(e => e.student_id);
                    if (studentIds.length > 0 && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
                        const { data: subs, error: subError } = await supabase
                            .from('push_subscriptions')
                            .select('*')
                            .in('user_id', studentIds);

                        if (!subError && subs && subs.length > 0) {
                            const pushPayload = JSON.stringify({
                                title: '⚠️ 課題の締切間近',
                                body: `「${ass.title}」の締切が明日 (${dateStr}) に迫っています。未提出ですのでお早めに対応してください。`,
                                url: `/student/homework/${ass.id}`,
                                icon: '/icon-192.png',
                                badge: 1
                            });

                            await Promise.allSettled(subs.map(sub =>
                                webpush.sendNotification({
                                    endpoint: sub.endpoint,
                                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                                }, pushPayload)
                            ));
                        }
                    }

                    results.assignments_due++;
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error('Cron Job Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
