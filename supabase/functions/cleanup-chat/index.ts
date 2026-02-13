
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // 1. Find old attachments
        const { data: messages, error: fetchError } = await supabaseClient
            .from('messages')
            .select('id, attachment_url, attachment_name')
            .neq('attachment_url', null)
            .lt('created_at', oneWeekAgo.toISOString())
            .limit(100);

        if (fetchError) throw fetchError;

        if (!messages || messages.length === 0) {
            return new Response(JSON.stringify({ message: 'No files to clean', deletedCount: 0 }), {
                headers: { 'Content-Type': 'application/json' },
            });
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
            const { error: deleteError } = await supabaseClient
                .storage
                .from('chat-attachments')
                .remove(filesToDelete);

            if (deleteError) {
                console.error('Storage Delete Error:', deleteError);
                // Continue to update DB to prevent loop
            }
        }

        // 3. Update Database records
        if (updates.length > 0) {
            const { error: updateError } = await supabaseClient
                .from('messages')
                .update({
                    attachment_url: null,
                    attachment_name: `(期限切れ) ${messages.find(m => m.id === updates[0])?.attachment_name || ''}`,
                    attachment_type: null
                })
                .in('id', updates);

            if (updateError) throw updateError;
        }

        return new Response(JSON.stringify({
            success: true,
            deletedCount: filesToDelete.length
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
})
