const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

// 1. summary.years に 2021 を追加
if (!data.summary.years.includes(2021)) {
    data.summary.years.push(2021);
    data.summary.years.sort((a, b) => a - b);
    console.log('Added 2021 to summary.years');
} else {
    console.log('2021 already exists in summary.years');
}

// 2. yearlyTrends に 2021年度の空データを追加
const has2021Trend = data.yearlyTrends.some(t => t.year === 2021);
if (!has2021Trend) {
    data.yearlyTrends.push({
        year: 2021,
        total: 0,
        graduated: 0,
        withdrawn: 0,
        graduationRate: 0,
        categories: {}
    });
    data.yearlyTrends.sort((a, b) => a.year - b.year);
    console.log('Added 2021 to yearlyTrends');
} else {
    console.log('2021 already exists in yearlyTrends');
}

data.generatedAt = new Date().toISOString();

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully saved career_stats_v2.json');
