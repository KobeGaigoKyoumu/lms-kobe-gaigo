const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('e:/デスクトップ/LMS(神戸外語)/在籍者.xlsx');

let result = [];

result.push('=== Sheet Names ===');
result.push(JSON.stringify(wb.SheetNames));
result.push('');

for (const sheetName of wb.SheetNames) {
    result.push(`\n=== Sheet: ${sheetName} ===`);
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    result.push(`Total rows: ${rows.length}`);
    result.push('\nFirst 10 rows:');

    for (let i = 0; i < Math.min(10, rows.length); i++) {
        result.push(`Row ${i}: ${JSON.stringify(rows[i])}`);
    }

    // Find unique classes
    const classNames = new Set();
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length > 0) {
            for (let j = 0; j < row.length; j++) {
                const val = row[j];
                if (typeof val === 'string' && /^\d+-\d+$/.test(val)) {
                    classNames.add(val);
                }
            }
        }
    }
    result.push('\nUnique class names found: ' + JSON.stringify([...classNames].sort()));
}

fs.writeFileSync('excel_analysis.txt', result.join('\n'), 'utf8');
console.log('Analysis saved to excel_analysis.txt');
