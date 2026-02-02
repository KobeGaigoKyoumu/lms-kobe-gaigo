const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// Try to find a CSV file in data/JLPT結果
const JLPT_BASE_DIR = path.join(__dirname, '../data/JLPT結果');

try {
    const sessions = fs.readdirSync(JLPT_BASE_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.includes('2025年第2回'))
        .map(d => d.name);

    if (sessions.length === 0) {
        console.log("No session directories found.");
        process.exit(0);
    }

    // Try a few sessions until we find a CSV
    for (const session of sessions) {
        const sessionDir = path.join(JLPT_BASE_DIR, session);
        const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

        if (files.length > 0) {
            const file = files[0];
            const filePath = path.join(JLPT_BASE_DIR, sessions[0], file);
            console.log(`Inspecting file: ${filePath}`);

            const buffer = fs.readFileSync(filePath);
            const content = iconv.decode(buffer, 'Shift_JIS');
            const lines = content.split(/\r?\n/);

            lines.forEach((line, index) => {
                const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
                if (index > 0) {
                    const result = parts[8]; // Result column
                    if (result === '合格') {
                        console.log(`PASS RECORD: Line ${index} ID=${parts[3]} Total=${parts[9]} K=${parts[12]} R=${parts[14]} L=${parts[16]}`);
                    }
                }
            });
            // Don't break loop, just scan file.
            break; // Stop after first file
        }
    }
} catch (e) {
    console.error(e);
}
