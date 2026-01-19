import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        // Fetch all active students with enrollment date
        const { data: students } = await supabase
            .from('students')
            .select('full_name, enrollment_date')
            .eq('status', 'active');

        const data = await getEnhancedJlptStats(students || []);
        return NextResponse.json(data);
    } catch (error) {
        console.error('JLPT Stats Error:', error);
        return NextResponse.json({ error: 'Failed to fetch enhanced JLPT stats' }, { status: 500 });
    }
}
