'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientJs } from '@supabase/supabase-js'
import { getEnhancedJlptStats, getAccurateGraduationStats, getStudentsJlptSummary, getJlptData } from '@/lib/jlpt'

export async function fetchJlptAnalyticsData() {
    console.log('Server Action: Fetching JLPT Analytics Data...');
    let students = []
    let fetchError = null
    let dataSource = 'cookie'
    let statusDistribution = {}
    let totalFetched = 0

    try {
        // 1. Try with authenticated client via cookies (same as Server Components)
        let supabase = await createClient()

        console.log('Server Action: Init Supabase with Cookie Session');

        // Fetch specific fields needed for filtering and class info
        // We fetch ALL students initially to debug status issues if any
        let { data, error } = await supabase
            .from('students')
            .select('full_name, enrollment_date, student_id, student_id_text, class_name, status');

        // 2. Fallback: If cookie auth returned no data (likely RLS issue), try Service Role Key
        if ((!data || data.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.log('Server Action: Cookie session yielded 0 results. Switching to Service Role Key...');
            try {
                const adminSupabase = createClientJs(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY,
                    { auth: { persistSession: false } }
                );
                const adminResult = await adminSupabase
                    .from('students')
                    .select('full_name, enrollment_date, student_id, student_id_text, class_name, status');

                if (adminResult.data && adminResult.data.length > 0) {
                    data = adminResult.data;
                    error = adminResult.error;
                    dataSource = 'service_role';
                    console.log(`Server Action: Successfully fetched ${data.length} records with Service Role Key`);
                }
            } catch (adminErr) {
                console.error('Server Action: Service Role Fallback failed', adminErr);
            }
        }

        if (error) {
            console.error('Server Action: DB Error', error)
            fetchError = 'Database Error: ' + error.message
        } else if (data) {
            totalFetched = data.length;
            console.log(`Server Action: Fetched ${totalFetched} students from DB using ${dataSource}`);

            // Log status distribution for debugging
            data.forEach(s => {
                const st = s.status || 'null';
                statusDistribution[st] = (statusDistribution[st] || 0) + 1;
            });
            console.log('Server Action: Student Status Distribution:', statusDistribution);

            // Filter for active students
            // NOTE: Using loose matching implicitly by trusting the 'active' string
            const activeStudents = data.filter(s => s.status === 'active');
            console.log(`Server Action: Active students count: ${activeStudents.length}`);

            students = activeStudents.length > 0 ? activeStudents : [];
        }
    } catch (e) {
        console.error('Server Action: Unexpected error', e)
        fetchError = 'Unexpected Error: ' + e.message
    }

    // Initialize return data structure
    const result = {
        stats: [],
        enhanced: {
            students: [],
            studentStats: [],
            levelStats: [],
            yearlyTrend: [],
            nationalityStats: [],
            overallN3PlusRate: null,
            graduationN3PlusRates: null,
            graduationDataSource: 'none'
        },
        error: fetchError,
        debug: {
            studentsFound: students.length,
            totalFetched,
            statusDistribution,
            dataSource
        }
    }

    try {
        // 1. Basic Stats (for charts)
        const jlptData = await getJlptData();
        result.stats = jlptData;

        // 2. Enhanced Stats (Overall & Class Analysis)
        // We pass the fetched students for class mapping
        const enhancedStats = await getEnhancedJlptStats(students);

        // 3. Student Summaries (Class Analysis)
        if (students.length > 0) {
            const studentSummaries = await getStudentsJlptSummary(students);
            enhancedStats.studentStats = studentSummaries;

            enhancedStats.students = students.map(s => ({
                id: s.student_id_text || s.student_id,
                name: s.full_name,
                class: s.class_name
            }));
        } else {
            enhancedStats.studentStats = [];
            enhancedStats.students = [];
        }

        // 4. Graduation Stats
        const accurateGradStats = await getAccurateGraduationStats();
        if (accurateGradStats.source === 'official') {
            enhancedStats.graduationN3PlusRates = accurateGradStats.stats;
            enhancedStats.graduationDataSource = 'official';
            if (accurateGradStats.summary) {
                enhancedStats.overallN3PlusRate = {
                    totalUniqueStudents: accurateGradStats.summary.total_graduates,
                    n3PlusStudents: accurateGradStats.summary.n3_plus_count,
                    rate: accurateGradStats.summary.n3_plus_rate.toFixed(1)
                };
            }
        } else {
            enhancedStats.graduationDataSource = 'calculated';
        }

        result.enhanced = enhancedStats;

    } catch (calcError) {
        console.error('Server Action: Calculation Error', calcError);
        result.error = result.error || 'Calculation Error: ' + calcError.message;
    }

    // Serialize to ensure it can be passed to client
    return JSON.parse(JSON.stringify(result));
}
