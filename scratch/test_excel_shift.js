const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const srcPath = path.join(__dirname, '../全学生進路希望調査票2025.xlsx');
const destPath = path.join(__dirname, 'output_shift.xlsx');

try {
    const wb = XLSX.readFile(srcPath);
    const ws1 = wb.Sheets['2025'];
    const ws2 = wb.Sheets['名簿2025'];

    const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
    
    // テストとして「2-1」クラスの学生を抽出
    const targetClass = '2-1';
    
    // ターゲットクラスの学生の名簿上のインデックス(0-indexed)を特定
    const targetStudents = [];
    rows2.forEach((row, idx) => {
        if (row && row[1] === targetClass) {
            targetStudents.push({
                dbIdx: idx, // 元の名簿行
                studentId: row[0],
                className: row[1],
                num: row[2],
                name: row[3]
            });
        }
    });

    console.log(`Found ${targetStudents.length} students in class ${targetClass}`);

    // 新しいセルデータとマージ範囲を格納する一時オブジェクト
    const newCells1 = {};
    const newMerges1 = [];

    targetStudents.forEach((student, targetIdx) => {
        const sourceStartRow = student.dbIdx * 24;
        const destStartRow = targetIdx * 24;
        const rowOffset = destStartRow - sourceStartRow;

        // 1. Sheet 1 ('2025') のセルをコピー
        for (let r = sourceStartRow; r < sourceStartRow + 24; r++) {
            for (let c = 0; c < 20; c++) {
                const srcAddr = XLSX.utils.encode_cell({ r, c });
                if (ws1[srcAddr]) {
                    const destAddr = XLSX.utils.encode_cell({ r: r + rowOffset, c });
                    newCells1[destAddr] = { ...ws1[srcAddr] };
                    
                    // 値の書き換えテスト (名前のセル F2, F26, ... は Row 1, Col 5 等)
                    // 各ブロックの 2行目 (r % 24 === 1) の Col 5 (c === 5) が名前
                    if (r % 24 === 1 && c === 5) {
                        newCells1[destAddr].v = student.name + ' (UPDATED)';
                    }
                }
            }
        }

        // 2. マージ範囲のコピーとオフセット適用
        if (ws1['!merges']) {
            ws1['!merges'].forEach(m => {
                // このマージセルが元の学生ブロックに含まれているか
                if (m.s.r >= sourceStartRow && m.e.r < sourceStartRow + 24) {
                    newMerges1.push({
                        s: { r: m.s.r + rowOffset, c: m.s.c },
                        e: { r: m.e.r + rowOffset, c: m.e.c }
                    });
                }
            });
        }
    });

    // 3. 元の Sheet 1 をクリアして詰め替える
    // 全キーを削除
    Object.keys(ws1).forEach(k => {
        if (!k.startsWith('!')) {
            delete ws1[k];
        }
    });

    // 新しいセルデータを割り当て
    Object.assign(ws1, newCells1);
    ws1['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: targetStudents.length * 24 - 1, c: 19 }
    });
    ws1['!merges'] = newMerges1;

    // 4. Sheet 2 ('名簿2025') の詰め替え
    const newCells2 = {};
    targetStudents.forEach((student, targetIdx) => {
        // 学籍番号
        newCells2[XLSX.utils.encode_cell({ r: targetIdx, c: 0 })] = { t: 'n', v: student.studentId };
        // クラス
        newCells2[XLSX.utils.encode_cell({ r: targetIdx, c: 1 })] = { t: 's', v: student.className };
        // 出席番号
        newCells2[XLSX.utils.encode_cell({ r: targetIdx, c: 2 })] = { t: 'n', v: student.num };
        // 名前
        newCells2[XLSX.utils.encode_cell({ r: targetIdx, c: 3 })] = { t: 's', v: student.name };
    });

    // 元の Sheet 2 をクリア
    Object.keys(ws2).forEach(k => {
        if (!k.startsWith('!')) {
            delete ws2[k];
        }
    });
    Object.assign(ws2, newCells2);
    ws2['!ref'] = XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: targetStudents.length - 1, c: 3 }
    });

    // 保存
    XLSX.writeFile(wb, destPath);
    console.log('Successfully generated shifted Excel at:', destPath);
} catch (e) {
    console.error('Error:', e);
}
