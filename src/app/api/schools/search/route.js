import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminMemberSession } from '@/app/actions/adminAuth';
import { getEstablishmentType } from '@/lib/establishment';
import careerStatsData from '@/data/career_stats_v2.json';

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

    // Build normalized search terms (handling spaces and full-width/half-width conversions)
    let searchOrConditions = '';
    if (q.trim()) {
        const originalQ = q.trim();
        const cleanQ = q.replace(/[\s\u3000]/g, '');
        
        const toFullWidth = (str) => {
            return str.replace(/[A-Za-z0-9]/g, (s) => {
                return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
            });
        };
        const toHalfWidth = (str) => {
            return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            });
        };

        const searchTerms = new Set();
        [originalQ, cleanQ].forEach(term => {
            searchTerms.add(term);
            searchTerms.add(toFullWidth(term));
            searchTerms.add(toHalfWidth(term));
        });

        const uniqueTerms = Array.from(searchTerms).filter(Boolean);
        const orParts = [];
        uniqueTerms.forEach(term => {
            orParts.push(`name.ilike.%${term}%,kana.ilike.%${term}%,katakana.ilike.%${term}%,romaji.ilike.%${term}%,departments.ilike.%${term}%`);
        });
        searchOrConditions = orParts.join(',');
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

                    if (searchOrConditions) {
                        chunkQuery = chunkQuery.or(searchOrConditions);
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

            if (searchOrConditions) {
                baseQuery = baseQuery.or(searchOrConditions);
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
            // 成績・進路分析ダッシュボードと同様に名寄せされた学生JLPT統計情報を動的ロード
            const { getCachedStudentList } = require('@/app/actions/studentData');
            const { getStudentsJlptSummary } = require('@/lib/jlpt');
            const students = await getCachedStudentList();
            const studentSummaries = await getStudentsJlptSummary(students || []);

            // 最新のJLPTの期を特定する
            let maxYear = 0;
            let maxTerm = 0;
            let maxYearTermStr = '';

            studentSummaries.forEach(student => {
                (student.records || []).forEach(r => {
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
                });
            });

            const toHalfWidth = (str) => {
                if (!str) return '';
                return str.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (s) => {
                    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                }).replace(/[\s\u3000]/g, '');
            };
            const normSchoolName = (n) => toHalfWidth(n.toLowerCase());

            schools.forEach(school => {
                const dest = careerStatsData.topDestinations?.find(d => normSchoolName(d.name) === normSchoolName(school.name));
                const destStudents = dest?.students || [];

                // 各進学者についてstudentSummariesとIDまたは名前で名寄せマッチング
                const matchedInfo = [];
                destStudents.forEach(s => {
                    const dbStudent = studentSummaries.find(dbStudent => 
                        (dbStudent.studentId && s.id && String(dbStudent.studentId) === String(s.id)) ||
                        (dbStudent.name && s.name && dbStudent.name === s.name)
                    );
                    if (dbStudent) {
                        matchedInfo.push({
                            student: dbStudent,
                            year: s.year ? parseInt(s.year, 10) : null
                        });
                    }
                });

                if (destStudents.length > 0) {
                    let n1Count = 0;
                    let n2Count = 0;
                    let n3Count = 0;

                    matchedInfo.forEach(info => {
                        const maxLevel = info.student.highestLevel;
                        if (maxLevel === 'N1') n1Count++;
                        else if (maxLevel === 'N2') n2Count++;
                        else if (maxLevel === 'N3') n3Count++;
                    });

                    const totalWithJlpt = n1Count + n2Count + n3Count;
                    const totalStudents = matchedInfo.length;

                    // 直近合格トレンドの集計（最新の期maxYear, maxTermでの合格者）
                    let recentCount = 0;
                    let recentN1 = 0;
                    let recentN2 = 0;
                    let recentN3 = 0;

                    matchedInfo.forEach(info => {
                        const recentPass = (info.student.records || []).find(r => {
                            let year = 0;
                            let term = 0;
                            const yt = r.year_term || '';
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
                            return year === maxYear && term === maxTerm && r.result === '合格';
                        });

                        if (recentPass) {
                            recentCount++;
                            if (recentPass.level === 'N1') recentN1++;
                            else if (recentPass.level === 'N2') recentN2++;
                            else if (recentPass.level === 'N3') recentN3++;
                        }
                    });

                    // 直近3か年の進学者のN3以上保有率の集計と難化・易化傾向の分析
                    const enrollYears = matchedInfo.map(m => m.year).filter(Boolean);
                    const schoolMaxYear = enrollYears.length > 0 ? Math.max(...enrollYears) : 2024;
                    const targetYears = [schoolMaxYear - 2, schoolMaxYear - 1, schoolMaxYear];

                    const yearStats = {};
                    targetYears.forEach(y => {
                        yearStats[y] = { total: 0, passed: 0 };
                    });

                    matchedInfo.forEach(info => {
                        const yr = info.year;
                        if (yr && targetYears.includes(yr)) {
                            yearStats[yr].total++;
                            const maxLevel = info.student.highestLevel;
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
                        passCount: destStudents.length, // ダッシュボードの合格者（進学者数）表示と同期
                        enrollCount: destStudents.length, // 進学者数
                        jlpt: {
                            total: totalStudents,
                            N1: n1Count,
                            N2: n2Count,
                            N3: n3Count,
                            N1_rate: totalStudents > 0 ? parseFloat((n1Count / totalStudents * 100).toFixed(1)) : 0,
                            N2_rate: totalStudents > 0 ? parseFloat((n2Count / totalStudents * 100).toFixed(1)) : 0,
                            N3_rate: totalStudents > 0 ? parseFloat((n3Count / totalStudents * 100).toFixed(1)) : 0,
                            overN3_rate: totalStudents > 0 ? parseFloat((totalWithJlpt / totalStudents * 100).toFixed(1)) : 0,
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
