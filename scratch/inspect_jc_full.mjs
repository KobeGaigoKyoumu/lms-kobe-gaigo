import https from 'https'
import XLSX from 'xlsx'

const jcUrl = 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043219_01.xlsx'

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
    });
}

async function main() {
    const buffer = await downloadFile(jcUrl);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    console.log("=== Non-empty Rows in JC First Sheet ===");
    for (let i = 0; i < data.length; i++) {
        const row = data[i] || [];
        const hasContent = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
        if (hasContent) {
            console.log(`Row ${i}:`, JSON.stringify(row.slice(0, 10)));
        }
    }
}
main();
