/**
 * Debug N3+ rate calculation
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
        if (line[i] === '"') inQuote = !inQuote;
        else if (line[i] === ',' && !inQuote) { parts.push(current); current = ''; }
        else current += line[i];
    }
    parts.push(current);
    return parts.map(p => p.replace(/^"|"$/g, '').trim());
}

try {
    const sessions = fs.readdirSync(JLPT_BASE_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory()).map(d => d.name).sort();

    console.log("=== Session to Graduation Year Mapping ===");
    sessions.forEach(s => {
        const year = parseInt(s.substring(0, 4));
        const gradYear = year + 1;
        console.log(`${s} -> ${gradYear}年3月卒`);
    });

    // Collect all data
    const allData = [];
    for (const session of sessions) {
        const sessionDir = path.join(JLPT_BASE_DIR, session);
        const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

        for (const file of files) {
            const buffer = fs.readFileSync(path.join(sessionDir, file));
            const content = iconv.decode(buffer, 'Shift_JIS');
            const lines = content.split(/\r?\n/).slice(1).filter(l => l.trim());

            for (const line of lines) {
                const row = parseCSVLine(line);
                if (row.length < 10) continue;

                allData.push({
                    session,
                    name: row[4],
                    level: row[2],
                    result: row[8]
                });
            }
        }
    }

    console.log(`\nTotal raw records: ${allData.length}`);

    // Check for duplicates by counting how many times same name appears
    const nameCounts = {};
    allData.forEach(r => {
        if (!r.name) return;
        nameCounts[r.name] = (nameCounts[r.name] || 0) + 1;
    });

    const multipleAppearances = Object.entries(nameCounts).filter(([n, c]) => c > 1);
    console.log(`\nStudents appearing multiple times: ${multipleAppearances.length}`);
    console.log("Top 10 most frequent:");
    multipleAppearances.sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([name, count]) => {
        console.log(`  ${name}: ${count}回`);
    });

    // Calculate with proper GLOBAL deduplication
    const globalAllStudents = new Set();
    const globalN3Plus = new Set();

    allData.forEach(r => {
        if (r.result !== '合格' && r.result !== '不合格') return;
        if (!r.name) return;

        globalAllStudents.add(r.name);

        if (r.result === '合格') {
            const levelNum = parseInt(r.level.replace('N', ''));
            if (levelNum <= 3) {
                globalN3Plus.add(r.name);
            }
        }
    });

    console.log(`\n=== Global Stats (unique students across ALL years) ===`);
    console.log(`Total unique examinees: ${globalAllStudents.size}`);
    console.log(`N3+ achievers (unique): ${globalN3Plus.size}`);
    console.log(`Rate: ${((globalN3Plus.size / globalAllStudents.size) * 100).toFixed(1)}%`);

} catch (e) {
    console.error("Error:", e);
}
