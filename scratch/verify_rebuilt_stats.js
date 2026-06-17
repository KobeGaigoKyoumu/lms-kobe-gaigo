const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

console.log('=== Rebuilt Career Stats Verification ===');
console.log('Generated At:', data.generatedAt);
console.log('Total Records (Summary):', data.summary.totalRecords);
console.log('Total Graduates (Summary):', data.summary.totalGraduates);
console.log('Years in list:', data.summary.years.join(', '));

console.log('\n--- Yearly Trends Check ---');
data.yearlyTrends.forEach(t => {
    console.log(`Year ${t.year}: Total=${t.total}, Graduated=${t.graduated}, Withdrawn=${t.withdrawn}, GraduationRate=${t.graduationRate}%`);
    // Print top 3 categories
    const topCats = Object.entries(t.categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c, val]) => `${c}: ${val}`)
        .join(', ');
    console.log(`  Top Categories: ${topCats}`);
});

console.log('\n--- Nationality Statistics Check ---');
console.log(`Total nationalities processed: ${data.nationalityStats.length}`);
data.nationalityStats.slice(0, 5).forEach(n => {
    console.log(`- ${n.name}: Total=${n.total}`);
});

console.log('\n--- Top Destinations & Passes Check ---');
console.log(`Total School Destinations: ${data.topDestinations.length}`);

let enrolledCount = 0;
let unenrolledCount = 0;
let studentsByYear = {};

data.topDestinations.forEach(dest => {
    dest.students.forEach(s => {
        studentsByYear[s.year] = (studentsByYear[s.year] || 0) + 1;
        if (s.enrolled) enrolledCount++;
        else unenrolledCount++;
    });
});

console.log(`Total Student-School Matches in topDestinations: ${enrolledCount + unenrolledCount}`);
console.log(`  Enrolled (Decided): ${enrolledCount}`);
console.log(`  Unenrolled (Passed but did not enter): ${unenrolledCount}`);

console.log('\nPassed Student Counts by Year in topDestinations:');
Object.keys(studentsByYear).sort().forEach(yr => {
    console.log(`  Year ${yr}: ${studentsByYear[yr]} entries`);
});

console.log('\nSample schools with passes check:');
data.topDestinations.slice(0, 5).forEach(dest => {
    const totalStudents = dest.students.length;
    const enrolled = dest.students.filter(s => s.enrolled).length;
    const unenrolled = dest.students.filter(s => !s.enrolled).length;
    const jlptCount = Object.values(dest.jlptStats).reduce((a, b) => a + (b.passed?.count || 0) + (b.failed?.count || 0), 0);
    
    console.log(`- ${dest.name}: totalPasses=${totalStudents} (Enrolled: ${enrolled}, Unenrolled: ${unenrolled}). CountField=${dest.count}. JLPT entries count=${jlptCount}`);
});

// Check if there are any duplicate students in the same school
let duplicateEntries = 0;
data.topDestinations.forEach(dest => {
    const studentIds = new Set();
    dest.students.forEach(s => {
        const key = `${s.id}_${s.year}`;
        if (studentIds.has(key)) {
            duplicateEntries++;
        } else {
            studentIds.add(key);
        }
    });
});
console.log(`\nDuplicate student-year records in the same school (should be 0): ${duplicateEntries}`);
