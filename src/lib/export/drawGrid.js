/**
 * PDF座標を正確に測定するスクリプト
 * 境界線（赤いグリッド）を描画して座標を特定
 */

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート.pdf');
const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_グリッド.pdf');

async function drawGrid() {
    console.log('テンプレートPDF読み込み中...');

    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    console.log(`ページサイズ: ${width} x ${height} pt`);
    console.log('A4参考: 595 x 842 pt');

    const red = rgb(1, 0, 0);
    const blue = rgb(0, 0, 1);
    const { StandardFonts } = require('pdf-lib');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 50ポイント間隔でグリッド線を描画
    console.log('\nグリッド線を描画中...');

    // 水平線 (Y軸の目盛り)
    for (let y = 0; y <= height; y += 50) {
        page.drawLine({
            start: { x: 0, y: y },
            end: { x: width, y: y },
            thickness: 0.5,
            color: red,
            opacity: 0.5,
        });
        // Y座標ラベル
        page.drawText(`${y}`, {
            x: 5,
            y: y + 2,
            size: 7,
            font: font,
            color: red,
        });
    }

    // 垂直線 (X軸の目盛り)
    for (let x = 0; x <= width; x += 50) {
        page.drawLine({
            start: { x: x, y: 0 },
            end: { x: x, y: height },
            thickness: 0.5,
            color: blue,
            opacity: 0.5,
        });
        // X座標ラベル (下部)
        if (x > 0) {
            page.drawText(`${x}`, {
                x: x - 8,
                y: 5,
                size: 7,
                font: font,
                color: blue,
            });
        }
    }

    // 主要なエリアをハイライト
    console.log('\n主要エリアの推定座標:');
    console.log('タイトル「成績証明書」: x=210-390, y=770-800');
    console.log('個人情報テーブル: y=620-735');
    console.log('成績テーブル: y=380-580');
    console.log('特記事項: y=340-380');
    console.log('評価基準: y=250-320');
    console.log('発行元情報: y=100-140');

    // 保存
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(OUTPUT_PATH, pdfBytes);

    console.log('\n=== 出力完了 ===');
    console.log('グリッド付きPDF:', OUTPUT_PATH);
    console.log('このファイルを開いて座標を確認してください。');
}

drawGrid().catch(console.error);
