import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';

// 実際のパスに合わせて調整
const CSV_PATH = 'data/JLPT結果/2025年第1回/SCORE_20250825145638.csv';

function parseLine(line) {
    // Simple CSV parser handling quoted fields
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

    // Clean quotes
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

    return cleanParts;
}

function run() {
    try {
        console.log(`Reading ${CSV_PATH}...`);
        const buffer = fs.readFileSync(CSV_PATH);
        // エンコーディングは shift_jis と仮定
        const content = iconv.decode(buffer, 'Shift_JIS');
        const lines = content.split(/\r?\n/);

        console.log(`Total lines: ${lines.length}`);

        const targets = lines.filter(l => l.includes('MIN THIHA'));
        console.log(`Found ${targets.length} lines for MIN THIHA`);

        targets.forEach((line, idx) => {
            console.log(`\n--- Line ${idx + 1} ---`);
            console.log(`Raw: ${line}`);

            const parts = parseLine(line);
            console.log(`Parsed Parts:`);
            parts.forEach((p, i) => console.log(`  [${i}]: ${p}`));

            // jlpt.js のロジックでの抽出チェック
            // examName: cleanParts[1],
            // level: cleanParts[2],
            // id: cleanParts[3],
            // name: cleanParts[4],

            console.log(`Extracted:`);
            console.log(`  ID (Parts[3]): ${parts[3]}`);
            console.log(`  Name (Parts[4]): ${parts[4]}`);
        });

    } catch (e) {
        console.error(e);
    }
}

run();
