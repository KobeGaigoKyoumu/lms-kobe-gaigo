export default {
    async fetch(request, env) {
        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        try {
            const { studentId, senderType } = await request.json();

            if (!studentId) {
                return new Response(JSON.stringify({ error: "Missing studentId" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                });
            }

            // High-frequency 'mark-read' logic offloaded to Cloudflare
            // Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
            const supabaseUrl = env.SUPABASE_URL;
            const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

            // Simple update via REST API
            const targetType = senderType === 'teacher' ? 'student' : 'teacher'; // Mark the DIFFERENT sender's messages as read
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

            if (!res.ok) {
                const error = await res.text();
                return new Response(JSON.stringify({ error }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                });
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
        }
    }
};
