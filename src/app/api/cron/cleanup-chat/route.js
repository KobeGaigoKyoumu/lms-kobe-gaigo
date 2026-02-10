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
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // 1. Find old attachments
        // We look for messages with attachments created more than 7 days ago
        const { data: messages, error: fetchError } = await adminSupabase
            .from('messages')
            .select('id, attachment_url, attachment_name')
            .neq('attachment_url', null)
            .lt('created_at', oneWeekAgo.toISOString())
            .limit(100); // Process in batches to avoid timeouts

        if (fetchError) throw fetchError;

        if (!messages || messages.length === 0) {
            return NextResponse.json({ message: 'No files to clean', deletedCount: 0 });
        }

        const updates = [];
        const filesToDelete = [];

        for (const msg of messages) {
            if (!msg.attachment_url) continue;

            // Extract filename from URL
            // URL format: .../storage/v1/object/public/chat-attachments/filename.jpg
            const urlParts = msg.attachment_url.split('/');
            const fileName = urlParts[urlParts.length - 1];

            if (fileName) {
                filesToDelete.push(fileName);
                updates.push(msg.id);
            }
        }

        // 2. Delete from Storage
        if (filesToDelete.length > 0) {
            const { error: deleteError } = await adminSupabase
                .storage
                .from('chat-attachments')
                .remove(filesToDelete);

            if (deleteError) {
                console.error('Storage Delete Error:', deleteError);
                // We continue to update the DB records even if storage delete "fails" (e.g. file already gone)
                // to prevent loop
            }
        }

        // 3. Update Database records
        if (updates.length > 0) {
            const { error: updateError } = await adminSupabase
                .from('messages')
                .update({
                    attachment_url: null,
                    attachment_name: `(期限切れ) ${messages.find(m => m.id === updates[0])?.attachment_name || ''}`,
                    attachment_type: null
                })
                .in('id', updates);

            if (updateError) throw updateError;
        }

        return NextResponse.json({
            success: true,
            deletedCount: filesToDelete.length
        });

    } catch (error) {
        console.error('Cleanup Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
