import https from 'https'
import XLSX from 'xlsx'

const juniorCollegeUrl = 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_01.xlsx'
const technicalCollegeUrl = 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043221_01.xlsx'

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

async function inspect(name, url) {
    console.log(`\n=== Inspecting ${name} ===`);
    const buffer = await downloadFile(url);
    console.log(`Downloaded ${buffer.length} bytes.`);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    console.log('Sheet Names:', wb.SheetNames.slice(0, 5));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log('First sheet rows:');
    for (let i = 0; i < Math.min(data.length, 10); i++) {
        console.log(`Row ${i}:`, JSON.stringify(data[i] ? data[i].slice(0, 10) : []));
    }
}

async function main() {
    try {
        await inspect('Junior College', juniorCollegeUrl);
        await inspect('Technical College', technicalCollegeUrl);
    } catch (e) {
        console.error(e);
    }
}

main();
