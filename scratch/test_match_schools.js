const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

const textPath = path.join(__dirname, 'pdf_text.txt');
const content = fs.readFileSync(textPath, 'utf8');
const lines = content.split('\n');

const courseKeywords = [
    '工業専門課程', '農業専門課程', '医療専門課程', '衛生専門課程',
    '教育・社会福祉専門課程', '教育社会福祉専門課程', '商業実務専門課程',
    '服飾・家政専門課程', '文化・教養専門課程', '国際交流専門課程',
    '自動車整備専門課程', '家庭専門課程', '家政専門課程', '服飾専門課程',
    '専門課程'
];

function parsePDF() {
    const pdfSchools = new Map(); // schoolName -> Set of depts
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('文部科学大臣') || trimmed.startsWith('※') || trimmed.startsWith('表') || trimmed.startsWith('備考') || trimmed.startsWith('--')) {
            return;
        }
        
        const parts = trimmed.split('\t');
        const fullNameAndDept = parts[0].trim();
        
        for (const keyword of courseKeywords) {
            if (fullNameAndDept.includes(keyword)) {
                const index = fullNameAndDept.indexOf(keyword);
                const schoolName = fullNameAndDept.substring(0, index).trim();
                const deptName = fullNameAndDept.substring(index + keyword.length).trim();
                
                if (schoolName && deptName) {
                    if (!pdfSchools.has(schoolName)) {
                        pdfSchools.set(schoolName, new Set());
                    }
                    pdfSchools.get(schoolName).add(deptName);
                }
                break;
            }
        }
    });
    return pdfSchools;
}

// 揺らぎを吸収するためのクリーンアップ関数
function cleanName(name) {
    if (!name) return '';
    return name
        .replace(/[\s\u3000]/g, '') // 全角・半角スペース除去
        .replace(/[\-\-\—\–\─\━]/g, '') // ハイフン・ダッシュ類除去
        .replace(/[a-zA-Z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0)) // 半角英数字を全角へ（または逆でも良いが統一する）
        .replace(/[\(\)]/g, '') // カッコ除去
        .replace(/専門学校|専修学校|学校法人/g, ''); // 代表的なプレフィックス・サフィックスを除去（マッチング用）
}

async function run() {
    console.log("Fetching all vocational schools from database...");
    const { data: dbSchools, error } = await supabase
        .from('master_schools')
        .select('id, name, code')
        .eq('school_type', 'vocational_school');
        
    if (error) {
        console.error("DB Fetch Error:", error);
        return;
    }
    console.log(`Fetched ${dbSchools.length} vocational schools from DB.`);

    const pdfSchools = parsePDF();
    console.log(`Parsed ${pdfSchools.size} unique schools from PDF.`);

    // マッチング結果の統計
    let exactMatches = 0;
    let cleanMatches = 0;
    let partialMatches = 0;
    const unmatchedPDF = [];

    // DB学校のクリーンネームマップを作成
    const dbCleanMap = new Map(); // cleanName -> array of dbSchool
    dbSchools.forEach(school => {
        const clean = cleanName(school.name);
        if (clean) {
            if (!dbCleanMap.has(clean)) {
                dbCleanMap.set(clean, []);
            }
            dbCleanMap.get(clean).push(school);
        }
    });

    for (const [pdfSchoolName, depts] of pdfSchools.entries()) {
        // 1. 完全一致
        const exactMatch = dbSchools.find(s => s.name === pdfSchoolName);
        if (exactMatch) {
            exactMatches++;
            continue;
        }

        // 2. スペースなどクリーン後一致
        const pdfClean = cleanName(pdfSchoolName);
        const cleanMatchList = dbCleanMap.get(pdfClean);
        if (cleanMatchList && cleanMatchList.length > 0) {
            cleanMatches++;
            continue;
        }

        // 3. 部分一致（DB側学校名がPDF学校名に含まれる、またはその逆）
        let foundPartial = false;
        for (const dbSchool of dbSchools) {
            const dbClean = cleanName(dbSchool.name);
            if (dbClean && pdfClean && (pdfClean.includes(dbClean) || dbClean.includes(pdfClean))) {
                foundPartial = true;
                break;
            }
        }
        
        if (foundPartial) {
            partialMatches++;
        } else {
            unmatchedPDF.push({ name: pdfSchoolName, depts: Array.from(depts) });
        }
    }

    console.log(`\nMatching Summary:`);
    console.log(`Exact Matches: ${exactMatches}`);
    console.log(`Clean Matches: ${cleanMatches}`);
    console.log(`Partial Matches: ${partialMatches}`);
    console.log(`Unmatched PDF Schools: ${unmatchedPDF.length}`);
    
    console.log("\nSome unmatched PDF schools:");
    console.log(JSON.stringify(unmatchedPDF.slice(0, 15), null, 2));
}

run();
