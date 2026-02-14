'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientJs } from '@supabase/supabase-js'
import { getEnhancedJlptStats, getAccurateGraduationStats, getStudentsJlptSummary, getJlptData, getJlptSectionScoreStats } from '@/lib/jlpt'
import { unstable_cache } from 'next/cache'

// Cache the entire analytics computation for 1 hour
// Key: 'jlpt-analytics-v2' (fresh key to avoid stale data from previous deployments)
const getCachedAnalytics = unstable_cache(
    async () => {
        console.log('Cache MISS: Computing JLPT Analytics from scratch...');
        let students = []
        let fetchError = null
        let allFetchedData = []
        let dataSource = 'cookie'
        let statusDistribution = {}
        let totalFetched = 0

        try {
            let data = null;
            let error = null;
            let supabase;
            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                console.log('Server Action: Using Service Role Key for full analytics access');
                const adminSupabase = createClientJs(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY,
                    { auth: { persistSession: false } }
                );

                const adminResult = await adminSupabase
                    .from('students')
                    .select('student_id_text, full_name, class_name, status, enrollment_date')
                    .range(0, 9999);

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

                let res = await supabase
                    .from('students')
                    .select('student_id_text, full_name, class_name, status, enrollment_date')
                    .range(0, 9999);
                data = res.data;
                error = res.error;

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

                data.forEach(s => {
                    const st = s.status || 'null';
                    statusDistribution[st] = (statusDistribution[st] || 0) + 1;
                });

                const activeStudents = data.filter(s => s.status === 'active');
                students = activeStudents.length > 0 ? activeStudents : [];
            }
        } catch (e) {
            console.error('Server Action: Unexpected error', e)
            fetchError = 'Unexpected Error: ' + e.message
        }

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
            sectionScores: null,
            error: fetchError,
        }

        try {
            // 1. Basic Stats (for charts)
            result.stats = await getJlptData();

            // 2. Enhanced Stats (Overall & Class Analysis)
            const enhancedStats = await getEnhancedJlptStats(allFetchedData || []);

            // 3. Student Summaries (Class Analysis)
            if (students.length > 0) {
                const studentSummaries = await getStudentsJlptSummary(students);
                enhancedStats.studentStats = studentSummaries;

                enhancedStats.students = students.map(s => ({
                    id: s.student_id_text,
                    name: s.full_name,
                    class: s.class_name
                }));
            } else {
                enhancedStats.studentStats = [];
                enhancedStats.students = [];
            }

            // 3.5. All Students Summary (for Database Tab)
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

        return JSON.parse(JSON.stringify(result));
    },
    ['jlpt-analytics-v2'],
    { revalidate: 86400, tags: ['jlpt-analytics'] }
);

const result = await getCachedAnalytics();

// Proactively push to Cloudflare KV for the frontend to use if not error
if (result && !result.error) {
    try {
        const { pushCloudflareSnapshot } = await import('./cloudflare');
        // We push the enhanced stats specifically
        await pushCloudflareSnapshot('jlpt', result);
    } catch (e) {
        console.error('Proactive snapshot push failed:', e);
    }
}

return result;
}
