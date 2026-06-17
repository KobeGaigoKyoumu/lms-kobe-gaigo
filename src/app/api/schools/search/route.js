import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminMemberSession } from '@/app/actions/adminAuth';
import { getEstablishmentType } from '@/lib/establishment';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const pref = searchParams.get('pref') || '';
    const establishment = searchParams.get('establishment') || ''; // 'national' | 'public' | 'private'
    const hasEnrollment = searchParams.get('hasEnrollment') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;
    const from = (page - 1) * limit;

    if (!q.trim() && !type.trim() && !pref.trim() && !hasEnrollment) {
        return NextResponse.json({ schools: [], totalCount: 0 });
    }

    try {
        const authClient = await createServerClient();
        
        // 認証・権限チェック
        const { data: { user } } = await authClient.auth.getUser();
        const adminMember = await getAdminMemberSession();
        let isTeacherOrAdmin = false;
        
        if (user) {
            const { data: profile } = await authClient
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();
            if (profile?.role === 'admin' || profile?.role === 'teacher') {
                isTeacherOrAdmin = true;
            }
        }
        if (!isTeacherOrAdmin && adminMember) {
            isTeacherOrAdmin = true;
        }

        // 学校情報の取得 (条件合致するものを全件取得)
        let query = authClient
            .from('master_schools')
            .select('code, name, school_type, prefecture, website, departments');

        if (hasEnrollment) {
            // studentsテーブルから進学先(destination)のリストを取得
            const { data: enrollDests, error: destError } = await serviceClient
                .from('students')
                .select('destination');
            if (!destError && enrollDests) {
                const uniqueDests = Array.from(new Set(enrollDests.map(d => d.destination).filter(Boolean)));
                if (uniqueDests.length > 0) {
                    query = query.in('name', uniqueDests);
                } else {
                    query = query.eq('name', 'NON_EXISTENT_SCHOOL_NAME');
                }
            }
        }

        if (q.trim()) {
            query = query.or(`name.ilike.%${q}%,kana.ilike.%${q}%,katakana.ilike.%${q}%,romaji.ilike.%${q}%,departments.ilike.%${q}%`);
        }
        if (type.trim()) {
            query = query.eq('school_type', type.trim());
        }
        if (pref.trim()) {
            query = query.eq('prefecture', pref.trim());
        }

        const { data: schoolsData, error: schoolsError } = await query
            .order('name', { ascending: true });

        if (schoolsError) {
            console.error('Database error in school search:', schoolsError);
            return NextResponse.json({ error: '検索中にエラーが発生しました。' }, { status: 500 });
        }

        let filteredSchools = schoolsData || [];

        // 設置区分の判定を付与
        filteredSchools = filteredSchools.map(school => {
            const estType = getEstablishmentType(school.name, school.school_type);
            return {
                ...school,
                establishment_type: estType
            };
        });

        // 設置区分でフィルタリング
        if (establishment) {
            const estMap = {
                national: '国立',
                public: '公立',
                private: '私立'
            };
            const targetEst = estMap[establishment];
            if (targetEst) {
                filteredSchools = filteredSchools.filter(s => s.establishment_type === targetEst);
            }
        }

        const totalCount = filteredSchools.length;
        const schools = filteredSchools.slice(from, from + limit);

        // 教師・管理者の場合、統計情報を一括取得してマージ
        if (isTeacherOrAdmin && schools.length > 0) {
            const schoolNames = schools.map(s => s.name);

            // 1. 進学者（students テーブル）の取得
            const { data: enrollmentData, error: enrollError } = await serviceClient
                .from('students')
                .select('student_id_text, destination')
                .in('destination', schoolNames);

            // 2. 合格者（student_exam_schedules テーブル）の取得
            const { data: passData, error: passError } = await serviceClient
                .from('student_exam_schedules')
                .select('student_id, school_name')
                .in('school_name', schoolNames)
                .eq('status', '合格');

            if (enrollError) console.error('Enrollment query error:', enrollError);
            if (passError) console.error('Exam pass query error:', passError);

            const safeEnrollData = enrollmentData || [];
            const safePassData = passData || [];

            // 3. 全生徒のJLPT最高合格レベルを一括取得
            const studentIds = Array.from(new Set([
                ...safeEnrollData.map(d => d.student_id_text).filter(Boolean),
                ...safePassData.map(p => p.student_id).filter(Boolean)
            ]));

            let jlptMap = {};
            let studentJlptHistory = {};
            let maxYearTermStr = '';

            if (studentIds.length > 0) {
                const { data: jlptData, error: jlptError } = await serviceClient
                    .from('grade_records')
                    .select('student_id_text, final_exam_data, year_term')
                    .in('student_id_text', studentIds)
                    .like('year_term', 'JLPT%');

                if (jlptError) console.error('JLPT query error:', jlptError);

                const safeJlptData = jlptData || [];
                const levelWeights = { 'N1': 3, 'N2': 2, 'N3': 1 };

                // 2.5. 最新のJLPTの期を特定する
                let maxYear = 0;
                let maxTerm = 0;

                const parsedJlptRecords = safeJlptData.map(r => {
                    const sId = r.student_id_text;
                    const yt = r.year_term || '';
                    let year = 0;
                    let term = 0;
                    let match = yt.match(/JLPT\s*(\d{4})年第(\d+)回/i);
                    if (match) {
                        year = parseInt(match[1], 10);
                        term = parseInt(match[2], 10);
                    } else {
                        const matchHyphen = yt.match(/JLPT\s*(\d{4})-(\d+)/i);
                        if (matchHyphen) {
                            year = parseInt(matchHyphen[1], 10);
                            term = parseInt(matchHyphen[2], 10);
                        }
                    }
                    if (year > 0) {
                        if (year > maxYear || (year === maxYear && term > maxTerm)) {
                            maxYear = year;
                            maxTerm = term;
                            maxYearTermStr = yt;
                        }
                    }
                    
                    let examData = r.final_exam_data;
                    if (typeof examData === 'string') {
                        try { examData = JSON.parse(examData); } catch (e) { examData = null; }
                    }
                    
                    return {
                        studentId: sId,
                        year,
                        term,
                        yearTermStr: yt,
                        examData
                    };
                }).filter(r => r.year > 0);

                // 各生徒の最新の期での合格レベルと、過去の最高合格レベルを分類
                parsedJlptRecords.forEach(r => {
                    const sId = r.studentId;
                    if (!studentJlptHistory[sId]) {
                        studentJlptHistory[sId] = {
                            recent: null,
                            historicalMax: null
                        };
                    }
                    
                    const isRecent = (r.year === maxYear && r.term === maxTerm);
                    
                    if (r.examData && r.examData.result === '合格') {
                        const lv = r.examData.level;
                        if (levelWeights[lv]) {
                            if (isRecent) {
                                if (!studentJlptHistory[sId].recent || levelWeights[lv] > levelWeights[studentJlptHistory[sId].recent]) {
                                    studentJlptHistory[sId].recent = lv;
                                }
                            } else {
                                if (!studentJlptHistory[sId].historicalMax || levelWeights[lv] > levelWeights[studentJlptHistory[sId].historicalMax]) {
                                    studentJlptHistory[sId].historicalMax = lv;
                                }
                            }
                        }
                    }
                });

                // 従来の jlptMap 構築 (最高レベル判定用)
                safeJlptData.forEach(r => {
                    const sId = r.student_id_text;
                    let examData = r.final_exam_data;

                    if (typeof examData === 'string') {
                        try {
                            examData = JSON.parse(examData);
                        } catch (e) {
                            examData = null;
                        }
                    }

                    if (examData && examData.result === '合格') {
                        const lv = examData.level;
                        if (levelWeights[lv]) {
                            if (!jlptMap[sId] || levelWeights[lv] > levelWeights[jlptMap[sId]]) {
                                jlptMap[sId] = lv;
                            }
                        }
                    }
                });
            }

            // 4. 学校ごとに統計を集計して学校オブジェクトにマージ
            schools.forEach(school => {
                const schoolEnrollStudents = safeEnrollData
                    .filter(d => d.destination === school.name)
                    .map(d => d.student_id_text)
                    .filter(Boolean);
                const schoolPassStudents = safePassData
                    .filter(p => p.school_name === school.name)
                    .map(p => p.student_id)
                    .filter(Boolean);

                const uniqueEnrollStudents = Array.from(new Set(schoolEnrollStudents));
                const uniquePassStudents = Array.from(new Set(schoolPassStudents));

                // 合格したが進学しなかった者
                const passOnlyStudents = uniquePassStudents.filter(sId => !uniqueEnrollStudents.includes(sId));

                // 統計対象のユニークな生徒全員（合格者＋進学者）
                const uniqueStudents = Array.from(new Set([...uniqueEnrollStudents, ...uniquePassStudents]));

                if (uniqueStudents.length > 0) {
                    let n1Count = 0;
                    let n2Count = 0;
                    let n3Count = 0;

                    uniqueStudents.forEach(sId => {
                        const maxLevel = jlptMap[sId];
                        if (maxLevel === 'N1') n1Count++;
                        else if (maxLevel === 'N2') n2Count++;
                        else if (maxLevel === 'N3') n3Count++;
                    });

                    const totalWithJlpt = n1Count + n2Count + n3Count;
                    const totalStudents = uniqueStudents.length;

                    // 直近合格トレンドの集計
                    let recentCount = 0;
                    let recentN1 = 0;
                    let recentN2 = 0;
                    let recentN3 = 0;

                    uniqueStudents.forEach(sId => {
                        const history = studentJlptHistory[sId];
                        if (history && history.recent) {
                            recentCount++;
                            if (history.recent === 'N1') recentN1++;
                            else if (history.recent === 'N2') recentN2++;
                            else if (history.recent === 'N3') recentN3++;
                        }
                    });

                    const displaySession = maxYearTermStr ? maxYearTermStr.replace('JLPT', '').trim() : '';
                    let trendText = `直近の試験期 (${displaySession}) の新たな合格者はありません。`;
                    if (recentCount > 0) {
                        const details = [];
                        if (recentN1 > 0) details.push(`N1: ${recentN1}人`);
                        if (recentN2 > 0) details.push(`N2: ${recentN2}人`);
                        if (recentN3 > 0) details.push(`N3: ${recentN3}人`);
                        trendText = `直近の試験期 (${displaySession}) で新たに ${recentCount}人が合格 (${details.join(', ')}) 📈`;
                    }

                    school.stats = {
                        passCount: passOnlyStudents.length, // 合格者（進学者を除く）
                        enrollCount: uniqueEnrollStudents.length, // 進学者
                        jlpt: {
                            total: totalStudents,
                            N1: n1Count,
                            N2: n2Count,
                            N3: n3Count,
                            N1_rate: parseFloat((n1Count / totalStudents * 100).toFixed(1)),
                            N2_rate: parseFloat((n2Count / totalStudents * 100).toFixed(1)),
                            N3_rate: parseFloat((n3Count / totalStudents * 100).toFixed(1)),
                            overN3_rate: parseFloat((totalWithJlpt / totalStudents * 100).toFixed(1)),
                            trend: {
                                recentSession: displaySession,
                                recentCount,
                                recentBreakdown: { N1: recentN1, N2: recentN2, N3: recentN3 },
                                text: trendText
                            }
                        }
                    };
                } else {
                    school.stats = null;
                }
            });
        }

        return NextResponse.json({
            schools,
            totalCount: totalCount || 0
        });
    } catch (err) {
        console.error('Server error in school search:', err);
        return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
    }
}
