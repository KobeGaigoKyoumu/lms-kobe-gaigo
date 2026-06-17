import https from 'https'
import XLSX from 'xlsx'
import fs from 'fs'
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
    // 公立短大
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_01.xlsx', type: 'junior_college' },
    // 高専
    { url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043221_01.xlsx', type: 'technical_college' }
]

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed: ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', err => reject(err));
        }).on('error', err => reject(err));
    });
}

async function main() {
    try {
        console.log('Fetching existing codes from DB...');
        const { data: dbSchools, error } = await supabase
            .from('master_schools')
            .select('code, name, school_type')
        if (error) throw error;
        
        const existingCodes = new Set(dbSchools.map(s => s.code));
        console.log(`Existing schools in DB: ${existingCodes.size}`);

        const missing = [];

        for (const target of URLS) {
            console.log(`Downloading ${target.url}...`);
            const buffer = await downloadFile(target.url);
            console.log(`Parsing Excel...`);
            const wb = XLSX.read(buffer, { type: 'buffer' });
            
            for (const sheetName of wb.SheetNames) {
                if (sheetName.includes('INDEX') || sheetName.includes('索引') || sheetName.includes('その他')) {
                    continue;
                }
                const ws = wb.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (data.length > 0 && data[0][1]) {
                    const titleText = data[0][1];
                    const nameMatch = titleText.replace(/^(国立|公立|私立)\s+/, '').split(/[（(]/)[0].trim();
                    const code = data[4] ? data[4][1] : '';
                    
                    if (code && !existingCodes.has(code)) {
                        missing.push({ name: nameMatch, code, type: target.type });
                    }
                }
            }
        }

        console.log(`\nFound ${missing.length} missing schools from these sources:`);
        console.log(JSON.stringify(missing, null, 2));

    } catch (e) {
        console.error(e);
    }
}

main();
