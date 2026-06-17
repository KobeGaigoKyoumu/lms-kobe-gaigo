const XLSX = require('xlsx');
const path = require('path');

const srcPath = path.join(__dirname, '../全学生進路希望調査票2025.xlsx');
const destPath = path.join(__dirname, 'output_copy.xlsx');

try {
    const wb = XLSX.readFile(srcPath);
    const wsSrc = wb.Sheets['2025'];
    
    // 新しい空のシートを作成
    const wsDest = {
        '!ref': 'A1:P24',
        '!merges': []
    };
    
    // 最初の24行（Row 0 to 23, Col 0 to 15）のセルをコピー
    for (let r = 0; r < 24; r++) {
        for (let c = 0; c < 16; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (wsSrc[addr]) {
                wsDest[addr] = { ...wsSrc[addr] }; // シャローコピー
            }
        }
    }
    
    // マージ範囲のコピー（範囲が Row 0 to 23 に含まれるものだけ）
    if (wsSrc['!merges']) {
        wsSrc['!merges'].forEach(m => {
            if (m.e.r < 24) {
                wsDest['!merges'].push({
                    s: { r: m.s.r, c: m.s.c },
                    e: { r: m.e.r, c: m.e.c }
                });
            }
        });
    }
    
    // 新しいワークブックにシートを追加
    const wbNew = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbNew, wsDest, '2025_subset');
    
    XLSX.writeFile(wbNew, destPath);
    console.log('Successfully wrote subset to:', destPath);
} catch (e) {
    console.error('Error:', e);
}
