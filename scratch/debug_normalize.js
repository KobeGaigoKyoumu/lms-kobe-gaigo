const XLSX = require('xlsx');
const path = require('path');

// Re-define normalizeDestination to test it
const normalizeDestination = (d) => {
    if (!d) return '';
    let name = String(d).trim();
    name = name.replace(/[\(（]\s*\d+\s*[\/\-]\s*\d+\s*[\)）]/g, '');
    name = name.replace(/[\(（]\s*\d+\s*月\s*\d+\s*日\s*[\)）]/g, '');
    name = name.replace(/\s+/g, '').trim();

    if (name.startsWith('神戸市外国語大学大学院')) {
        return '神戸市外国語大学大学院';
    }
    if (name.startsWith('東京テクニカルカレッジ') || name.startsWith('専門学校東京テクニカルカレッジ')) {
        return '東京テクニカルカレッジ';
    }
    if (name.startsWith('東京工科自動車大学校') || name.startsWith('専門学校東京工科自動車大学校')) {
        return '東京工科自動車大学校';
    }

    const mapping = {
        '東亜経理': '東亜経理専門学校',
        '東亜経理専門学校': '東亜経理専門学校',
        '東京国際ビジネスカレッジ': '東京国際ビジネスカレッジ神戸校',
        '東京国際ビジネスカレッジ神戸校': '東京国際ビジネスカレッジ神戸校',
        'アートカレッジ': '専門学校アートカレッジ神戸',
        'アートカレッジ神戸': '専門学校アートカレッジ神戸',
        '専門学校アートカレッジ神戸': '専門学校アートカレッジ神戸',
        '愛甲': '愛甲学院専門学校',
        '愛甲学院': '愛甲学院専門学校',
        '愛甲学院専門学校': '愛甲学院専門学校',
        '愛甲学院専門学校AO': '愛甲学院専門学校',
        '愛甲学院専門学校ＡＯ': '愛甲学院専門学校',
        'ICT': 'ICT専門学校',
        'ICT専門学校': 'ICT専門学校',
        '関西国際旅行ホテル専門学校': '関西国際旅行・ホテル専門学校',
        '関西国際旅行・ホテル専門学校': '関西国際旅行・ホテル専門学校',
        'トヨタ自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ神戸自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ自動車大学校神戸校': 'トヨタ自動車大学校神戸校',
        '大原': '大原簿記専門学校',
        '大原簿記専門学校三宮校': '大原簿記専門学校',
        '専門学校大原学園神戸校': '大原簿記専門学校',
        '大原学園東京校': '大原簿記専門学校',
        '大原簿記専門学校': '大原簿記専門学校',
        '日本コンピュータ': '日本コンピュータ専門学校',
        '日本コンピュータ専門学校': '日本コンピュータ専門学校',
        '和歌山福祉専門学校': '和歌山社会福祉専門学校',
        '和歌山社会福祉専門学校': '和歌山社会福祉専門学校',
        '駿台観光&外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
        '駿台観光＆外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
        '中日本自動車短期大学': '中日本自動車短期大学',
        '中日本自動車': '中日本自動車短期大学',
        '長岡公務員・情報ビジネス': '長岡公務員情報ビジネス専門学校',
        '長岡公務員情報ビジネス専門学校': '長岡公務員情報ビジネス専門学校',
        'GIA専門学校新潟国際自動車大学校': '新潟国際自動車大学校',
        '新潟国際自動車大学校': '新潟国際自動車大学校',
        '西日本アカデミー': '西日本アカデミー航空専門学校',
        '西日本アカデミー航空専門学校': '西日本アカデミー航空専門学校',
        '花壇自動車大学校': '専門学校花壇自動車大学校',
        '専門学校花壇自動車大学校': '専門学校花壇自動車大学校',
        '日本マンガ芸術学院': '専門学校日本マンガ芸術学院',
        '専門学校日本マンガ芸術学院': '専門学校日本マンガ芸術学院',
        '国際工科専門学校': '日本国際工科専門学校',
        '日本国際工科専門学校': '日本国際工科専門学校',
        '日本デジタルカレッジ': '専門学校日本デジタルカレッジ',
        '専門学校日本デジタルカレッジ': '専門学校日本デジタルカレッジ'
    };

    return mapping[name] || name;
};

// 1. Test static strings
console.log('Static test:', normalizeDestination('神戸市外国語大学大学院外国語学研究科'));
console.log('Static test 2:', normalizeDestination('専門学校大原学園神戸校'));
console.log('Static test 3:', normalizeDestination('愛甲学院専門学校AO'));
console.log('Static test 4:', normalizeDestination('愛甲学院専門学校ＡＯ'));

// 2. Read from 2023 Excel
const filePath = path.join(__dirname, '../2023年度　進路一覧.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const row1 = rows[1];
console.log('\nRow 1 raw:', row1);
const cellVal = row1[13]; // 進学先 (Last element)
console.log('Cell value:', cellVal);
console.log('Normalized cell value:', normalizeDestination(cellVal));
