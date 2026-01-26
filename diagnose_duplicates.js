const fs = require('fs');
const path = require('path');

const dataPath = 'e:/デスクトップ/LMS(神戸外語)/lms-app/src/data/career_stats_v2.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const normalize = (d) => {
    if (!d) return '';
    // Basic normalization: remove spaces, convert to half-width if possible, lowercase
    return String(d)
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase()
        .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // Full-width to half-width
        .replace(/ー/g, '-') // Normalize dashes
        .replace(/－/g, '-');
};

const mapping = {
    '東亜経理': '東亜経理専門学校',
    '東亜経理専門学校': '東亜経理専門学校',
    '東京国際ビジネスカレッジ': '東京国際ビジネスカレッジ神戸校',
    '東京国際ビジネスカレッジ神戸校': '東京国際ビジネスカレッジ神戸校',
    'アートカレッジ': '専門学校アートカレッジ神戸',
    'アートカレッジ神戸': '専門学校アートカレッジ神戸',
    '専門学校アートカレッジ神戸': '専門学校アートカレッジ神戸',
    '愛甲': '愛甲学院専門学校',
    '愛甲学院': '愛甲学院専門学校',
    '愛甲学院専門学校': '愛甲学院専門学校',
    'ICT': 'ICT専門学校',
    'ICT専門学校': 'ICT専門学校',
    '関西国際旅行ホテル専門学校': '関西国際旅行・ホテル専門学校',
    '関西国際旅行・ホテル専門学校': '関西国際旅行・ホテル専門学校',
    'トヨタ自動車大学校': 'トヨタ自動車大学校神戸校',
    'トヨタ神戸自動車大学校': 'トヨタ自動車大学校神戸校',
    'トヨタ自動車大学校神戸校': 'トヨタ自動車大学校神戸校',
    '大原': '大原簿記専門学校三宮校',
    '大原簿記専門学校三宮校': '大原簿記専門学校三宮校',
    '日本コンピュータ': '日本コンピュータ専門学校',
    '日本コンピュータ専門学校': '日本コンピュータ専門学校',
    '和歌山福祉専門学校': '和歌山社会福祉専門学校',
    '和歌山社会福祉専門学校': '和歌山社会福祉専門学校',
    '駿台観光&外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
    '駿台観光＆外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
    '中日本自動車短期大学': '中日本自動車短期大学',
    '中日本自動車': '中日本自動車短期大学'
};

const getFinalName = (name) => {
    const norm = normalize(name);
    return mapping[norm] || mapping[name] || norm;
};

const groups = {};
data.topDestinations.forEach(d => {
    const final = getFinalName(d.name);
    if (!groups[final]) groups[final] = [];
    groups[final].push(d.name);
});

console.log('--- Duplicate Detection Report ---');
let found = false;
Object.entries(groups).forEach(([final, originals]) => {
    if (originals.length > 1) {
        console.log(`Duplicate found for "${final}":`);
        originals.forEach(o => console.log(`  - ${o}`));
        found = true;
    }
});

if (!found) {
    console.log('No duplicates found in topDestinations based on current normalization logic.');
}

// Special check for トヨタ specifically in any part of the name
console.log('\n--- "トヨタ" check ---');
const toyotaEntries = data.topDestinations.filter(d => d.name.includes('トヨタ'));
console.log(`Found ${toyotaEntries.length} entries containing "トヨタ":`);
toyotaEntries.forEach(d => console.log(`  - ${d.name} (Count: ${d.count})`));
