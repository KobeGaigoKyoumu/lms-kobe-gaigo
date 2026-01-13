/**
 * PDF生成テストスクリプト v3
 * 最終調整版
 */

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート.pdf');
const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テスト出力v3.pdf');

/**
 * 座標レイアウト定義 v3
 * 最終調整版
 */
const LAYOUT = {
    // 白塗りつぶし領域（高さを増加、Y座標を下げる）
    whiteouts: [
        // 学籍番号値
        { x: 148, y: 698, width: 180, height: 24 },
        // クラス値（幅を広げる）
        { x: 418, y: 698, width: 160, height: 24 },
        // 国籍値
        { x: 148, y: 673, width: 180, height: 24 },
        // 氏名値
        { x: 418, y: 673, width: 160, height: 24 },
        // 生年月日値
        { x: 148, y: 648, width: 180, height: 24 },
        // 性別値
        { x: 418, y: 648, width: 160, height: 24 },
        // 入学年月日値
        { x: 148, y: 623, width: 360, height: 24 },
        // 卒業年月日（卒業見込み部分は残す）
        { x: 148, y: 598, width: 180, height: 24 },
        // 発行元情報
        { x: 395, y: 56, width: 180, height: 46 },
    ],

    // テキスト配置座標（Y座標を3pt下げる）
    text: {
        studentId: { x: 155, y: 704 },
        className: { x: 425, y: 704 },
        nationality: { x: 155, y: 679 },
        name: { x: 425, y: 679 },
        birthDate: { x: 155, y: 654 },
        gender: { x: 425, y: 654 },
        enrollmentDate: { x: 155, y: 629 },
        graduationInfo: { x: 155, y: 604 },
        schoolName: { x: 405, y: 82 },
        issueDate: { x: 405, y: 64 },
    },

    // 成績テーブル Y座標
    gradeRows: {
        '文字語彙': 508,
        '文法': 483,
        '読解': 458,
        '聴解': 433,
        '作文': 408,
        '会話': 383,
        '総合': 358,
    },

    // 評価列のX中心座標（左に8pt移動）
    gradeColumns: {
        'A': 184,
        'B': 269,
        'C': 354,
        'D': 439,
        'F': 524,
    },
};

async function testPdfGeneration() {
    console.log('テンプレートPDF読み込み:', TEMPLATE_PATH);

    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    console.log(`ページサイズ: ${width} x ${height}`);

    const white = rgb(1, 1, 1);
    const black = rgb(0, 0, 0);

    // 白い矩形で既存データを塗りつぶし
    console.log('\n既存データを白で塗りつぶし中...');
    for (const rect of LAYOUT.whiteouts) {
        page.drawRectangle({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            color: white,
        });
    }

    // フォント
    const { StandardFonts } = require('pdf-lib');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // テストデータ
    const testData = {
        studentId: '2404999',
        className: '2-11 Class',
        nationality: 'China',
        name: 'TEST STUDENT',
        birthDate: '2000 / 01 / 01',
        gender: 'Male',
        enrollmentDate: '2024 / 04 / 01',
        graduationInfo: '2026 / 03 / 31',
        schoolName: 'Kobe Gaigo',
        issueDate: '2026/01/13',
    };

    console.log('\nテストデータを描画中...');
    for (const [key, pos] of Object.entries(LAYOUT.text)) {
        const text = testData[key];
        if (text) {
            page.drawText(text, {
                x: pos.x,
                y: pos.y,
                size: 10,
                font: font,
                color: black,
            });
        }
    }

    // 成績に丸を描画
    console.log('\n成績の丸を描画中...');
    const testGrades = {
        '文字語彙': 'A',
        '文法': 'B',
        '読解': 'C',
        '聴解': 'B',
        '作文': 'A',
        '会話': 'B',
        '総合': 'B',
    };

    for (const [subject, grade] of Object.entries(testGrades)) {
        const rowY = LAYOUT.gradeRows[subject];
        const colX = LAYOUT.gradeColumns[grade];

        if (rowY && colX) {
            page.drawEllipse({
                x: colX,
                y: rowY,
                xScale: 13,
                yScale: 9,
                borderColor: black,
                borderWidth: 1.2,
            });
        }
    }

    // 保存
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(OUTPUT_PATH, pdfBytes);

    console.log('\n=== 出力完了 ===');
    console.log('出力ファイル:', OUTPUT_PATH);
}

testPdfGeneration().catch(console.error);
