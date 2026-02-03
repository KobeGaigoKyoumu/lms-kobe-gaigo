import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (!TELEGRAM_BOT_TOKEN) {
        return NextResponse.json({ error: 'Telegram Token missing' }, { status: 500 });
    }

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
        // Check for deadlines falling within the next 24 to 48 hours? 
        // Or strictly "Tomorrow". Let's say due between now and +24h (Imminent) or +24h and +48h (Tomorrow).
        // Let's go with "Due within 2 days" to be safe.
        const tomorrowStart = new Date(now);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

        // ---------------------------------------------------------
        // 1. New Announcements Check (Keep)
        // ---------------------------------------------------------
        const { data: newAnnouncements, error: annError } = await supabase
            .from('announcements')
            .select('id, title, content')
            .gt('created_at', oneDayAgo);

        if (annError) {
            results.errors.push(`Announcement Error: ${annError.message}`);
        } else if (newAnnouncements?.length > 0) {
            // Broadcast to all linked students
            // Optimization: Fetch all valid linked students once
            const { data: students } = await supabase
                .from('students')
                .select('telegram_chat_id')
                .not('telegram_chat_id', 'is', null);

            for (const ann of newAnnouncements) {
                const message = `📢 **新しいお知らせ**\n\n**${ann.title}**\n${ann.content.substring(0, 50)}...\n\n[詳細を見る](https://lms-kobe-gaigo.vercel.app/student/announcements)`;
                await broadcastMessage(students, message);
                results.announcements++;
            }
        }

        // ---------------------------------------------------------
        // 2. New Assignments Check
        // ---------------------------------------------------------
        const { data: newAssignments, error: newAssError } = await supabase
            .from('assignments')
            .select('id, title, course_id')
            .gt('created_at', oneDayAgo);

        if (newAssError) {
            // created_at checks might fail if column doesn't exist, but it's standard default.
            results.errors.push(`New Assignment Error: ${newAssError.message}`);
        } else if (newAssignments?.length > 0) {
            // For each new assignment, find enrolled students and notify
            for (const ass of newAssignments) {
                const message = `🆕 **新しい課題が追加されました**\n\n**${ass.title}**\n\n[確認する](https://lms-kobe-gaigo.vercel.app/student/calendar)`;

                // Get students enrolled in this course with Telegram linked
                const { data: enrolledStudents } = await supabase
                    .from('enrollments')
                    .select('student_id, students!inner(telegram_chat_id)')
                    .eq('course_id', ass.course_id)
                    .not('students.telegram_chat_id', 'is', null);

                if (enrolledStudents && enrolledStudents.length > 0) {
                    // Flatten structure: enrollments -> students object
                    const targets = enrolledStudents.map(e => ({ telegram_chat_id: e.students.telegram_chat_id }));
                    await broadcastMessage(targets, message);
                    results.assignments_new++;
                }
            }
        }

        // ---------------------------------------------------------
        // 3. Deadline Alerts (Unsubmitted & Due Tomorrow)
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
                    .select('student_id, students!inner(telegram_chat_id)')
                    .eq('course_id', ass.course_id)
                    .not('students.telegram_chat_id', 'is', null);

                if (!enrolled || enrolled.length === 0) continue;

                // 2. Get students who HAVE submitted
                const { data: submitted } = await supabase
                    .from('submissions')
                    .select('student_id')
                    .eq('assignment_id', ass.id)
                    .in('status', ['submitted', 'graded']); // Draft is not submitted

                const submittedIds = new Set(submitted?.map(s => s.student_id));

                // 3. Filter: Enrolled BUT NOT Submitted
                const unsubmittedStudents = enrolled
                    .filter(e => !submittedIds.has(e.student_id))
                    .map(e => ({ telegram_chat_id: e.students.telegram_chat_id }));

                if (unsubmittedStudents.length > 0) {
                    const dateStr = new Date(ass.due_date).toLocaleDateString('ja-JP');
                    const message = `⚠️ **課題の締切が近づいています**\n\n**${ass.title}**\n締切: ${dateStr}\n\nまだ提出されていません。お早むに対応してください。\n\n[提出する](https://lms-kobe-gaigo.vercel.app/student/calendar)`;
                    await broadcastMessage(unsubmittedStudents, message);
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

async function broadcastMessage(students, text) {
    if (!students || students.length === 0) return;

    // Batch processing to respect Telegram rate limits (approx 30 msg/sec)
    const BATCH_SIZE = 25;
    const DELAY_MS = 1000;

    const chunks = [];
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
        chunks.push(students.slice(i, i + BATCH_SIZE));
    }

    for (const chunk of chunks) {
        const promises = chunk.map(s => {
            if (s.telegram_chat_id) return sendTelegramMessage(s.telegram_chat_id, text);
            return Promise.resolve();
        });

        await Promise.all(promises);

        // Wait before next batch
        if (chunks.indexOf(chunk) < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
}

async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
        });
    } catch (e) {
        console.error('Failed to send Telegram msg:', e);
    }
}
