const fs = require('fs');
const path = require('path');

const JLPT_HISTORICAL_JSON = path.join(process.cwd(), 'data', 'jlpt_historical.json');
const CAREER_STATS_JSON = path.join(process.cwd(), 'src', 'data', 'career_stats_v2.json');

function analyze() {
    try {
        console.log('Loading career data...');
        const careerData = JSON.parse(fs.readFileSync(CAREER_STATS_JSON, 'utf8'));
        console.log('Loading JLPT data...');
        const jlptData = JSON.parse(fs.readFileSync(JLPT_HISTORICAL_JSON, 'utf8'));

        // Graduates in March 2020 (Year 2018 cohort in our classification)
        const cohort2018 = careerData.yearlyTrends.find(t => t.year === 2018);
        const grad2020Count = cohort2018 ? cohort2018.graduated : 0;

        console.log(`Reported Graduates (March 2020) in JSON summary: ${grad2020Count}`);

        // Collect all students from 2018 cohort mentioned in topDestinations
        const students2018 = [];
        const uniqueStudentIds = new Set();

        careerData.topDestinations.forEach(dest => {
            if (dest.students) {
                dest.students.forEach(s => {
                    if (s.year === 2018) {
                        const sid = String(s.id);
                        if (!uniqueStudentIds.has(sid)) {
                            students2018.push(s);
                            uniqueStudentIds.add(sid);
                        }
                    }
                });
            }
        });

        console.log(`Found ${students2018.length} unique students in 2018 cohort list from school destinations.`);

        // Match with JLPT
        let n3PlusCount = 0;
        const passersBySession = {}; // session -> count
        const passerDetails = [];

        students2018.forEach(student => {
            const name = student.name.toLowerCase().replace(/\s+/g, '');
            const id = String(student.id);

            // Find all JLPT records for this student
            const records = jlptData.filter(r => {
                const rName = (r.name || '').toLowerCase().replace(/\s+/g, '');
                const rId = String(r.studentId || '');
                // Try matching by ID first, then by name if name is long enough
                if (rId === id) return true;
                if (name.length > 3 && rName === name) return true;
                return false;
            });

            const passedRecords = records.filter(r =>
                ['N1', 'N2', 'N3'].includes(r.level) && r.result === '合格'
            );

            if (passedRecords.length > 0) {
                n3PlusCount++;

                // Track which sessions they passed in
                passedRecords.forEach(r => {
                    passersBySession[r.session] = (passersBySession[r.session] || 0) + 1;
                });

                passerDetails.push({
                    name: student.name,
                    id: student.id,
                    passed: passedRecords.map(p => `${p.session}(${p.level})`)
                });
            }
        });

        console.log(`\nCalculated N3+ Holders for March 2020 Graduates: ${n3PlusCount}`);
        console.log(`Denominator (Graduates): ${grad2020Count}`);
        console.log(`Calculated Percentage: ${((n3PlusCount / grad2020Count) * 100).toFixed(1)}%`);

        console.log('\nPassers by Session (How many 2018-cohort graduates passed in each session):');
        Object.keys(passersBySession).sort().forEach(s => {
            console.log(` - ${s}: ${passersBySession[s]} people`);
        });

        // Check total passers in 2019 sessions across ALL students (for context)
        const total2019_1 = jlptData.filter(r => r.session === '2019年第1回' && r.result === '合格' && ['N1', 'N2', 'N3'].includes(r.level)).length;
        const total2019_2 = jlptData.filter(r => r.session === '2019年第2回' && r.result === '合格' && ['N1', 'N2', 'N3'].includes(r.level)).length;

        console.log(`\nTotal N3+ JLPT Passers (All students in school) in 2019:`);
        console.log(` - 2019 Round 1: ${total2019_1} people`);
        console.log(` - 2019 Round 2: ${total2019_2} people`);

        console.log('\nSample of passers from March 2020 graduates:');
        passerDetails.slice(0, 10).forEach(p => {
            console.log(` - ${p.name} (${p.id}): ${p.passed.join(', ')}`);
        });

    } catch (e) {
        console.error('Error in analysis script:', e);
    }
}

analyze();
