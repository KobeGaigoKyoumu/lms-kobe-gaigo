const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/career_stats_v2.json');

try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    
    // 統合マッピングルール定義 (統合元 -> 統合先)
    const mergeMap = {
        '長岡公務員・情報ビジネス': '長岡公務員情報ビジネス専門学校',
        'GIA 専門学校 新潟国際自動車大学校': '新潟国際自動車大学校',
        '西日本アカデミー': '西日本アカデミー航空専門学校',
        '花壇自動車大学校': '専門学校花壇自動車大学校',
        '日本マンガ芸術学院': '専門学校日本マンガ芸術学院',
        '国際工科専門学校': '日本国際工科専門学校',
        '日本デジタルカレッジ': '専門学校日本デジタルカレッジ',
        'トヨタ神戸自動車大学校': 'トヨタ自動車大学校神戸校'
    };

    console.log('Starting migration and merge on topDestinations...');
    
    const initialCount = data.topDestinations.length;
    const newDestinations = [];

    data.topDestinations.forEach(dest => {
        const name = dest.name;
        const targetName = mergeMap[name];

        if (targetName) {
            // 統合元である場合：統合先を新しく作るか、既存の統合先にマージする
            console.log(`Merging [${name}] (${dest.count}名) into [${targetName}]`);
            
            // 既存の統合先オブジェクトを探す (newDestinations または残りのデータから)
            let targetObj = newDestinations.find(d => d.name === targetName) || 
                            data.topDestinations.find(d => d.name === targetName);
            
            if (!targetObj) {
                // 統合先がまだデータに存在しない場合は新しく枠を作る（普通は存在するはず）
                targetObj = {
                    name: targetName,
                    count: 0,
                    years: {},
                    students: []
                };
                newDestinations.push(targetObj);
            }

            // 合算処理
            targetObj.count += dest.count;
            
            // yearsの合算
            if (dest.years) {
                Object.keys(dest.years).forEach(yr => {
                    targetObj.years[yr] = (targetObj.years[yr] || 0) + dest.years[yr];
                });
            }

            // studentsの合算
            if (dest.students) {
                dest.students.forEach(st => {
                    // 重複しないように追加
                    if (!targetObj.students.some(s => s.id === st.id)) {
                        targetObj.students.push(st);
                    }
                });
            }
        } else {
            // 統合元ではない場合：
            // すでに newDestinations に追加されている（他のものがここにマージされた）可能性を確認
            let existing = newDestinations.find(d => d.name === name);
            if (!existing) {
                // なければそのままコピーして追加
                existing = {
                    name: dest.name,
                    count: dest.count,
                    years: { ...dest.years },
                    students: [ ...dest.students ]
                };
                newDestinations.push(existing);
            }
        }
    });

    // 表記ゆれをマージした後の追加処理
    // 統合元があった場合、統合先オブジェクトの count や years, students を最終更新する
    // 上のループで統合先に合算は行われているので、統合元のデータ自体は newDestinations に追加しないことで除外されます

    // countで降順ソート
    newDestinations.sort((a, b) => b.count - a.count);

    data.topDestinations = newDestinations;
    const finalCount = data.topDestinations.length;

    console.log(`Merge completed.`);
    console.log(`Original topDestinations count: ${initialCount}`);
    console.log(`New topDestinations count: ${finalCount}`);
    console.log(`Merged and removed ${initialCount - finalCount} duplicate entries.`);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved changes to career_stats_v2.json successfully.');

} catch (err) {
    console.error('Error during merge:', err);
}
