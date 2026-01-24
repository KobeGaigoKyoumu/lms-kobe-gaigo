'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientJs } from '@supabase/supabase-js'
import { getEnhancedJlptStats, getAccurateGraduationStats, getStudentsJlptSummary, getJlptData, getJlptSectionScoreStats } from '@/lib/jlpt'

export async function fetchJlptAnalyticsData() {
    console.log('Server Action: Fetching JLPT Analytics Data...');
    let students = []
    let fetchError = null
    let allFetchedData = [] // Store raw data for later access
    let dataSource = 'cookie'
    let statusDistribution = {}
    let totalFetched = 0
    let authDebug = {}
    let envDebug = {}

    try {
        // Analytics requires ALL data (active + graduated). 
        // Standard RLS might hide graduated students from standard users.
        // We prioritize Service Role Key to ensure we have the full dataset.

        let data = null;
        let error = null;
        let supabase;
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            // Trigger redeploy to pick up new env vars
            console.log('Server Action: Using Service Role Key for full analytics access');
            const adminSupabase = createClientJs(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                { auth: { persistSession: false } }
            );

            const adminResult = await adminSupabase.from('students').select('*').range(0, 9999);

            if (adminResult.data) {
                data = adminResult.data;
                allFetchedData = data;
                dataSource = 'service_role';
            } else {
                error = adminResult.error;
                console.error('Server Action: Service Role fetch failed', error);
            }
        }

        // Fallback to Cookie Auth if Service Role failed or not available
        if (!data || data.length === 0) {
            console.log('Server Action: Falling back to Cookie Session (RLS active)');
            supabase = await createClient();

            const { data: userUser, error: authError } = await supabase.auth.getUser();
            authDebug = { hasUser: !!userUser?.user, userId: userUser?.user?.id, error: authError?.message };

            let res = await supabase.from('students').select('*').range(0, 9999);
            data = res.data;
            error = res.error; // Keep error if this also fails

            if (data) {
                allFetchedData = data;
                dataSource = 'cookie';
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
        sectionScores: null, // 科目別得点データ
        error: fetchError,
        debug: {
            studentsFound: students.length,
            totalFetched,
            statusDistribution,
            dataSource,
            auth: authDebug,
            env: envDebug
        }
    }

    try {
        // 1. Basic Stats (for charts)
        const jlptData = await getJlptData();
        result.stats = jlptData;

        // 2. Enhanced Stats (Overall & Class Analysis)
        // We pass ALL fetched students (including inactive) for accurate historical stats calculation
        const enhancedStats = await getEnhancedJlptStats(allFetchedData || []);

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

        // 3.5. All Students Summary (for Database Tab)
        // Includes both active and inactive/past students
        if (allFetchedData && allFetchedData.length > 0) {
            const allStudentSummaries = await getStudentsJlptSummary(allFetchedData);
            enhancedStats.allStudentStats = allStudentSummaries;
        } else {
            enhancedStats.allStudentStats = [];
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

        // 5. Section Scores (科目別得点)
        const sectionScores = await getJlptSectionScoreStats();
        result.sectionScores = sectionScores;

    } catch (calcError) {
        console.error('Server Action: Calculation Error', calcError);
        result.error = result.error || 'Calculation Error: ' + calcError.message;
    }

    // Serialize to ensure it can be passed to client
    return JSON.parse(JSON.stringify(result));
}
