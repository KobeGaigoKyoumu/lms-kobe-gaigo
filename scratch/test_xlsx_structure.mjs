import fs from 'fs'
import https from 'https'
import XLSX from 'xlsx'

const url = 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_01.xlsx'

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download: ${res.statusCode}`));
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
        console.log('Downloading test Excel file...');
        const buffer = await downloadFile(url);
        console.log(`Downloaded ${buffer.length} bytes.`);
        
        console.log('Parsing Excel...');
        const wb = XLSX.read(buffer, { type: 'buffer' });
        console.log('Sheet Names:', wb.SheetNames);

        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        
        // 最初の15行分を配列としてダンプ
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        console.log('Dump first 15 rows:');
        for (let i = 0; i < Math.min(data.length, 15); i++) {
            console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 15)));
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
