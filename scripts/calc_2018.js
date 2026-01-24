
const fs = require('fs');
const path = require('path');

const STUDENTS_FILE = path.join(process.cwd(), 'data/historical_students.json');
const JLPT_FILE = path.join(process.cwd(), 'data/jlpt_historical.json');

function calculate2018() {
    let rawContent = fs.readFileSync(STUDENTS_FILE, 'utf8');
    rawContent = rawContent.replace(/:\s*NaN/g, ': null');
    const studentsData = JSON.parse(rawContent);

    // Analyze 2016 Cohort
    const cohort2016 = studentsData.students.filter(s => s.student_id && (String(s.student_id).startsWith('16') || String(s.student_id).startsWith('28')));

    // Check for graduates
    const graduates2018 = cohort2016.filter(s => s.source === '修了生' || s.source === '卒業生');
    console.log(`Found ${graduates2018.length} confirmed graduates.`);

    if (graduates2018.length === 0) return;

    // Load JLPT
    const jlptData = JSON.parse(fs.readFileSync(JLPT_FILE, 'utf8'));

    let n3PlusCount = 0;
    let kanjiTotal = 0;
    let kanjiN3Plus = 0;
    let nonKanjiTotal = 0;
    let nonKanjiN3Plus = 0;

    let debugMatchCount = 0;

    graduates2018.forEach(student => {
        const isKanji = ['中国', '台湾', '韓国'].includes(student.nationality);
        if (isKanji) kanjiTotal++; else nonKanjiTotal++;

        let records = jlptData.records.filter(r => String(r.studentId) === String(student.student_id));

        // Failover to Name Match
        if (records.length === 0 && student.name) {
            const sName = student.name.replace(/\s+/g, '').toLowerCase();
            records = jlptData.records.filter(r => {
                if (!r.name) return false;
                return r.name.replace(/\s+/g, '').toLowerCase() === sName;
            });
        }

        if (records.length > 0) {
            debugMatchCount++;
        }

        let hasN3Plus = false;
        records.forEach(r => {
            if (r.result === '合格') {
                const level = parseInt(r.level.replace('N', ''));
                if (level <= 3) hasN3Plus = true;
            }
        });

        if (hasN3Plus) {
            n3PlusCount++;
            if (isKanji) kanjiN3Plus++; else nonKanjiN3Plus++;
        }
    });

    console.log(`Matched JLPT records for ${debugMatchCount} students.`);

    const total = graduates2018.length;
    const rate = total > 0 ? (n3PlusCount / total * 100) : 0;

    const stats = {
        year: "2018年3月",
        total: total,
        matched: debugMatchCount,
        n3_plus: n3PlusCount,
        rate: rate,
        match_rate: total > 0 ? (debugMatchCount / total * 100) : 0,
        kanji_stats: {
            total: kanjiTotal,
            n3_plus: kanjiN3Plus,
            rate: kanjiTotal > 0 ? (kanjiN3Plus / kanjiTotal * 100) : 0
        },
        non_kanji_stats: {
            total: nonKanjiTotal,
            n3_plus: nonKanjiN3Plus,
            rate: nonKanjiTotal > 0 ? (nonKanjiN3Plus / nonKanjiTotal * 100) : 0
        }
    };

    fs.writeFileSync('data/2018_stats_clean.json', JSON.stringify(stats, null, 2));
    console.log("Written to data/2018_stats_clean.json");
}

calculate2018();
