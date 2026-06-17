const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

const targetYears = [2021, 2024];

targetYears.forEach(year => {
    // 1. summary.years に追加
    if (!data.summary.years.includes(year)) {
        data.summary.years.push(year);
        data.summary.years.sort((a, b) => a - b);
        console.log(`Added ${year} to summary.years`);
    } else {
        console.log(`${year} already exists in summary.years`);
    }

    // 2. yearlyTrends に空データを追加
    const hasTrend = data.yearlyTrends.some(t => t.year === year);
    if (!hasTrend) {
        data.yearlyTrends.push({
            year: year,
            total: 0,
            graduated: 0,
            withdrawn: 0,
            graduationRate: 0,
            categories: {}
        });
        data.yearlyTrends.sort((a, b) => a - b);
        console.log(`Added ${year} to yearlyTrends`);
    } else {
        console.log(`${year} already exists in yearlyTrends`);
    }
});

data.generatedAt = new Date().toISOString();

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Successfully saved career_stats_v2.json');
