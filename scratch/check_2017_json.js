const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

console.log('=== Checking 2017 students in JSON ===');
let found = 0;
data.topDestinations.forEach(dest => {
    const students2017 = dest.students.filter(s => s.year === 2017);
    if (students2017.length > 0) {
        console.log(`\nDestination: ${dest.name} (2017 count: ${students2017.length})`);
        students2017.slice(0, 5).forEach(s => {
            console.log(`  Student: ID=${s.id}, Name=${s.name}, Enrolled=${s.enrolled}`);
            found++;
        });
    }
});
console.log(`\nTotal 2017 student entries found: ${found}`);
