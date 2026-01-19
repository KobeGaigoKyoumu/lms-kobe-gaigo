
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const filePath = path.join(process.cwd(), 'data/JLPT結果/2024年第1回/N2.csv');

function parseLine(line) {
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

    if (cleanParts.length < 10) return null;

    return {
        rawResult: parts[8],
        cleanResult: cleanParts[8],
        isPass: cleanParts[8] === '合格',
        rawScore: parts[9],
        cleanScore: cleanParts[9]
    };
}

try {
    const buffer = fs.readFileSync(filePath);
    console.log("First 20 bytes (Hex):", buffer.slice(0, 20).toString('hex'));

    // Try decoding as Shift_JIS
    const contentSJIS = iconv.decode(buffer, 'Shift_JIS');
    const linesSJIS = contentSJIS.split(/\r?\n/).slice(1, 6);
    console.log("\n--- Decoded as Shift_JIS ---");
    console.log("Line 1 (SJIS):", linesSJIS[0]);
    console.log("Parsed (SJIS):", JSON.stringify(parseLine(linesSJIS[0]), null, 2));

    // Try decoding as UTF-8
    const contentUTF8 = buffer.toString('utf-8');
    const linesUTF8 = contentUTF8.split(/\r?\n/).slice(1, 6);
    console.log("\n--- Decoded as UTF-8 ---");
    console.log("Line 1 (UTF-8):", linesUTF8[0]);
    console.log("Parsed (UTF-8):", JSON.stringify(parseLine(linesUTF8[0]), null, 2));

} catch (e) {
    console.error(e);
}
