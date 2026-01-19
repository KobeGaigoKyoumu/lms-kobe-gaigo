const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const baseDir = path.join(process.cwd(), 'data', 'JLPT結果');
const targetDirs = ['2023年第1回', '2023年第2回', '2024年第1回', '2024年第2回', '2025年第1回'];

const countryCounts = {};

function parseLine(line) {
    // Simple CSV parser respecting quotes
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
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

    // Country is at index 5 based on previous knowledge
    if (cleanParts.length > 5) {
        return cleanParts[5];
    }
    return null;
}

targetDirs.forEach(dirName => {
    const dirPath = path.join(baseDir, dirName);
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));

    // Per-directory counts
    const dirCountryCounts = {};

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        let content = fs.readFileSync(filePath);
        let decoded = iconv.decode(content, 'Shift_JIS');
        if (!decoded.includes('代表者')) {
            decoded = iconv.decode(content, 'utf-8');
        }

        const lines = decoded.split(/\r?\n/);
        lines.forEach(line => {
            if (!line.trim() || line.includes('申込時の入力者')) return;
            const country = parseLine(line);
            if (country && country !== 'Country' && country !== '国籍') {
                if (!dirCountryCounts[country]) dirCountryCounts[country] = 0;
                dirCountryCounts[country]++;
            }
        });
    });
    console.log(`\nCounts for ${dirName}:`);
    console.log({
        'China': dirCountryCounts['中国'] || 0,
        'Taiwan': dirCountryCounts['台湾'] || 0,
        'Korea': dirCountryCounts['韓国'] || 0,
        'Vietnam': dirCountryCounts['ベトナム'] || 0
    });
});

console.log('Unique Country Values found in recent exams:');
const sortedCountries = Object.keys(countryCounts).sort();
console.log(JSON.stringify(sortedCountries, null, 2));
console.log('Kanji Country Counts:', {
    'China': countryCounts['中国'] || 0,
    'Taiwan': countryCounts['台湾'] || 0,
    'Korea': countryCounts['韓国'] || 0,
    'Vietnam': countryCounts['ベトナム'] || 0
});
