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

        // 学校情報の取得
        let schoolsData = [];
        let schoolsError = null;

        if (hasEnrollment) {
            // studentsテーブルから進学先(destination)のリストを取得
            const { data: enrollDests, error: destError } = await serviceClient
                .from('students')
                .select('destination');
            
            if (destError) {
                console.error('Database error in fetching enroll destinations:', destError);
                return NextResponse.json({ error: '検索中にエラーが発生しました。' }, { status: 500 });
            }

            const uniqueDests = Array.from(new Set(enrollDests?.map(d => d.destination).filter(Boolean) || []));
            if (uniqueDests.length > 0) {
                const chunkSize = 30; // URL長制限を防ぐため30件ずつ
                const promises = [];
                for (let i = 0; i < uniqueDests.length; i += chunkSize) {
                    const chunk = uniqueDests.slice(i, i + chunkSize);
                    let chunkQuery = authClient
                        .from('master_schools')
                        .select('code, name, school_type, prefecture, website, departments')
                        .in('name', chunk);

                    if (q.trim()) {
                        chunkQuery = chunkQuery.or(`name.ilike.%${q}%,kana.ilike.%${q}%,katakana.ilike.%${q}%,romaji.ilike.%${q}%,departments.ilike.%${q}%`);
                    }
                    if (type.trim()) {
                        chunkQuery = chunkQuery.eq('school_type', type.trim());
                    }
                    if (pref.trim()) {
                        chunkQuery = chunkQuery.eq('prefecture', pref.trim());
                    }
                    promises.push(chunkQuery);
                }

                const results = await Promise.all(promises);
                for (const res of results) {
                    if (res.error) {
                        schoolsError = res.error;
                        break;
                    }
                    if (res.data) {
                        schoolsData.push(...res.data);
                    }
                }
                if (!schoolsError) {
                    // 重複排除とソート
                    const seen = new Set();
                    schoolsData = schoolsData.filter(s => {
                        if (seen.has(s.name)) return false;
                        seen.add(s.name);
                        return true;
                    });
                    schoolsData.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
                }
            } else {
                schoolsData = [];
            }
        } else {
            let baseQuery = authClient
                .from('master_schools')
                .select('code, name, school_type, prefecture, website, departments');

            if (q.trim()) {
                baseQuery = baseQuery.or(`name.ilike.%${q}%,kana.ilike.%${q}%,katakana.ilike.%${q}%,romaji.ilike.%${q}%,departments.ilike.%${q}%`);
            }
            if (type.trim()) {
                baseQuery = baseQuery.eq('school_type', type.trim());
            }
            if (pref.trim()) {
                baseQuery = baseQuery.eq('prefecture', pref.trim());
            }

            const { data, error } = await baseQuery.order('name', { ascending: true });
            schoolsData = data || [];
            schoolsError = error;
        }

        if (schoolsError) {
            console.error('Database error in school search:', schoolsError);
            return NextResponse.json({ error: '検索中にエラーが発生しました。' }, { status: 500 });
        }

        let filteredSchools = schoolsData;

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
                .select('student_id_text, full_name, destination, academic_year')
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
            let idToNameMap = {};
            let idToYearMap = {};

            if (studentIds.length > 0) {
                // Get student names and academic years for those IDs in batches of 100 to avoid URL too long error (500)
                let dbStudents = [];
                const batchSize = 100;
                for (let i = 0; i < studentIds.length; i += batchSize) {
                    const chunk = studentIds.slice(i, i + batchSize);
                    const { data: chunkStudents, error: chunkErr } = await serviceClient
                        .from('students')
                        .select('student_id_text, full_name, academic_year')
                        .in('student_id_text', chunk);
                    if (chunkErr) console.error('dbStudents batch error:', chunkErr);
                    if (chunkStudents) dbStudents.push(...chunkStudents);
                }

                const studentNames = [];
                if (dbStudents) {
                    dbStudents.forEach(s => {
                        if (s.full_name) {
                            studentNames.push(s.full_name);
                            idToNameMap[s.student_id_text] = s.full_name;
                        }
                        if (s.academic_year) {
                            idToYearMap[s.student_id_text] = s.academic_year;
                        }
                    });
                }

                // Query by ID and Name in batches of 100 to catch mismatch examinee IDs
                let jlptData = [];
                for (let i = 0; i < studentIds.length; i += batchSize) {
                    const chunk = studentIds.slice(i, i + batchSize);
                    const { data: chunkJlpt, error: chunkErr } = await serviceClient
                        .from('grade_records')
                        .select('student_id_text, student_name, final_exam_data, year_term')
                        .in('student_id_text', chunk)
                        .like('year_term', 'JLPT%');
                    if (chunkErr) console.error('jlptById batch error:', chunkErr);
                    if (chunkJlpt) jlptData.push(...chunkJlpt);
                }

                if (studentNames.length > 0) {
                    let jlptByName = [];
                    for (let i = 0; i < studentNames.length; i += batchSize) {
                        const chunk = studentNames.slice(i, i + batchSize);
                        const { data: chunkJlpt, error: chunkErr } = await serviceClient
                            .from('grade_records')
                            .select('student_id_text, student_name, final_exam_data, year_term')
                            .in('student_name', chunk)
                            .like('year_term', 'JLPT%');
                        if (chunkErr) console.error('jlptByName batch error:', chunkErr);
                        if (chunkJlpt) jlptByName.push(...chunkJlpt);
                    }

                    const existingKeys = new Set(jlptData.map(r => `${r.student_id_text}|${r.year_term}`));
                    jlptByName.forEach(r => {
                        const key = `${r.student_id_text}|${r.year_term}`;
                        if (!existingKeys.has(key)) {
                            jlptData.push(r);
                        }
                    });
                }

                // Map name to student ID to resolve examinee number mismatches
                const nameToId = {};
                for (const [id, name] of Object.entries(idToNameMap)) {
                    const norm = name.toLowerCase().replace(/[\s\u3000]/g, '');
                    nameToId[norm] = id;
                }

                const safeJlptData = jlptData.map(r => {
                    let sId = r.student_id_text;
                    if (!idToNameMap[sId] && r.student_name) {
                        const norm = r.student_name.toLowerCase().replace(/[\s\u3000]/g, '');
                        if (nameToId[norm]) {
                            sId = nameToId[norm];
                        }
                    }
                    return {
                        ...r,
                        student_id_text: sId
                    };
                });
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

                    // 直近3か年の進学者のN3以上保有率の集計と難化・易化傾向の分析
                    const enrollYears = uniqueEnrollStudents.map(sId => idToYearMap[sId]).filter(Boolean);
                    const maxYear = enrollYears.length > 0 ? Math.max(...enrollYears) : 2024;
                    const targetYears = [maxYear - 2, maxYear - 1, maxYear];

                    const yearStats = {};
                    targetYears.forEach(y => {
                        yearStats[y] = { total: 0, passed: 0 };
                    });

                    uniqueEnrollStudents.forEach(sId => {
                        const yr = idToYearMap[sId];
                        if (yr && targetYears.includes(yr)) {
                            yearStats[yr].total++;
                            const maxLevel = jlptMap[sId];
                            if (maxLevel === 'N1' || maxLevel === 'N2' || maxLevel === 'N3') {
                                yearStats[yr].passed++;
                            }
                        }
                    });

                    const rates = targetYears.map(y => {
                        const stats = yearStats[y];
                        const rate = stats.total > 0 ? parseFloat(((stats.passed / stats.total) * 100).toFixed(1)) : null;
                        return { year: y, rate, total: stats.total, passed: stats.passed };
                    });

                    const validRates = rates.filter(r => r.total > 0);
                    let trendText = '直近の進学者データが不足しているため、進学の難化・易化の傾向を判定できません。';
                    let trendLabel = '判定不可';

                    if (validRates.length >= 2) {
                        const rateDetails = rates.map(r => {
                            if (r.total > 0) {
                                return `${r.year}年度: ${r.rate}% (${r.passed}/${r.total}人)`;
                            }
                            return `${r.year}年度: データなし`;
                        }).join(' ➡️ ');

                        const first = validRates[0];
                        const last = validRates[validRates.length - 1];
                        const diff = last.rate - first.rate;

                        if (diff > 5) {
                            trendLabel = '難化傾向';
                            trendText = `直近3か年のN3以上保有率 (${rateDetails})。進学者に占めるN3以上保有率が上昇しており、進学基準の難化（学生レベルの向上）傾向が見られます。📊`;
                        } else if (diff < -5) {
                            trendLabel = '易化傾向';
                            trendText = `直近3か年のN3以上保有率 (${rateDetails})。進学者に占めるN3以上保有率が低下しており、進学難易度の易化（入りやすくなっている）傾向が見られます。📊`;
                        } else {
                            trendLabel = '安定傾向';
                            trendText = `直近3か年のN3以上保有率 (${rateDetails})。進学者に占めるN3以上保有率は横ばいで、進学難易度は安定しています。📊`;
                        }
                    } else if (validRates.length === 1) {
                        const r = validRates[0];
                        trendText = `直近3か年のうち${r.year}年度のみ進学者実績あり (${r.rate}% [${r.passed}/${r.total}人])。複数年のデータがないため、難易度の傾向は判定できません。`;
                        trendLabel = '安定（単年データ）';
                    }

                    const displaySession = maxYearTermStr ? maxYearTermStr.replace('JLPT', '').trim() : '';

                    school.stats = {
                        passCount: uniqueStudents.length, // 合格者（進学者を含む総数）
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
                                label: trendLabel,
                                text: trendText,
                                recentSession: displaySession,
                                recentCount,
                                recentBreakdown: { N1: recentN1, N2: recentN2, N3: recentN3 }
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
