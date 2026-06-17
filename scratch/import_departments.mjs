import fs from 'fs'
import https from 'https'
import XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=')
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']
const supabase = createClient(supabaseUrl, supabaseKey)

const URLS = [
    // 国立大学
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_01.xlsx', type: 'university' },
    // 公立大学
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_02.xlsx', type: 'university' },
    // 私立大学 03-1 ~ 03-8
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-1.xlsx', type: 'university' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-2.xlsx', type: 'university' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-3.xlsx', type: 'university' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-4.xlsx', type: 'university' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-5.xlsx', type: 'university' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-6.xlsx', type: 'university' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-7.xlsx', type: 'university' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_03-8.xlsx', type: 'university' },
    // 公立短大
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_01.xlsx', type: 'junior_college' },
    // 私立短大 02-1 ~ 02-6
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_02-1.xlsx', type: 'junior_college' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_02-2.xlsx', type: 'junior_college' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_02-3.xlsx', type: 'junior_college' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_02-4.xlsx', type: 'junior_college' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_02-5.xlsx', type: 'junior_college' },
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_02-6.xlsx', type: 'junior_college' }
]

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', err => reject(err));
        }).on('error', err => reject(err));
    });
}

function extractDepartmentsFromSheet(sheet) {
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const depts = new Set();
    let code = '';
    
    if (data[4] && data[4][1]) {
        code = String(data[4][1]).trim();
    }
    
    let startRow = -1;
    let type = '';
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i] || [];
        const val = String(row[1] || '').trim();
        if (val === '学部') {
            startRow = i;
            type = 'faculty';
            break;
        } else if (val === '学科') {
            startRow = i;
            type = 'department';
            break;
        }
    }
    
    if (startRow !== -1) {
        for (let i = startRow + 2; i < data.length; i++) {
            const row = data[i] || [];
            const firstCell = String(row[1] || '').trim();
            const thirdCell = String(row[3] || '').trim();
            
            if (firstCell === '合計' || thirdCell === '合計' || firstCell === '沿革' || firstCell.includes('基本情報')) {
                break;
            }
            
            // 連続して空行が続いた場合もブレイク
            if (!row.some(c => c !== null && c !== undefined && String(c).trim() !== '')) {
                let allEmpty = true;
                for (let k = 0; k < 5; k++) {
                    const r = data[i+k] || [];
                    if (r.some(c => c !== null && c !== undefined && String(c).trim() !== '')) {
                        allEmpty = false;
                        break;
                    }
                }
                if (allEmpty) break;
            }
            
            if (type === 'faculty') {
                const facultyName = String(row[1] || '').trim();
                const deptName = String(row[3] || '').trim();
                
                if (facultyName && facultyName !== '学部' && facultyName !== '（共通）') {
                    if (deptName && deptName !== '学科' && deptName !== '（共通）' && !deptName.includes('合計')) {
                        depts.add(`${facultyName} ${deptName}`);
                    } else {
                        depts.add(facultyName);
                    }
                }
            } else if (type === 'department') {
                const deptName = String(row[1] || '').trim();
                const majorName = String(row[3] || '').trim();
                
                if (deptName && deptName !== '学科') {
                    if (majorName && majorName !== '専攻' && !majorName.includes('合計')) {
                        depts.add(`${deptName} ${majorName}`);
                    } else {
                        depts.add(deptName);
                    }
                }
            }
        }
    }
    
    return { code, departments: Array.from(depts).join(', ') };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    try {
        // 1. 高等専門学校(technical_college)データの削除
        console.log('Deleting technical_college data...');
        const { error: delError } = await supabase
            .from('master_schools')
            .delete()
            .eq('school_type', 'technical_college');
            
        if (delError) {
            console.error('Error deleting technical colleges:', delError.message);
        } else {
            console.log('Successfully deleted technical colleges from database.');
        }

        // 2. 既存の全レコードを取得
        console.log('Fetching existing schools from database...');
        const { data: dbSchools, error: fetchError } = await supabase
            .from('master_schools')
            .select('*');
            
        if (fetchError) throw fetchError;
        
        console.log(`Fetched ${dbSchools.length} existing schools.`);
        const schoolMap = new Map();
        dbSchools.forEach(s => schoolMap.set(s.code, s));

        // 3. 各Excelからデータを抽出してマージ
        const departmentMap = new Map(); // code -> departments string
        
        for (const target of URLS) {
            console.log(`\nDownloading ${target.url}...`);
            try {
                const buffer = await downloadFile(target.url);
                console.log(`Parsing Excel file...`);
                const wb = XLSX.read(buffer, { type: 'buffer' });
                
                let fileCount = 0;
                for (const sheetName of wb.SheetNames) {
                    if (sheetName.includes('INDEX') || sheetName.includes('索引') || sheetName.includes('その他')) {
                        continue;
                    }
                    const ws = wb.Sheets[sheetName];
                    const result = extractDepartmentsFromSheet(ws);
                    
                    if (result.code && result.departments) {
                        departmentMap.set(result.code, result.departments);
                        
                        // 大学院のコード（${code}-grad）にも同じ学部・研究科を紐付ける（検索ヒット用）
                        departmentMap.set(`${result.code}-grad`, result.departments);
                        
                        fileCount++;
                    }
                }
                console.log(`Processed ${fileCount} schools from this file.`);
                
            } catch (err) {
                console.error(`Error processing URL ${target.url}:`, err.message);
            }
            
            // サーバーに負荷をかけないためのウェイト
            await sleep(200);
        }

        // 4. マップしたdepartments情報を既存データと結合して一括upsert
        console.log('\nMerging departments with existing records...');
        const updatedRecords = [];
        let updatedCount = 0;

        for (const [code, school] of schoolMap.entries()) {
            const depts = departmentMap.get(code);
            if (depts) {
                updatedRecords.push({
                    ...school,
                    departments: depts
                });
                updatedCount++;
            } else {
                updatedRecords.push(school); // departmentsは空のまま保持
            }
        }

        console.log(`Prepared ${updatedCount} records with new departments.`);
        
        // chunkごとにupsert (1回あたり200件に分割)
        const chunkSize = 200;
        for (let i = 0; i < updatedRecords.length; i += chunkSize) {
            const chunk = updatedRecords.slice(i, i + chunkSize);
            console.log(`Upserting chunk ${i / chunkSize + 1}...`);
            const { error: upsertError } = await supabase
                .from('master_schools')
                .upsert(chunk, { onConflict: 'code' });
                
            if (upsertError) {
                console.error(`Error upserting chunk ${i / chunkSize + 1}:`, upsertError.message);
            }
        }
        
        console.log('\nImport and data migration completed successfully!');
        
    } catch (e) {
        console.error('Fatal error during departments import:', e);
    }
}

main();
