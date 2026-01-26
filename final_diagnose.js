const fs = require('fs');

const dataPath = 'e:/デスクトップ/LMS(神戸外語)/lms-app/src/data/career_stats_v2.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function similarity(s1, s2) {
    let longer = s1, shorter = s2;
    if (s1.length < s2.length) { longer = s2; shorter = s1; }
    if (longer.length === 0) return 1.0;
    return (longer.length - editDistance(longer, shorter)) / parseFloat(longerLength = longer.length);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase(); s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0) costs[j] = j;
            else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) != s2.charAt(j - 1))
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                costs[j - 1] = lastValue; lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

const names = data.topDestinations.map(d => d.name);
const results = [];

console.log('--- Similarity Analysis ---');
for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
        const sim = similarity(names[i], names[j]);
        if (sim > 0.8) {
            results.push({ sim, n1: names[i], n2: names[j] });
        }
    }
}

results.sort((a, b) => b.sim - a.sim).forEach(r => {
    console.log(`[${(r.sim * 100).toFixed(0)}%] ${r.n1} | ${r.n2}`);
});

// Check if any normalized names are duplicated in the current JSON
const normalize = (d) => String(d).replace(/\s+/g, '').replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/ぺ/g, 'ペ').replace(/べ/g, 'ベ').toLowerCase();
const normCounts = {};
data.topDestinations.forEach(d => {
    const n = normalize(d.name);
    if (!normCounts[n]) normCounts[n] = [];
    normCounts[n].push(d.name);
});

console.log('\n--- Normalization Duplicates (Current JSON) ---');
Object.entries(normCounts).forEach(([norm, origs]) => {
    if (origs.length > 1) {
        console.log(`Normalized: ${norm}`);
        origs.forEach(o => console.log(`  - ${o}`));
    }
});
