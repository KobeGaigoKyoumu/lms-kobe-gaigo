/**
 * Final verification of JLPT calculations
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const JLPT_BASE_DIR = path.join(process.cwd(), 'data', 'JLPT結果');

function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuote = !inQuote;
        else if (char === ',' && !inQuote) { parts.push(current); current = ''; }
        else current += char;
    }
    parts.push(current);
    return parts.map(p => p.replace(/^"|"$/g, '').trim());
}

try {
    const sessions = fs.readdirSync(JLPT_BASE_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name);

    let grandTotal = 0, grandPassed = 0, grandAbsent = 0;

    console.log("=== JLPT Final Verification ===\n");
    console.log("Session | Level | Total | Pass | Absent | Rate");
    console.log("--------|-------|-------|------|--------|------");

    for (const session of sessions) {
        const sessionDir = path.join(JLPT_BASE_DIR, session);
        const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

        for (const file of files) {
            const buffer = fs.readFileSync(path.join(sessionDir, file));
            const content = iconv.decode(buffer, 'Shift_JIS');
            const lines = content.split(/\r?\n/).slice(1).filter(l => l.trim());

            let total = 0, passed = 0, absent = 0;

            for (const line of lines) {
                const row = parseCSVLine(line);
                if (row.length < 10) continue;

                const result = row[8];
                if (result === '合格') { total++; passed++; }
                else if (result === '不合格') { total++; }
                else if (result === '欠席') { absent++; }
            }

            const level = file.replace('.csv', '');
            const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
            console.log(`${session.padEnd(15)} | ${level.padEnd(5)} | ${String(total).padEnd(5)} | ${String(passed).padEnd(4)} | ${String(absent).padEnd(6)} | ${rate}%`);

            grandTotal += total;
            grandPassed += passed;
            grandAbsent += absent;
        }
    }

    const overallRate = grandTotal > 0 ? ((grandPassed / grandTotal) * 100).toFixed(1) : 0;
    console.log("--------|-------|-------|------|--------|------");
    console.log(`TOTAL           |       | ${grandTotal}  | ${grandPassed}   | ${grandAbsent}      | ${overallRate}%`);
    console.log(`\n欠席者は合格率計算から除外されています。`);

} catch (e) {
    console.error("Error:", e);
}
