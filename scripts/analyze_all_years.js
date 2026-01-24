const { createClient } = require('@supabase/supabase-js');

function getEnv(key) {
    if (process.env[key]) return process.env[key];
    for (const k of Object.keys(process.env)) {
        if (k.includes(key)) return process.env[k];
    }
    return null;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) { console.error('Missing credentials'); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getEnrollmentYear(student) {
    if (student.enrollment_date) {
        const d = new Date(student.enrollment_date);
        if (!isNaN(d.getTime())) return d.getFullYear();
    }
    // Fallback to ID parsing if date is missing
    // 7 digit IDs: first 4 are year (e.g. 2021xxx) or 2 are year (e.g. 21xxx -> 2021?)
    // Actually the logic in jlpt.js is more complex, but let's try date first.
    // If ID starts with '2', it's likely 202x.
    // Let's stick to enrollment_date first for accuracy, and report "Unknown" if missing.
    return 'Unknown';
}

async function analyze() {
    let allStudents = [];
    let from = 0;
    const size = 1000;
    while (true) {
        const { data: students, error } = await supabase
            .from('students')
            .select('student_id_text, enrollment_date, class_name, status')
            .range(from, from + size - 1);

        if (error) {
            console.error(error);
            break;
        }
        if (students.length === 0) break;
        allStudents = allStudents.concat(students);
        if (students.length < size) break;
        from += size;
    }

    const students = allStudents;

    const stats = {};

    students.forEach(s => {
        const year = getEnrollmentYear(s);
        if (!stats[year]) {
            stats[year] = { total: 0, missingClass: 0, sampleMissing: [] };
        }
        stats[year].total++;
        if (!s.class_name) {
            stats[year].missingClass++;
            if (stats[year].sampleMissing.length < 3) {
                stats[year].sampleMissing.push(s.student_id_text);
            }
        }
    });

    let report = 'Enrollment Year | Total | Missing Class | Missing %\n---|---|---|---\n';

    // Sort years
    const years = Object.keys(stats).sort();
    years.forEach(y => {
        const s = stats[y];
        const pct = ((s.missingClass / s.total) * 100).toFixed(1);
        report += `${y} | ${s.total} | ${s.missingClass} | ${pct}%\n`;
    });

    console.log(report);
    const fs = require('fs');
    fs.writeFileSync('analysis_result.txt', report);
}

analyze();
