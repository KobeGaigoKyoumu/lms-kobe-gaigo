const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// Try to find a CSV file in data/JLPT結果
const baseDir = path.join(process.cwd(), 'data', 'JLPT結果');

try {
    const sessions = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    if (sessions.length === 0) {
        console.log("No session directories found.");
        process.exit(0);
    }

    // Try a few sessions until we find a CSV
    for (const session of sessions) {
        const sessionDir = path.join(baseDir, session);
        const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

        if (files.length > 0) {
            const csvFile = files[0];
            const filePath = path.join(sessionDir, csvFile);
            console.log(`Inspecting file: ${filePath}`);

            const buffer = fs.readFileSync(filePath);
            const content = iconv.decode(buffer, 'Shift_JIS');
            const lines = content.split(/\r?\n/).slice(0, 3);

            lines.forEach((line, index) => {
                const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
                if (index === 0) {
                    console.log('HEADER MAPPING (10-30):');
                    for (let i = 10; i < Math.min(parts.length, 30); i++) {
                        console.log(`${i}: ${parts[i]}`);
                    }
                }
            });
            break;
        }
    }
} catch (e) {
    console.error(e);
}
