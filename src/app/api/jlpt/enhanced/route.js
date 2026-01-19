import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEnhancedJlptStats } from '@/lib/jlpt';


export async function GET() {
    let students = [];

    // Attempt to fetch students for filtering, but don't fail the whole request if DB is unreachable
    try {
        const supabase = await createClient();

        // Fetch specific fields needed for filtering
        const { data, error } = await supabase
            .from('students')
            .select('full_name, enrollment_date')
            .eq('status', 'active');

        if (!error && data) {
            students = data;
        }
    } catch (dbError) {
        // Log DB error but continue to return stats (unfiltered)
        console.error('JLPT API: Failed to fetch students from DB', dbError);
    }

    try {
        const data = await getEnhancedJlptStats(students || []);
        return NextResponse.json(data);
    } catch (error) {
        console.error('JLPT Stats Error:', error);
        return NextResponse.json({ error: 'Failed to fetch enhanced JLPT stats: ' + error.message }, { status: 500 });
    }
}
