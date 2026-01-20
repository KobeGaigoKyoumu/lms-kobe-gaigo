import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEnhancedJlptStats, getAccurateGraduationStats } from '@/lib/jlpt';


export async function GET() {
    let students = [];

    // Attempt to fetch students for filtering, but don't fail the whole request if DB is unreachable
    try {
        const supabase = await createClient();

        // Fetch specific fields needed for filtering
        const { data, error } = await supabase
            .from('students')
            .select('full_name, enrollment_date, student_id')
            .eq('status', 'active');

        if (!error && data) {
            students = data;
        }
    } catch (dbError) {
        // Log DB error but continue to return stats (unfiltered)
        console.error('JLPT API: Failed to fetch students from DB', dbError);
    }

    try {
        // Get enhanced stats (calculated from JLPT data)
        const data = await getEnhancedJlptStats(students || []);

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
