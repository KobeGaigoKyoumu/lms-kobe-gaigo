import https from 'https'
import XLSX from 'xlsx'

const url = 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043221_01.xlsx'

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
        console.log('Downloading Technical College Excel file...');
        const buffer = await downloadFile(url);
        console.log(`Downloaded ${buffer.length} bytes.`);
        
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const schools = [];
        
        for (const sheetName of wb.SheetNames) {
            if (sheetName.includes('INDEX') || sheetName.includes('索引') || sheetName.includes('その他')) {
                continue;
            }
            const ws = wb.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (data.length > 0 && data[0][1]) {
                const titleText = data[0][1];
                // Title format: "国立 函館工業高等専門学校（National Institute of Technology(KOSEN)，Hakodate College）"
                const nameMatch = titleText.replace(/^(国立|公立|私立)\s+/, '').split(/[（(]/)[0].trim();
                
                // Find school code and address at fixed positions (Row 4)
                const code = data[4] ? data[4][1] : '';
                const address = data[4] ? data[4][11] : '';
                
                schools.push({ name: nameMatch, code, address });
            }
        }
        
        console.log('Total schools found:', schools.length);
        console.log('Schools List:', JSON.stringify(schools, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
