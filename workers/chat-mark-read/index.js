export default {
    async fetch(request, env) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
        const apiSecret = env.API_SECRET; // For secure snapshot updates

        try {
            // --- GET Actions (Read/Fetch) ---
            if (request.method === "GET") {
                const action = url.searchParams.get('action');

                // 1. App Status (Existing)
                if (action === 'get-status') {
                    const role = url.searchParams.get('role');
                    const studentId = url.searchParams.get('studentId');
                    const className = url.searchParams.get('className');
                    const academicYear = url.searchParams.get('academicYear');

                    const results = { hasNewAnnouncement: false, unsubmittedAssignmentCount: 0, unreadMessageCount: 0 };

                    // Unread Messages
                    let unreadQuery = (role === 'student' && studentId)
                        ? `messages?student_id=eq.${studentId}&sender_type=eq.teacher&read=eq.false&select=count`
                        : (role !== 'student' ? `messages?sender_type=eq.student&read=eq.false&select=count` : null);

                    if (unreadQuery) {
                        const res = await fetch(`${supabaseUrl}/rest/v1/${unreadQuery}`, {
                            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                        });
                        const countHeader = res.headers.get('Content-Range');
                        results.unreadMessageCount = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;
                    }

                    if (role === 'student' && studentId) {
                        // Assignments
                        if (className) {
                            const assignRes = await fetch(`${supabaseUrl}/rest/v1/homework_assignments?class_name=eq.${className}&select=id`, {
                                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                            });
                            const assignments = await assignRes.json();
                            const assignmentIds = Array.isArray(assignments) ? assignments.map(a => a.id) : [];
                            if (assignmentIds.length > 0) {
                                const subRes = await fetch(`${supabaseUrl}/rest/v1/homework_submissions?student_id_text=eq.${studentId}&assignment_id=in.(${assignmentIds.join(',')})&select=assignment_id`, {
                                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                                });
                                const submissions = await subRes.json();
                                const submittedIds = new Set(Array.isArray(submissions) ? submissions.map(s => s.assignment_id) : []);
                                results.unsubmittedAssignmentCount = assignmentIds.filter(id => !submittedIds.has(id)).length;
                            }
                        }
                        // Announcements
                        const threeDaysAgo = new Date();
                        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                        const annRes = await fetch(`${supabaseUrl}/rest/v1/announcements?created_at=gte.${threeDaysAgo.toISOString()}&select=target_type,target_grade,target_class,target_student_ids`, {
                            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                        });
                        const announcements = await annRes.json();
                        if (Array.isArray(announcements) && announcements.length > 0 && academicYear) {
                            const curYear = new Date().getFullYear();
                            const acadBase = new Date().getMonth() < 3 ? curYear - 1 : curYear;
                            const grade = acadBase - parseInt(academicYear) + 1;
                            results.hasNewAnnouncement = announcements.some(ann => {
                                if (!ann.target_type || ann.target_type === 'all') return true;
                                if (ann.target_type === 'grade') return String(grade) === ann.target_grade;
                                if (ann.target_type === 'class') return ann.target_class === className;
                                if (ann.target_type === 'individual') return ann.target_student_ids?.includes(studentId);
                                return false;
                            });
                        }
                    }

                    return new Response(JSON.stringify(results), {
                        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" }
                    });
                }

                // 2. Attendance (New)
                if (action === 'get-attendance' && url.searchParams.get('studentId')) {
                    const studentId = url.searchParams.get('studentId');
                    const res = await fetch(`${supabaseUrl}/rest/v1/attendance_records?student_id=eq.${studentId}&order=year.desc,month.desc`, {
                        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                    });
                    const data = await res.json();
                    return new Response(JSON.stringify(data), {
                        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } // Cache 5 mins
                    });
                }

                // 3. Analytics (New - Read from KV)
                if (action === 'get-analytics') {
                    const type = url.searchParams.get('type') || 'all';
                    // Need KV Namespace bound as 'LMS_KV'
                    if (!env.LMS_KV) {
                        return new Response(JSON.stringify({ error: "KV not configured" }), { status: 500, headers: corsHeaders });
                    }
                    const data = await env.LMS_KV.get(`analytics_${type}`);
                    if (!data) return new Response(JSON.stringify({ error: "No snapshot found" }), { status: 404, headers: corsHeaders });

                    return new Response(data, {
                        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } // Cache 1 hour
                    });
                }
            }

            // --- POST Actions (Write/Update) ---
            if (request.method === "POST") {
                const body = await request.json();
                const { action } = body;

                // 1. Mark Read (Existing)
                if (action === 'mark-read') {
                    const { studentId, senderType } = body;
                    const targetType = senderType === 'teacher' ? 'student' : 'teacher';
                    const res = await fetch(`${supabaseUrl}/rest/v1/messages?student_id=eq.${studentId}&sender_type=eq.${targetType}&read=eq.false`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ read: true })
                    });
                    return new Response(JSON.stringify({ success: res.ok }), { headers: corsHeaders });
                }

                // 2. Update Snapshot (Existing)
                if (action === 'update-snapshot') {
                    const authHeader = request.headers.get('Authorization');
                    if (authHeader !== `Bearer ${apiSecret}`) {
                        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
                    }

                    const { type, data } = body;
                    if (!env.LMS_KV) {
                        return new Response("KV not bound", { status: 500, headers: corsHeaders });
                    }
                    await env.LMS_KV.put(`analytics_${type}`, JSON.stringify(data));
                    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
                }

                // 3. Telegram Webhook (New - Migrated from Vercel)
                if (body.message && body.message.text) {
                    const chatId = body.message.chat.id;
                    const text = body.message.text;
                    const botToken = env.TELEGRAM_BOT_TOKEN;

                    const sendMsg = async (t) => {
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: chatId, text: t, parse_mode: 'Markdown' })
                        });
                    };

                    if (text.startsWith('/start')) {
                        const studentId = text.split(' ')[1];
                        if (studentId) {
                            const sRes = await fetch(`${supabaseUrl}/rest/v1/students?student_id_text=eq.${studentId}&select=full_name`, {
                                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                            });
                            const student = (await sRes.json())[0];
                            if (student) {
                                await fetch(`${supabaseUrl}/rest/v1/students?student_id_text=eq.${studentId}`, {
                                    method: 'PATCH',
                                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ telegram_chat_id: String(chatId) })
                                });
                                await sendMsg(`こんにちは、${student.full_name}さん！\nLMSとの連携が完了しました。✅`);
                            } else {
                                await sendMsg(`学生ID "${studentId}" が見つかりませんでした。`);
                            }
                        } else {
                            await sendMsg(`こんにちは！LMSと連携するにはマイページからアクセスしてください。`);
                        }
                    } else if (text === '/grades') {
                        await sendMsg(`📊 成績はこちら：\nhttps://lms-kobe-gaigo.vercel.app/student/grades`);
                    } else if (text === '/attendance') {
                        await sendMsg(`📅 出席状況はこちら：\nhttps://lms-kobe-gaigo.vercel.app/student/attendance`);
                    } else if (text === '/unlink') {
                        await fetch(`${supabaseUrl}/rest/v1/students?telegram_chat_id=eq.${chatId}`, {
                            method: 'PATCH',
                            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ telegram_chat_id: null })
                        });
                        await sendMsg(`✅ 連携を解除しました。`);
                    } else if (text === '/help') {
                        await sendMsg(`🤖 **コマンド一覧**\n/grades - 成績\n/attendance - 出席率\n/unlink - 連携解除`);
                    }

                    return new Response("OK", { status: 200, headers: corsHeaders });
                }
            }

            return new Response("Not found", { status: 404, headers: corsHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    }
};
