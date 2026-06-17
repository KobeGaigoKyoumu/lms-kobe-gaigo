const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    const destinations = data.topDestinations;

    // 1. 不明・無効な名前の検出
    const invalidNames = [];
    const unknownIndicators = ['不明', '未定', '?', '？', '-', '－', '/', '／', 'unknown', 'pending', 'その他', '進学', '就職', '帰国', '特定活動'];

    destinations.forEach(dest => {
        const name = dest.name;
        const isUnknown = unknownIndicators.some(ind => name.toLowerCase().includes(ind)) || name.trim() === '' || name.length <= 1;
        if (isUnknown) {
            invalidNames.push({
                name: dest.name,
                count: dest.count,
                years: dest.years
            });
        }
    });

    console.log(`=== 1. 不明・無効な表記の検出 (件数: ${invalidNames.length}) ===`);
    console.log(JSON.stringify(invalidNames, null, 2));

    // 2. 表記ゆれ（部分一致・類似度）の検出
    console.log('\n=== 2. 表記ゆれ・部分重複の疑いがある学校名の検出 ===');
    const similarityGroup = [];

    const cleanName = (str) => {
        return str
            .replace(/\s+/g, '')
            .replace(/[＆＆]/g, '&') 
            .replace(/[・·\-\/\s]/g, '') 
            .toLowerCase();
    };

    for (let i = 0; i < destinations.length; i++) {
        const nameA = destinations[i].name;
        const cleanA = cleanName(nameA);

        for (let j = i + 1; j < destinations.length; j++) {
            const nameB = destinations[j].name;
            const cleanB = cleanName(nameB);

            let isSimilar = false;
            let reason = '';

            if (cleanA.length > 2 && cleanB.length > 2) {
                if (cleanA.includes(cleanB)) {
                    isSimilar = true;
                    reason = `「${nameA}」が「${nameB}」を内包`;
                } else if (cleanB.includes(cleanA)) {
                    isSimilar = true;
                    reason = `「${nameB}」が「${nameA}」を内包`;
                }
            }

            if (!isSimilar && cleanA.length > 3 && cleanB.length > 3) {
                let commonChars = 0;
                const setA = new Set(cleanA.split(''));
                for (const char of cleanB) {
                    if (setA.has(char)) {
                        commonChars++;
                    }
                }
                const similarityScore = commonChars / Math.max(cleanA.length, cleanB.length);
                if (similarityScore >= 0.8) {
                    isSimilar = true;
                    reason = `文字類似度が高い (${Math.round(similarityScore * 100)}%)`;
                }
            }

            if (isSimilar) {
                const keywords = ['専門学校', '大学', '短期大学', '大学校', 'カレッジ', 'スクール', '学院'];
                let baseA = cleanA;
                let baseB = cleanB;
                keywords.forEach(k => {
                    baseA = baseA.replace(k, '');
                    baseB = baseB.replace(k, '');
                });

                if (baseA.length > 1 && baseB.length > 1 && (baseA.includes(baseB) || baseB.includes(baseA) || baseA === baseB)) {
                    similarityGroup.push({
                        schoolA: nameA,
                        countA: destinations[i].count,
                        schoolB: nameB,
                        countB: destinations[j].count,
                        reason: reason
                    });
                }
            }
        }
    }

    console.log(JSON.stringify(similarityGroup, null, 2));

} catch (err) {
    console.error('Error:', err);
}
