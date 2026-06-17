const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

console.log('--- Verification of career_stats_v2.json ---');
console.log('Generated At:', data.generatedAt);
console.log('Total Destinations:', data.topDestinations.length);

// 2024年度と2025年度のそれぞれの学生データをカウント
let enrolled2024 = 0;
let enrolled2025 = 0;
let unenrolled2025 = 0;

data.topDestinations.forEach(dest => {
    dest.students.forEach(s => {
        if (s.year === 2024) {
            enrolled2024++;
        } else if (s.year === 2025) {
            if (s.enrolled) enrolled2025++;
            else unenrolled2025++;
        }
    });
});

console.log('2024 Student Count (should be 0):', enrolled2024);
console.log('2025 Enrolled Student Count:', enrolled2025);
console.log('2025 Unenrolled but Passed Count:', unenrolled2025);
console.log('Total 2025 School Passes:', enrolled2025 + unenrolled2025);

console.log('\nSample schools with 2025 data:');
data.topDestinations.slice(0, 5).forEach(dest => {
    const students2025 = dest.students.filter(s => s.year === 2025);
    const enrolled = students2025.filter(s => s.enrolled).length;
    const unenrolled = students2025.filter(s => !s.enrolled).length;
    if (students2025.length > 0) {
        console.log(`- ${dest.name}: Count=${dest.count}, 2025 total=${students2025.length} (Enrolled: ${enrolled}, Unenrolled: ${unenrolled})`);
    }
});
