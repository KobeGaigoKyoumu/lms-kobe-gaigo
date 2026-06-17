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
if (!fs.existsSync(textPath)) {
    console.error("Please run extract_pdf.js first to generate pdf_text.txt");
    process.exit(1);
}

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
    return name
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
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    try {
        console.log("Fetching all vocational schools from database...");
        const { data: dbSchools, error: fetchErr } = await supabase
            .from('master_schools')
            .select('*')
            .eq('school_type', 'vocational_school');
            
        if (fetchErr) throw fetchErr;
        console.log(`Fetched ${dbSchools.length} vocational schools from DB.`);

        const pdfSchools = parsePDF();
        console.log(`Parsed ${pdfSchools.size} unique schools from PDF.`);

        // DB学校のノーマライズネームマップ
        const dbNormMap = new Map(); // normalizedName -> school object
        dbSchools.forEach(school => {
            const norm = normalizeName(school.name);
            if (norm) {
                dbNormMap.set(norm, school);
            }
        });

        const schoolDeptsMap = new Map(); // dbSchool.code -> { school, depts }
        let matchCount = 0;

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
            
            // 4. ノーマライズ部分一致
            if (!matchedSchool) {
                for (const [dbNorm, school] of dbNormMap.entries()) {
                    if (dbNorm.length >= 4 && pdfNorm.length >= 4) {
                        if (pdfNorm.includes(dbNorm) || dbNorm.includes(pdfNorm)) {
                            matchedSchool = school;
                            break;
                        }
                    }
                }
            }

            if (matchedSchool) {
                if (!schoolDeptsMap.has(matchedSchool.code)) {
                    schoolDeptsMap.set(matchedSchool.code, {
                        school: matchedSchool,
                        depts: new Set()
                    });
                }
                const entry = schoolDeptsMap.get(matchedSchool.code);
                depts.forEach(d => entry.depts.add(d));
                matchCount++;
            }
        }

        const updatedRecords = [];
        for (const [code, entry] of schoolDeptsMap.entries()) {
            const deptListStr = Array.from(entry.depts).join(', ');
            updatedRecords.push({
                ...entry.school,
                departments: deptListStr
            });
        }

        console.log(`\nMatched ${matchCount} PDF schools out of ${pdfSchools.size}.`);
        console.log(`Aggregated to ${updatedRecords.length} unique DB records to update.`);

        // 100件ずつのチャンクに分割してアップサートを実行
        const chunkSize = 100;
        for (let i = 0; i < updatedRecords.length; i += chunkSize) {
            const chunk = updatedRecords.slice(i, i + chunkSize);
            console.log(`Upserting chunk ${i / chunkSize + 1} (${chunk.length} records)...`);
            
            const { error: upsertErr } = await supabase
                .from('master_schools')
                .upsert(chunk, { onConflict: 'code' });
                
            if (upsertErr) {
                console.error(`Error upserting chunk ${i / chunkSize + 1}:`, upsertErr.message);
            } else {
                console.log(`Chunk ${i / chunkSize + 1} updated successfully.`);
            }
            
            // サーバーに負荷をかけないために少しウェイト
            await sleep(100);
        }

        console.log("\nVocational school departments import completed successfully!");

    } catch (e) {
        console.error("Fatal error during import:", e);
    }
}

run();
