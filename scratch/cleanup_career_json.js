const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    
    const initialCount = data.topDestinations.length;
    
    // 除外したい「学校名ではない」進路先名の一覧
    const excludeNames = ['特定活動', '帰国予定', '就職', '帰国？'];
    
    // フィルタリング
    data.topDestinations = data.topDestinations.filter(dest => {
        return !excludeNames.includes(dest.name);
    });
    
    const finalCount = data.topDestinations.length;
    
    console.log(`Cleaned up career_stats_v2.json.`);
    console.log(`Original topDestinations count: ${initialCount}`);
    console.log(`Filtered topDestinations count: ${finalCount}`);
    console.log(`Removed: ${initialCount - finalCount} non-school destinations.`);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved changes successfully.');

} catch (err) {
    console.error('Error:', err);
}
