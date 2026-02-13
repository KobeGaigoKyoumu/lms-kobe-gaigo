export default {
    async fetch(request, env) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405, headers: corsHeaders });
        }

        try {
            const body = await request.json();
            const { action, studentId, senderType, className, academicYear, role } = body;
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            // 1. Mark as Read Action (Existing logic)
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

            // 2. Get App Status Action (Offloaded from statusActions.js)
            if (action === 'get-status') {
                const results = {
                    hasNewAnnouncement: false,
                    unsubmittedAssignmentCount: 0,
                    unreadMessageCount: 0
                };

                // Part A: Unread Messages
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
                    if (countHeader) {
                        results.unreadMessageCount = parseInt(countHeader.split('/')[1]) || 0;
                    } else {
                        const data = await res.json();
                        results.unreadMessageCount = data[0]?.count || 0;
                    }
                }

                if (role === 'student' && studentId) {
                    // Part B: Unsubmitted Assignments
                    if (className) {
                        // Get all assignments for class
                        const assignRes = await fetch(`${supabaseUrl}/rest/v1/homework_assignments?class_name=eq.${className}&select=id`, {
                            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                        });
                        const allAssignments = await assignRes.json();
                        const assignmentIds = allAssignments.map(a => a.id);

                        if (assignmentIds.length > 0) {
                            // Get submissions for this student
                            const subRes = await fetch(`${supabaseUrl}/rest/v1/homework_submissions?student_id_text=eq.${studentId}&assignment_id=in.(${assignmentIds.join(',')})&select=assignment_id`, {
                                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                            });
                            const submissions = await subRes.json();
                            const submittedIds = new Set(submissions.map(s => s.assignment_id));
                            results.unsubmittedAssignmentCount = assignmentIds.filter(id => !submittedIds.has(id)).length;
                        }
                    }

                    // Part C: New Announcements (last 3 days)
                    const threeDaysAgo = new Date();
                    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                    const annRes = await fetch(`${supabaseUrl}/rest/v1/announcements?created_at=gte.${threeDaysAgo.toISOString()}&select=target_type,target_grade,target_class,target_student_ids`, {
                        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                    });
                    const announcements = await annRes.json();

                    if (announcements.length > 0 && academicYear) {
                        const currentYear = new Date().getFullYear();
                        const academicYearBase = new Date().getMonth() < 3 ? currentYear - 1 : currentYear;
                        const studentGrade = academicYearBase - academicYear + 1;

                        results.hasNewAnnouncement = announcements.some(ann => {
                            if (!ann.target_type || ann.target_type === 'all') return true;
                            if (ann.target_type === 'grade') return String(studentGrade) === ann.target_grade;
                            if (ann.target_type === 'class') return ann.target_class === className;
                            if (ann.target_type === 'individual') return ann.target_student_ids?.includes(studentId);
                            return false;
                        });
                    }
                }

                return new Response(JSON.stringify(results), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            return new Response("Invalid action", { status: 400, headers: corsHeaders });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    }
};
