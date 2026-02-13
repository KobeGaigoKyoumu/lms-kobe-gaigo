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

        try {
            // --- ACTION: GET Status (Cacheable) ---
            if (request.method === "GET") {
                const action = url.searchParams.get('action');
                if (action === 'get-status') {
                    const role = url.searchParams.get('role');
                    const studentId = url.searchParams.get('studentId');
                    const className = url.searchParams.get('className');
                    const academicYear = url.searchParams.get('academicYear');

                    const results = { hasNewAnnouncement: false, unsubmittedAssignmentCount: 0, unreadMessageCount: 0 };

                    // A. Unread Messages
                    let unreadQuery;
                    if (role === 'student' && studentId) {
                        unreadQuery = `messages?student_id=eq.${studentId}&sender_type=eq.teacher&read=eq.false&select=count`;
                    } else if (role !== 'student') {
                        unreadQuery = `messages?sender_type=eq.student&read=eq.false&select=count`;
                    }

                    if (unreadQuery) {
                        const res = await fetch(`${supabaseUrl}/rest/v1/${unreadQuery}`, {
                            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                        });
                        const countHeader = res.headers.get('Content-Range');
                        results.unreadMessageCount = countHeader ? parseInt(countHeader.split('/')[1]) || 0 : 0;
                    }

                    if (role === 'student' && studentId) {
                        // B. Unsubmitted Assignments
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

                        // C. New Announcements (last 3 days)
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
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                            "Cache-Control": "public, max-age=60, s-maxage=60" // Cache for 1 minute on edge and browser
                        }
                    });
                }
            }

            // --- ACTION: POST Actions (Mutation/Direct) ---
            if (request.method === "POST") {
                const body = await request.json();
                const { action, studentId, senderType } = body;

                if (action === 'mark-read' || (!action && studentId)) {
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
            }

            return new Response("Not found", { status: 404, headers: corsHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    }
};
