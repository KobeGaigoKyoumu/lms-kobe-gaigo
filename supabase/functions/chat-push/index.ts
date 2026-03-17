// Dynamic imports will be used inside the handler to prevent startup crashes.
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// import webpush from 'https://esm.sh/web-push@3.6.7'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
    try {
        // 1. Handle CORS preflight requests (Inside try-catch for safety)
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders, status: 200 })
        }

        console.log(`[Push Function] Request: ${req.method} ${req.url}`);

        // Dynamically import dependencies
        const { createClient } = await import('npm:@supabase/supabase-js@2');
        const webpush = (await import('npm:web-push@3.6.7')).default;

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Check if this is a direct call or a webhook
        let payload = {};
        try {
            const text = await req.text();
            if (text && text.length > 0) {
                payload = JSON.parse(text);
            }
        } catch (e) {
            console.log('Error parsing JSON body:', e);
            // Non-JSON body is acceptable for some cases (e.g. simple ping)
        }

        // Determine if it's a DB Webhook payload (record, old_record, type, table, schema)
        // or a direct invoke payload
        const record = payload.record || payload // Fallback to direct payload if not webhook

        if (payload.type === 'test') {
            console.log('Processing TEST push request');
            const authHeader = req.headers.get('Authorization');
            let userId = null;

            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user }, error } = await supabaseClient.auth.getUser(token);
                if (user) userId = user.id;
            }

            if (!userId) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 401,
                });
            }

            // User Configuration for Web Push (Moved up for Test Push)
            const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
            const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
            const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@example.com';
            const subject = adminEmail.startsWith('mailto:') ? adminEmail : `mailto:${adminEmail}`;

            if (!vapidPublicKey || !vapidPrivateKey) {
                console.error('Missing VAPID keys')
                return new Response(JSON.stringify({ error: 'Server configuration error: VAPID keys missing' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 500,
                })
            }

            webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey)

            // Fetch Subscriptions for the user
            const { data: subs, error: subError } = await supabaseClient
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', userId);

            if (subError || !subs || subs.length === 0) {
                return new Response(JSON.stringify({ message: 'No subscriptions found', count: 0 }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

            const simpleMode = payload.simpleMode || false;
            const delay = payload.delay || 0;

            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            }

            const iconUrl = '/icon-192.png';
            let options = {}

            // Payload construction for test (Manual construction as web-push takes string)
            const pushPayload = JSON.stringify({
                title: simpleMode ? '簡易テスト通知' : 'テスト通知',
                body: simpleMode
                    ? 'これは簡易モードの通知です。アイコンやアクションボタンを含みません。'
                    : `これはテスト通知です (${delay > 0 ? delay + '秒遅延' : '即時'})。通知機能は正常に動作しています。`,
                url: '/',
                badge: simpleMode ? undefined : 1,
                icon: simpleMode ? undefined : iconUrl,
                simpleMode: simpleMode
            });

            const sendPromises = subs.map(async (sub) => {
                try {
                    await webpush.sendNotification({
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth }
                    }, pushPayload);
                    return { success: true };
                } catch (error) {
                    console.error('Test Push failed for sub:', sub.id, error.statusCode);
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await supabaseClient.from('push_subscriptions').delete().eq('id', sub.id);
                    }
                    return { success: false, error: error.message };
                }
            });

            const results = await Promise.all(sendPromises);
            const successCount = results.filter(r => r.success).length;

            return new Response(JSON.stringify({ message: 'Test notifications sent', count: successCount, results }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }


        // User Configuration for Web Push
        // Already initialized above for Test Push, but redundant check is fine or just reuse variables if scope allows.
        // Since we moved it inside the 'test' block above, we need it here too for the main block if it wasn't a test.
        // Actually, better to move it to the top level scope of the request handler? 
        // No, let's just duplicate or restructure. 
        // Wait, the previous block returns, so we must initialize here again if we didn't enter the test block.

        const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@example.com';
        const subject = adminEmail.startsWith('mailto:') ? adminEmail : `mailto:${adminEmail}`;

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.error('Missing VAPID keys')
            return new Response(JSON.stringify({ error: 'Server configuration error' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey)

        // Determine Recipient
        let recipientId = null
        let title = ''
        let url = ''

        if (record.sender_type === 'teacher') {
            recipientId = record.student_id // Helper/Teacher sending TO student
            title = '先生からのメッセージ'
            url = '/student/communication'
        } else {
            // Student sending TO teacher
            title = '学生からのメッセージ'
            url = `/communication/${record.student_id}` // Teacher's view

            // Find the teacher to notify. 
            // Logic: Find the last teacher who messaged this student, or default/notify all admins.
            // For simplicity in this v1, we will notify a specific admin/teacher if linked, 
            // or we need a way to broadcast to 'all teachers'.
            // Existing logic in /api/chat/route.js fell back to 'admin_user' or last teacher.

            // Let's try to find the last teacher interaction
            const { data: lastTeacherMsg } = await supabaseClient
                .from('messages')
                .select('teacher_id')
                .eq('student_id', record.student_id)
                .eq('sender_type', 'teacher')
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            recipientId = lastTeacherMsg?.teacher_id

            if (!recipientId) {
                console.log('No specific teacher found to notify for student:', record.student_id, '. Falling back to "member" (staff).')
                recipientId = 'member'
            }
        }

        // Fetch Unread Count (Optional, for badge)
        const { count: unreadCount } = await supabaseClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', record.student_id)
            .eq('read', false)
            .eq('sender_type', record.sender_type) // Count messages OF THIS TYPE (that are unread)
        // Wait, if I am Student, I want to see unread messages FROM Teacher.
        // If I am Teacher, I want to see unread messages FROM Student.
        // The query above is slightly ambiguous without context.
        // Let's simplify: Badge is usually total unread for the user.

        // Actually, let's keep it simple. Badge = 1.

        // Fetch Subscriptions
        const { data: subs, error: subError } = await supabaseClient
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', recipientId)

        if (subError || !subs || subs.length === 0) {
            console.log('No subscriptions found for user:', recipientId)
            return new Response(JSON.stringify({ message: 'No subscriptions' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const pushPayload = JSON.stringify({
            title: title,
            body: record.content || (record.attachment_url ? 'ファイルを送信しました' : '新着メッセージ'),
            url: url,
            badge: 1, // Simplified
            icon: '/icon-192.png'
        })

        const sendPromises = subs.map(async (sub) => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, pushPayload)
                return { success: true }
            } catch (error) {
                console.error('Push failed for sub:', sub.id, error.statusCode)
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Check for 410 Gone or 404 Not Found and delete the subscription
                    await supabaseClient.from('push_subscriptions').delete().eq('id', sub.id)
                }
                return { success: false, error: error.message }
            }
        })

        await Promise.all(sendPromises)

        return new Response(JSON.stringify({ message: 'Notifications sent' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Unhandled Edge Function Error:', error)
        return new Response(JSON.stringify({
            error: error.message || 'Internal Server Error',
            stack: error.stack,
            method: req.method,
            url: req.url
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
