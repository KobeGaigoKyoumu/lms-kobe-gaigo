import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client required for deletions and updating messages
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Admin Client for bypassing RLS
// Note: If SERVICE_KEY is missing, this will fail or run as anon (which can't delete)
const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY || 'anon-key-placeholder');

export async function GET(request) {
    if (!SERVICE_KEY) {
        return NextResponse.json({ error: 'System configuration error: Service Key missing' }, { status: 500 });
    }

    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const results = { chat: 0, homework: 0 };

        // 1. Cleanup Chat Attachments
        const { data: messages, error: fetchError } = await adminSupabase
            .from('messages')
            .select('id, attachment_url, attachment_name')
            .neq('attachment_url', null)
            .lt('created_at', sixMonthsAgo.toISOString())
            .limit(100);

        if (fetchError) throw fetchError;

        if (messages && messages.length > 0) {
            const filesToDelete = [];
            const updates = [];
            for (const msg of messages) {
                const urlParts = msg.attachment_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                if (fileName) {
                    filesToDelete.push(fileName);
                    updates.push(msg.id);
                }
            }

            if (filesToDelete.length > 0) {
                await adminSupabase.storage.from('chat-attachments').remove(filesToDelete);
                await adminSupabase.from('messages').update({
                    attachment_url: null,
                    attachment_name: `(期限切れ) ${messages[0]?.attachment_name || ''}`,
                    attachment_type: null
                }).in('id', updates);
                results.chat = filesToDelete.length;
            }
        }

        // 2. Cleanup Homework Submissions
        // homework_submissions table has file_urls (jsonb array of {name, url, path})
        const { data: submissions, error: subError } = await adminSupabase
            .from('homework_submissions')
            .select('id, file_urls')
            .neq('file_urls', null)
            .lt('submitted_at', sixMonthsAgo.toISOString())
            .limit(100);

        if (subError) throw subError;

        if (submissions && submissions.length > 0) {
            const filesToDelete = [];
            const submissionUpdates = [];

            for (const sub of submissions) {
                if (Array.isArray(sub.file_urls) && sub.file_urls.length > 0) {
                    sub.file_urls.forEach(file => {
                        // In new implementation we store 'path'
                        // In old (Drive), we didn't have path in this format, but those are gone now
                        if (file.path) filesToDelete.push(file.path);
                    });
                    submissionUpdates.push(sub.id);
                }
            }

            if (filesToDelete.length > 0) {
                await adminSupabase.storage.from('chat-attachments').remove(filesToDelete);
                // Update to clear URLs and mark as expired
                await adminSupabase.from('homework_submissions').update({
                    file_urls: null,
                    comment: `(提出ファイルは半年間の保管期限を過ぎたため削除されました) ${submissions.find(s => s.id === submissionUpdates[0])?.comment || ''}`
                }).in('id', submissionUpdates);
                results.homework = filesToDelete.length;
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        console.error('Cleanup Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
