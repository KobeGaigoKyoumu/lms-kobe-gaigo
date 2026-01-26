const fs = require('fs');
const dataPath = 'e:/デスクトップ/LMS(神戸外語)/lms-app/src/data/career_stats_v2.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const names = data.topDestinations.map(d => d.name);

function similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength === 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

console.log('--- Similar Name Detection ---');
for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
        const sim = similarity(names[i], names[j]);
        if (sim > 0.7) {
            console.log(`[${(sim * 100).toFixed(0)}%] "${names[i]}" vs "${names[j]}"`);
        }
    }
}
