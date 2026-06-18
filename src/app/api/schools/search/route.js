import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminMemberSession } from '@/app/actions/adminAuth';
import { getEstablishmentType } from '@/lib/establishment';
import careerStatsData from '@/data/career_stats_v2.json';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

const RAW_ALIAS_MAP = {
    'トヨタ自動車大学校神戸校': '専門学校トヨタ神戸自動車大学校',
    'トヨタ神戸自動車大学校': '専門学校トヨタ神戸自動車大学校',
    '東大阪短期大学': '東大阪大学短期大学部',
    'nikko外語専門学校': 'ｎｉｋｋｏ外語観光専門学校',
    'nikko外語観光専門学校': 'ｎｉｋｋｏ外語観光専門学校',
    '神戸外国語大学': '神戸市外国語大学',
    '神戸外国語大学研究生': '神戸市外国語大学',
    '姫路保育福祉専門学校': '姫路福祉保育専門学校',
    'ビジョンクエスト情報デザイン専門学校': 'ヴィジョンネクスト情報デザイン専門学校',
    '東京みらいit&ai専門学校': '東京みらいａｉ＆ｉｔ専門学校',
    '三鷹日商簿記専門学校': '日商簿記三鷹福祉専門学校',
    '西日本アカデミー航空専門学校': '西日本アカデミー専門学校',
    '日本モータースポーツ専門学校': '日本モータースポーツ専門学校大阪校',
    '京都コンピュータ学院': '京都コンピュータ学院京都駅前校',
    '駿台観光＆外語ビジネス専門学校': '駿台観光＆外語ビジネスカレッジ大阪',
    '栃木グローバルビジネスカレッジ': '専門学校Ｔｏｃｈｉｇｉ　Ｇｌｏｂａｌ　Ｆａｓｈｉｏｎ　Ｂｕｓｉｎｅｓｓ　Ｃｏｌｌｅｇｅ',
    '岩谷テクノビジネス専門学校': '岩谷学園よこはまＩＴビジネス専門学校',
    '麻生専門学校': '麻生情報ビジネス専門学校',
    '阪神自動車航空専門学校': '阪神自動車航空鉄道専門学校',
    'oca大阪デザイン＆it専門学校': 'ＯＣＡ大阪デザイン＆テクノロジー専門学校',
};

const hiraganaToKatakana = (str) => {
    if (!str) return '';
    return str.replace(/[\u3041-\u3096]/g, (match) => {
        return String.fromCharCode(match.charCodeAt(0) + 0x60);
    });
};

const toHalfWidth = (str) => {
    if (!str) return '';
    return str.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    }).replace(/[\s\u3000]/g, '');
};

const toFullWidth = (str) => {
    if (!str) return '';
    return str.replace(/[A-Za-z0-9]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
    });
};

const kanaHalfToFull = (str) => {
    if (!str) return '';
    const map = {
        'ｱ':'ア','ｲ':'イ','ｳ':'ウ','ｴ':'エ','ｵ':'オ',
        'ｶ':'カ','ｷ':'キ','ｸ':'ク','ｹ':'ケ','ｺ':'コ',
        'ｻ':'サ','ｼ':'シ','ｽ':'ス','ｾ':'セ','ｿ':'ソ',
        'ﾀ':'タ','ﾁ':'チ','ﾂ':'ツ','ﾃ':'テ','ﾄ':'ト',
        'ﾅ':'ナ','ﾆ':'ニ','ﾇ':'ヌ','ﾈ':'ネ','ﾉ':'ノ',
        'ﾊ':'ハ','ﾋ':'ヒ','ﾌ':'フ','ﾍ':'ヘ','ﾎ':'ホ',
        'ﾏ':'マ','ﾐ':'ミ','ﾑ':'ム','ﾒ':'メ','ﾓ':'モ',
        'ﾔ':'ヤ','ﾕ':'ユ','ﾖ':'ヨ',
        'ﾗ':'ラ','ﾘ':'リ','ﾙ':'ル','ﾚ':'レ','ﾛ':'ロ',
        'ﾜ':'ワ','ｦ':'ヲ','ﾝ':'ン',
        'ｧ':'ァ','ｨ':'ィ','ｩ':'ゥ','ｪ':'ェ','ｫ':'ォ',
        'ｬ':'ャ','ｭ':'ュ','ｮ':'ョ','ｯ':'ッ',
        'ﾞ':'゛','ﾟ':'゜','ｰ':'ー'
    };
    let res = '';
    for (let i = 0; i < str.length; i++) {
        let c = str[i];
        let next = str[i+1];
        if (next === 'ﾞ') {
            const combine = {
                'ｶ':'ガ','ｷ':'ギ','ｸ':'グ','ｹ':'ゲ','ｺ':'ゴ',
                'ｻ':'ザ','ｼ':'ジ','ｽ':'ズ','ｾ':'ゼ','ｿ':'ゾ',
                'ﾀ':'ダ','ﾁ':'ヂ','ﾂ':'ヅ','ﾃ':'デ','ﾄ':'ド',
                'ﾊ':'バ','ﾋ':'ビ','ﾌ':'ブ','ﾍ':'ベ','ﾎ':'ボ',
                'ｳ':'ヴ'
            };
            if (combine[c]) {
                res += combine[c];
                i++;
                continue;
            }
        } else if (next === 'ﾟ') {
            const combine = {
                'ﾊ':'パ','ﾋ':'ピ','ﾌ':'プ','ﾍ':'ペ','ﾎ':'ポ'
            };
            if (combine[c]) {
                res += combine[c];
                i++;
                continue;
            }
        }
        res += map[c] || c;
    }
    return res;
};

const normSchoolName = (n) => {
    if (!n) return '';
    let val = toHalfWidth(n.toLowerCase());
    val = val.replace(/[\s\u3000・\-－\(\)（）\&＆\.\/\,\\＊\*＿_]/g, '');
    val = hiraganaToKatakana(val);
    val = val.replace(/^(学校法人|専門学校|公立大学法人|国立大学法人)/, '');
    val = val.replace(/(研究生|研究科|専攻|（研究生）|\(研究生\)|研究員|別科)$/, '');
    val = val.replace(/ヴィ/g, 'ビ').replace(/ヴェ/g, 'ベ').replace(/ヴォ/g, 'ボ').replace(/ヴァ/g, 'バ').replace(/ヴ/g, 'ブ');
    val = val.replace(/ー/g, '');
    return val;
};

const ALIAS_MAP = {};
Object.entries(RAW_ALIAS_MAP).forEach(([key, val]) => {
    ALIAS_MAP[normSchoolName(key)] = normSchoolName(val);
});

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

        const searchTerms = new Set();
        [originalQ, cleanQ].forEach(term => {
            searchTerms.add(term);
            searchTerms.add(toHalfWidth(term));
            searchTerms.add(toFullWidth(term));
            searchTerms.add(kanaHalfToFull(term));
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

        if (schoolsError) {
            console.error('Database error in school search:', schoolsError);
            return NextResponse.json({ error: '検索中にエラーが発生しました。' }, { status: 500 });
        }

        let filteredSchools = schoolsData;

        // hasEnrollment が true の場合、学生の進学実績データ（students.destination）と名寄せマッチングしてフィルタリング
        if (hasEnrollment) {
            const { data: enrollDests, error: destError } = await serviceClient
                .from('students')
                .select('destination');

            if (destError) {
                console.error('Database error in fetching enroll destinations:', destError);
                return NextResponse.json({ error: '検索中にエラーが発生しました。' }, { status: 500 });
            }

            const uniqueDests = Array.from(new Set(enrollDests?.map(d => d.destination).filter(Boolean) || []));
            const destNorms = uniqueDests.map(d => {
                const dn = normSchoolName(d);
                return ALIAS_MAP[dn] || dn;
            });

            filteredSchools = filteredSchools.filter(school => {
                const sNorm = normSchoolName(school.name);
                const targetS = ALIAS_MAP[sNorm] || sNorm;
                
                // 完全一致または部分一致（キャンパス名、支校等の差を許容）
                return destNorms.some(dn => dn === targetS || dn.startsWith(targetS) || targetS.startsWith(dn));
            });
        }

        let filteredSchoolsWithEst = filteredSchools.map(school => {
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
                filteredSchoolsWithEst = filteredSchoolsWithEst.filter(s => s.establishment_type === targetEst);
            }
        }

        const totalCount = filteredSchoolsWithEst.length;
        const schools = filteredSchoolsWithEst.slice(from, from + limit);

        // 教師・管理者の場合、統計情報を一括取得してマージ
        if (isTeacherOrAdmin && schools.length > 0) {
            // 成績・進路分析ダッシュボードと同様に名寄せされた学生JLPT統計情報を動的ロード
            const { getCachedStudentList } = require('@/app/actions/studentData');
            const { getStudentsJlptSummary } = require('@/lib/jlpt');
            const students = await getCachedStudentList();
            const studentSummaries = await getStudentsJlptSummary(students || []);

            // 合格実績テーブルから合格者データを取得
            const { data: passData, error: passError } = await serviceClient
                .from('student_exam_schedules')
                .select('student_id, school_name')
                .in('school_name', schools.map(s => s.name))
                .eq('status', '合格');
            if (passError) console.error('Exam pass query error:', passError);
            const safePassData = passData || [];

            // 最新 of JLPTの期を特定する
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

            schools.forEach(school => {
                const sNorm = normSchoolName(school.name);
                const targetS = ALIAS_MAP[sNorm] || sNorm;

                // 1. エイリアスマップと正規化による完全一致検索
                let dest = careerStatsData.topDestinations?.find(d => {
                    const dNorm = normSchoolName(d.name);
                    const targetD = ALIAS_MAP[dNorm] || dNorm;
                    return targetD === targetS;
                });

                // 2. 部分一致による検索（キャンパス名や支校の差などを許容）
                if (!dest) {
                    dest = careerStatsData.topDestinations?.find(d => {
                        const dNorm = normSchoolName(d.name);
                        const targetD = ALIAS_MAP[dNorm] || dNorm;
                        return targetD.startsWith(targetS) || targetS.startsWith(targetD);
                    });
                }

                const destStudents = dest?.students || [];

                // 合格者の抽出と計算 (DB上の合格者 + 進学者データ内のID)
                const schoolPassStudents = safePassData
                    .filter(p => {
                        const pNorm = normSchoolName(p.school_name);
                        const targetP = ALIAS_MAP[pNorm] || pNorm;
                        return targetP === targetS || targetP.startsWith(targetS) || targetS.startsWith(targetP);
                    })
                    .map(p => String(p.student_id).trim())
                    .filter(Boolean);

                const uniquePassStudents = new Set(schoolPassStudents);
                destStudents.forEach(s => {
                    if (s.id) {
                        uniquePassStudents.add(String(s.id).trim());
                    }
                });

                const passCount = uniquePassStudents.size;
                const enrollCount = destStudents.length;

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

                if (destStudents.length > 0 || passCount > 0) {
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
                        passCount: passCount,
                        enrollCount: enrollCount,
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
