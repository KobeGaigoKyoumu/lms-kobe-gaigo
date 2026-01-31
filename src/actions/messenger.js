'use server'

import { createClient } from '@supabase/supabase-js';
import { getStudentSession } from '@/app/actions/studentAuth';

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Init Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Get Messenger Connection Status for Current Student
 */
export async function getMessengerStatus() {
    const session = await getStudentSession();
    if (!session) return { connected: false, error: 'Unauthorized' };

    // Use admin client to query students table securely
    const { data: student, error } = await supabase
        .from('students')
        .select('facebook_psid')
        .eq('student_id_text', session.studentId)
        .single();

    if (error || !student) {
        return { connected: false, error: 'Student not found' };
    }

    console.log(`Checking Messenger status for: ${session.studentId}`);
    return {
        connected: !!student.facebook_psid,
        studentId: session.studentId,
        psid: student.facebook_psid // Added for internal debug linkage check
    };
}


/**
 * Get Page ID for m.me links
 */
export async function getPageId() {
    if (!FB_PAGE_ACCESS_TOKEN) return null;

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${FB_PAGE_ACCESS_TOKEN}`);
        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error("Error fetching Page ID:", error);
        return null;
    }
}

/**
 * Send Broadcast Message
 * @param {string} message - The text message to send
 * @param {string} targetType - 'all', 'class', 'course', or 'students'
 * @param {string|Array} targetValue - Class name, Course ID, or array of student IDs
 */
export async function sendBroadcast(message, targetType, targetValue) {
    if (!FB_PAGE_ACCESS_TOKEN) {
        return { success: false, error: 'Facebook Page Access Token is missing.' };
    }

    try {
        // 1. Fetch Target Students
        let query = supabase.from('students').select('student_id_text, facebook_psid, full_name').not('facebook_psid', 'is', null);

        if (targetType === 'class') {
            query = query.eq('class_name', targetValue);
        } else if (targetType === 'students') {
            query = query.in('student_id_text', targetValue);
        } else if (targetType === 'course') {
            // Fetch students enrolled in the course
            const { data: enrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select('student_id')
                .eq('course_id', targetValue);

            if (enrollError) throw enrollError;

            const studentIds = enrollments.map(e => e.student_id);
            if (studentIds.length === 0) return { success: true, count: 0, message: 'No students enrolled in this course.' };

            // Re-apply to query
            query = query.in('student_id_text', studentIds); // Assuming student_id in enrollments matches student_id_text
            // Note: Check if enrollments.student_id is UUID or Text. 
            // Usually enrollments link to users(id) or students(student_id_text).
            // Based on typical schema, enrollments.student_id is likely the user UUID or student ID.
            // If it's UUID, we need to join with profiles/students.
            // Let's assume standard LMS structure: enrollments.student_id is usually a UUID references users.id.
            // But 'students' table uses 'student_id_text'.
            // We need to resolve UUID -> student_id_text OR join differently.

            // Correction: Let's fetch the student_id_text from profiles/students via the UUID.
            const { data: profiles, error: profileError } = await supabase
                .from('profiles') // Assuming profiles maps id (uuid) to student_id_text
                .select('student_id_text')
                .in('id', studentIds);

            if (profileError) throw profileError;

            const finalStudentIds = profiles.map(p => p.student_id_text).filter(Boolean);
            query = query.in('student_id_text', finalStudentIds);
        }
        // If 'all', no extra filter needed (beyond psid check)

        const { data: students, error } = await query;

        console.log(`Broadcast Target Students Found: ${students?.length || 0}`);
        if (students) {
            console.log('Target PSIDs:', students.map(s => s.facebook_psid));
        }

        if (error) {
            console.error("Supabase Error:", error);
            return { success: false, error: error.message };
        }

        if (!students || students.length === 0) {
            console.log('No students with PSID found for this target.');
            return { success: true, count: 0, message: 'No linked students found for this target.' };
        }

        // 2. Send Messages
        let sentCount = 0;
        let failedCount = 0;
        const errors = [];

        // Send in parallel (limit concurrency in production, but for now simple loop)
        await Promise.all(students.map(async (student) => {
            const result = await sendToPsid(student.facebook_psid, message);
            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
                errors.push({ student: student.full_name, error: result.error });
            }
        }));

        return {
            success: true,
            count: sentCount,
            failed: failedCount,
            details: failedCount > 0 ? errors : null
        };

    } catch (err) {
        console.error("Broadcast Error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Send single message to PSID via Graph API
 */
async function sendToPsid(psid, text) {
    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: psid },
                message: { text: text }
            })
        });

        const data = await response.json();

        if (data.error) {
            return { success: false, error: data.error.message };
        }
        return { success: true };

    } catch (err) {
        return { success: false, error: err.message };
    }
}
