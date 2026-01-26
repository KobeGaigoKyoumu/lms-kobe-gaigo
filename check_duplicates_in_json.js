const fs = require('fs');
const path = require('path');

const dataPath = 'e:/デスクトップ/LMS(神戸外語)/lms-app/src/data/career_stats_v2.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const nameCounts = {};
data.topDestinations.forEach(d => {
    nameCounts[d.name] = (nameCounts[d.name] || 0) + 1;
});

console.log('Duplicate names found:');
Object.entries(nameCounts).forEach(([name, count]) => {
    if (count > 1) {
        console.log(`${name}: ${count}`);
    }
});

if (Object.values(nameCounts).every(c => c === 1)) {
    console.log('No direct duplicates found in the JSON file.');
}
