
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnhancedJlptStats, getAccurateGraduationStats, getStudentsJlptSummary } from '@/lib/jlpt';


export async function GET() {
    return handleJlptStats(null);
}

export async function POST(request) {
    try {
        const body = await request.json();
        return handleJlptStats(body.students);
    } catch (error) {
        // If parsing fails or no students in body, proceed without provided students
        console.error('JLPT API: Error parsing POST body or no students provided, fetching from DB instead.', error);
        return handleJlptStats(null);
    }
}

async function handleJlptStats(providedStudents) {
    let students = providedStudents || [];

    // If no students provided from client, try to fetch from DB
    if (!students || students.length === 0) {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );

            // Fetch specific fields needed for filtering and class info
            // Removed .eq('status', 'active') to ensure we get all students regardless of status
            const { data, error } = await supabase
                .from('students')
                .select('full_name, enrollment_date, student_id, student_id_text, class_name');

            if (!error && data) {
                students = data;
                console.log(`JLPT API: Fetched ${students.length} students from DB`);
            } else if (error) {
                console.error('JLPT API: Error fetching students', error);
            }
        } catch (dbError) {
            // Log DB error but continue to return stats (unfiltered)
            console.error('JLPT API: Failed to fetch students from DB', dbError);
        }
    }

    try {
        // Get enhanced stats (calculated from JLPT data)
        const data = await getEnhancedJlptStats(students || []);

        // Get student-level JLPT summary for class analysis
        // Only include necessary fields for frontend to protect privacy somewhat
        if (students && students.length > 0) {
            const studentSummaries = await getStudentsJlptSummary(students);
            data.studentStats = studentSummaries;

            // Send simplified student list for frontend filtering/mapping
            data.students = students.map(s => ({
                id: s.student_id_text || s.student_id,
                name: s.full_name,
                class: s.class_name
            }));
        }

        // Get accurate graduation stats from official school data
        const accurateGradStats = await getAccurateGraduationStats();

        // If we have official data, use it to override the calculated graduation rates
        if (accurateGradStats.source === 'official') {
            data.graduationN3PlusRates = accurateGradStats.stats;
            data.graduationDataSource = 'official';

            // Also update the overall N3+ rate with official data
            if (accurateGradStats.summary) {
                data.overallN3PlusRate = {
                    totalUniqueStudents: accurateGradStats.summary.total_graduates,
                    n3PlusStudents: accurateGradStats.summary.n3_plus_count,
                    rate: accurateGradStats.summary.n3_plus_rate.toFixed(1)
                };
            }
        } else {
            data.graduationDataSource = 'calculated';
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('JLPT Stats Error:', error);
        return NextResponse.json({ error: 'Failed to fetch enhanced JLPT stats: ' + error.message }, { status: 500 });
    }
}
