import https from 'https'
import XLSX from 'xlsx'

const URLS = [
    { name: 'National University', url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_01.xlsx' },
    { name: 'Public Junior College', url: 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_01.xlsx' }
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

async function inspect(name, url) {
    console.log(`\n=== Inspecting ${name} ===`);
    const buffer = await downloadFile(url);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    console.log(`Sheet: ${sheetName}`);
    console.log(`Total rows: ${data.length}`);
    
    // 学部や学科という文字が含まれるセルや、セクションヘッダーを探す
    for (let i = 0; i < Math.min(data.length, 60); i++) {
        const row = data[i] || [];
        for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || '');
            if (val.includes('学部') || val.includes('学科') || val.includes('研究科') || val.includes('コース')) {
                console.log(`Row ${i}, Col ${j}: "${val}"`);
            }
        }
    }
}

async function main() {
    try {
        await inspect('National University', URLS[0].url);
        await inspect('Public Junior College', URLS[1].url);
    } catch (e) {
        console.error(e);
    }
}

main();
