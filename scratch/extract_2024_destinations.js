const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../2024年度 進路状況【最新版】.xlsx');
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets['進路状況入力シート'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const normalizeDestination = (d) => {
    if (!d) return '';
    const name = String(d).replace(/\s+/g, '').trim();

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
        'ICT': 'ICT専門学校',
        'ICT専門学校': 'ICT専門学校',
        '関西国際旅行ホテル専門学校': '関西国際旅行・ホテル専門学校',
        '関西国際旅行・ホテル専門学校': '関西国際旅行・ホテル専門学校',
        'トヨタ自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ神戸自動車大学校': 'トヨタ自動車大学校神戸校',
        'トヨタ自動車大学校神戸校': 'トヨタ自動車大学校神戸校',
        '大原': '大原簿記専門学校三宮校',
        '大原簿記専門学校三宮校': '大原簿記専門学校三宮校',
        '日本コンピュータ': '日本コンピュータ専門学校',
        '日本コンピュータ専門学校': '日本コンピュータ専門学校',
        '和歌山福祉専門学校': '和歌山社会福祉専門学校',
        '和歌山社会福祉専門学校': '和歌山社会福祉専門学校',
        '駿台観光&外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
        '駿台観光＆外語ビジネス専門学校': '駿台観光＆外語ビジネス専門学校',
        '中日本自動車短期大学': '中日本自動車短期大学',
        '中日本自動車': '中日本自動車短期大学'
    };

    return mapping[name] || name;
};

// 学籍番号 -> 進路
const studentDestMap = {};

// 6行目 (インデックス5) からデータが始まる
for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const studentId = row[0];
    const className = row[1];
    const name = row[2];
    const schoolName = row[3];
    const status = row[5]; // 状況
    const otherPath = row[8]; // 進学以外
    const isDecided = row[9]; // 進路決定 (○)

    if (!studentId || isNaN(Number(studentId))) continue;

    const sId = String(studentId).trim();

    // 初期化か、すでに登録されているが、今回の行で「進路決定」が「○」の場合は上書き
    if (!studentDestMap[sId]) {
        studentDestMap[sId] = {
            id: sId,
            className: className || '',
            name: name || '',
            destination: '',
            isDecided: false
        };
    }

    if (isDecided === '○' && schoolName) {
        studentDestMap[sId].destination = normalizeDestination(schoolName);
        studentDestMap[sId].isDecided = true;
    } else if (!studentDestMap[sId].isDecided && otherPath) {
        studentDestMap[sId].destination = normalizeDestination(otherPath);
    }
}

const students = Object.values(studentDestMap);
console.log('Total students processed:', students.length);
console.log('Sample students with destination:');
console.log(students.slice(0, 20));

// 進路が決まっていない学生がいるか？
const noDest = students.filter(s => !s.destination);
console.log('Students without destination count:', noDest.length);
if (noDest.length > 0) {
    console.log('Sample without destination:', noDest.slice(0, 5));
}
