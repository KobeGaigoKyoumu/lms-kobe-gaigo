import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AttendanceGradesClient from './AttendanceGradesClient'

export default async function StudentAttendancePage() {
    // 1. Check Student Session
    const session = await getStudentSessionLight()
    if (!session) {
        redirect('/login')
    }

    const { studentId } = session

    // 2. Fetch data using Admin Client for bypassing RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f' }}><p>システムエラー</p></div>
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch Attendance and Grade records in parallel
    const fetchAttendance = async () => {
        try {
            const workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
            if (workerUrl) {
                let targetUrl = workerUrl.startsWith('http') ? workerUrl : `https://${workerUrl}`;
                const res = await fetch(`${targetUrl}?action=get-attendance&studentId=${studentId}`, {
                    next: { revalidate: 300 } // Cache in Vercel for 5min
                });
                if (res.ok) {
                    return await res.json();
                } else {
                    throw new Error('Worker fetch failed');
                }
            } else {
                throw new Error('Worker URL not set');
            }
        } catch (e) {
            console.log('Worker attendance fetch fallback to direct DB:', e.message);
            // Fallback to Direct Supabase (Admin Client)
            const { data, error } = await supabase
                .from('attendance_records')
                .select('year, month, is_cumulative, attendance_rate, attendance_days, absence_days, late_slots')
                .eq('student_id', studentId)
                .order('year', { ascending: false })
                .order('month', { ascending: false })

            if (error) {
                console.error('Fetch attendance error:', error)
                return [];
            }
            return data || [];
        }
    };

    const fetchGrades = async () => {
        const { data, error } = await supabase
            .from('grade_records')
            .select('*')
            .eq('student_id_text', studentId)
            .order('year_term', { ascending: false })

        if (error) {
            console.error('Fetch grades error:', error)
            return [];
        }
        return data || [];
    };

    const [attendanceRecords, gradeRecords] = await Promise.all([
        fetchAttendance(),
        fetchGrades()
    ]);

    return (
        <AttendanceGradesClient 
            attendanceRecords={attendanceRecords} 
            gradeRecords={gradeRecords} 
        />
    )
}

