const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

console.log('--- Verification of career_stats_v2.json ---');
console.log('Generated At:', data.generatedAt);
console.log('Total Destinations:', data.topDestinations.length);

// 2024年度の学生データを抽出
let enrolledCount = 0;
let unenrolledCount = 0;
let hasEnrolledFlag = false;

data.topDestinations.forEach(dest => {
    const students2024 = dest.students.filter(s => s.year === 2024);
    students2024.forEach(s => {
        if (s.hasOwnProperty('enrolled')) {
            hasEnrolledFlag = true;
            if (s.enrolled) {
                enrolledCount++;
            } else {
                unenrolledCount++;
            }
        }
    });
});

console.log('Has enrolled flags for 2024 students:', hasEnrolledFlag);
console.log('2024 Enrolled Students (in schools):', enrolledCount);
console.log('2024 Unenrolled but Passed Students:', unenrolledCount);
console.log('Total 2024 School Passes:', enrolledCount + unenrolledCount);

// 実際のいくつかの学校の例を表示
console.log('\nSample schools:');
data.topDestinations.slice(0, 5).forEach(dest => {
    const students2024 = dest.students.filter(s => s.year === 2024);
    const enrolled = students2024.filter(s => s.enrolled).length;
    const unenrolled = students2024.filter(s => !s.enrolled).length;
    if (students2024.length > 0) {
        console.log(`- ${dest.name}: Count=${dest.count}, 2024 total=${students2024.length} (Enrolled: ${enrolled}, Unenrolled: ${unenrolled})`);
    }
});
