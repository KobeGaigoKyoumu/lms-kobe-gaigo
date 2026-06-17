import https from 'https'
import XLSX from 'xlsx'

const url = 'https://www.mext.go.jp/content/20250625-mxt_daigakuc01-000043215_01.xlsx'

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
    const buffer = await downloadFile(url);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]]; // 北海道大学
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    console.log("=== Non-empty Rows in Univ First Sheet ===");
    for (let i = 0; i < data.length; i++) {
        const row = data[i] || [];
        const hasContent = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
        if (hasContent) {
            // 文字列「学部」「学科」を含む行や、見出しっぽい行を出力
            const rowStr = JSON.stringify(row.slice(0, 10));
            if (rowStr.includes("学部") || rowStr.includes("学科") || rowStr.includes("合計") || rowStr.includes("沿革") || rowStr.includes("組織")) {
                console.log(`Row ${i}:`, rowStr);
            }
        }
    }
}
main();
