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

function normalizeName(name) {
    if (!name) return '';
    let n = name
        .replace(/[\s\u3000]/g, '') // スペース除去
        .replace(/[\-\-\—\–\─\━]/g, '') // ハイフン類除去
        .replace(/[a-zA-Z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0)) // 半角英数字を全角に
        .replace(/[\(\)（）]/g, '') // カッコ除去
        .replace(/学校法人/g, '')
        .replace(/専修学校/g, '')
        .replace(/専門学校/g, '')
        .replace(/工業専門/g, '')
        .replace(/医療専門/g, '')
        .replace(/商業実務/g, '')
        .replace(/高等専門/g, '')
        .replace(/学園/g, '')
        .replace(/学院/g, '')
        .replace(/大学校/g, '')
        .replace(/短期大学部/g, '')
        .replace(/短期大学/g, '')
        .replace(/大学/g, '');
    
    // 重複する言葉を簡易的にまとめる（例：今泉学園今泉服飾 -> 今泉服飾）
    // もしくは単純な文字列で十分
    return n;
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

    const matchedList = [];
    const unmatchedPDF = [];

    // DB学校のノーマライズネームマップ
    const dbNormMap = new Map(); // normalizedName -> school object
    dbSchools.forEach(school => {
        const norm = normalizeName(school.name);
        if (norm) {
            dbNormMap.set(norm, school);
        }
    });

    for (const [pdfSchoolName, depts] of pdfSchools.entries()) {
        const pdfNorm = normalizeName(pdfSchoolName);
        
        // 1. 完全一致
        let matchedSchool = dbSchools.find(s => s.name === pdfSchoolName);
        
        // 2. スペース除去一致
        if (!matchedSchool) {
            const pdfSpacedOut = pdfSchoolName.replace(/[\s\u3000]/g, '');
            matchedSchool = dbSchools.find(s => s.name.replace(/[\s\u3000]/g, '') === pdfSpacedOut);
        }
        
        // 3. ノーマライズ一致
        if (!matchedSchool) {
            matchedSchool = dbNormMap.get(pdfNorm);
        }
        
        // 4. ノーマライズ部分一致（包含関係）
        if (!matchedSchool) {
            for (const [dbNorm, school] of dbNormMap.entries()) {
                if (dbNorm.length >= 4 && pdfNorm.length >= 4) { // 短すぎる文字列での誤判定を防ぐ
                    if (pdfNorm.includes(dbNorm) || dbNorm.includes(pdfNorm)) {
                        matchedSchool = school;
                        break;
                    }
                }
            }
        }

        if (matchedSchool) {
            matchedList.push({
                pdfName: pdfSchoolName,
                dbName: matchedSchool.name,
                code: matchedSchool.code,
                depts: Array.from(depts)
            });
        } else {
            unmatchedPDF.push({ name: pdfSchoolName, depts: Array.from(depts) });
        }
    }

    console.log(`\nMatched Schools: ${matchedList.length} / ${pdfSchools.size}`);
    console.log(`Unmatched Schools: ${unmatchedPDF.length}`);

    console.log("\nSome matched examples:");
    console.log(JSON.stringify(matchedList.slice(0, 10), null, 2));

    console.log("\nSome unmatched examples:");
    console.log(JSON.stringify(unmatchedPDF.slice(0, 10), null, 2));
}

run();
