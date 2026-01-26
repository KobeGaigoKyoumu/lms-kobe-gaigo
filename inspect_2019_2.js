const fs = require('fs');
const path = require('path');

const JLPT_HISTORICAL_JSON = path.join(process.cwd(), 'data', 'jlpt_historical.json');

function check2019_2() {
    const jlptData = JSON.parse(fs.readFileSync(JLPT_HISTORICAL_JSON, 'utf8'));

    const round2 = jlptData.filter(r => r.session === '2019年第2回' && r.result === '合格' && ['N1', 'N2', 'N3'].includes(r.level));

    console.log(`Total N3+ passers in 2019 Round 2: ${round2.length}`);
    round2.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.name} (${r.studentId}): ${r.level}`);
    });
}

check2019_2();
