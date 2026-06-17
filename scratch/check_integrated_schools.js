const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');
const raw = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(raw);

console.log('=== Checking Integrated Schools in JSON ===');

const checkPatterns = [
    '愛甲', '大原', '神戸市外国語大学', '東京テクニカル', '東京工科'
];

data.topDestinations.forEach(dest => {
    checkPatterns.forEach(pat => {
        if (dest.name.includes(pat)) {
            console.log(`Matched destination name: "${dest.name}", count=${dest.count}`);
        }
    });
});
