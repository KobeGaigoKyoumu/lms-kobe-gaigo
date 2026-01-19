/**
 * Find invalid result rows in CSV
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const filePath = path.join(process.cwd(), 'data', 'JLPT結果', '2024年第1回', 'N2.csv');

function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts.map(p => p.replace(/^"|"$/g, '').trim());
}

try {
    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, 'Shift_JIS');
    const lines = content.split(/\r?\n/);

    console.log("=== Finding Invalid Result Rows ===\n");

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = parseCSVLine(lines[i]);
        if (row.length < 10) continue;

        const result = row[8];
        if (result !== '合格' && result !== '不合格') {
            console.log(`Row ${i}: Result=[${result}]`);
            console.log(`  Full row data: ${row.slice(0, 12).join(' | ')}`);
        }
    }

} catch (e) {
    console.error("Error:", e);
}
