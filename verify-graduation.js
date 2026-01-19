/**
 * Verify JLPT data and graduation year mapping
 * 
 * JLPT Schedule:
 * - 第1回 = July (7月)
 * - 第2回 = December (12月)
 * 
 * For students graduating in March:
 * - 2024年3月卒業 (March 2024 graduation):
 *   - Their final exam would be 2023年第2回 (Dec 2023) or 2024年第1回 (July 2024 - but that's after graduation)
 *   - Actually, graduation in March means: 2023年第1回 (July) and 2023年第2回 (Dec) are the 2nd year exams
 *   - So graduation year 2024 should map to session year 2023
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

    console.log("=== Available Sessions ===");
    sessions.forEach(s => console.log(`  ${s}`));

    console.log("\n=== Session Analysis ===");
    sessions.forEach(session => {
        const year = session.substring(0, 4);
        const round = session.includes('第1回') ? '1st (July)' : '2nd (December)';

        // For March graduation:
        // - 2023年第1回 (July 2023) -> students graduating March 2024 (2nd year)
        // - 2023年第2回 (Dec 2023) -> students graduating March 2024 (2nd year)
        // So exam year 2023 -> graduation year 2024
        const graduationYear = session.includes('第2回')
            ? parseInt(year) + 1  // December exam -> next year graduation
            : parseInt(year) + 1; // July exam -> same logic, next March

        console.log(`  ${session} (${round}) -> 卒業年度: ${graduationYear}年3月`);
    });

    // Now analyze data by correct graduation year
    console.log("\n=== Data by Correct Graduation Year ===");

    const dataByGradYear = {};

    for (const session of sessions) {
        const sessionDir = path.join(JLPT_BASE_DIR, session);
        const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

        const year = session.substring(0, 4);
        // Graduation year: exam year + 1 for March graduation
        const gradYear = parseInt(year) + 1;

        if (!dataByGradYear[gradYear]) {
            dataByGradYear[gradYear] = { students: new Set(), n3Plus: new Set() };
        }

        for (const file of files) {
            const buffer = fs.readFileSync(path.join(sessionDir, file));
            const content = iconv.decode(buffer, 'Shift_JIS');
            const lines = content.split(/\r?\n/).slice(1).filter(l => l.trim());

            for (const line of lines) {
                const row = parseCSVLine(line);
                if (row.length < 10) continue;

                const name = row[4];
                const level = row[2];
                const result = row[8];

                if (!name || result !== '合格') continue;

                dataByGradYear[gradYear].students.add(name);

                const levelNum = parseInt(level.replace('N', ''));
                if (levelNum <= 3) {
                    dataByGradYear[gradYear].n3Plus.add(name);
                }
            }
        }
    }

    console.log("\nGradYear | Total | N3+ | Rate");
    console.log("---------|-------|-----|------");

    for (const [gradYear, stats] of Object.entries(dataByGradYear).sort()) {
        const total = stats.students.size;
        const n3Plus = stats.n3Plus.size;
        const rate = total > 0 ? ((n3Plus / total) * 100).toFixed(1) : 0;
        console.log(`${gradYear}年3月 | ${total}名 | ${n3Plus}名 | ${rate}%`);
    }

} catch (e) {
    console.error("Error:", e);
}
