const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

console.log('=== All School Names in career_stats_v2.json ===');
const names = data.topDestinations.map(d => d.name);
names.forEach(name => {
    if (name.includes('(') || name.includes('（') || name.includes('/') || name.includes('月') || name.includes('日')) {
        console.log(`Match: ${name}`);
    }
});
console.log('\nTotal schools:', names.length);
