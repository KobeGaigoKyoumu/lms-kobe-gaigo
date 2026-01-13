/**
 * PDFのテキスト位置を分析するスクリプト
 * テンプレート作成のための座標特定用
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function analyzePDF() {
    const pdfPath = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート.pdf');

    console.log('PDFを読み込み中:', pdfPath);

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // ページサイズを取得
    const { width, height } = firstPage.getSize();
    console.log('\n=== PDF情報 ===');
    console.log(`ページサイズ: ${width} x ${height} ポイント`);
    console.log(`A4サイズ参考: 595 x 842 ポイント`);

    // PDFのフォームフィールドを確認
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    if (fields.length > 0) {
        console.log('\n=== フォームフィールド ===');
        fields.forEach(field => {
            console.log(`- ${field.getName()}: ${field.constructor.name}`);
        });
    } else {
        console.log('\nフォームフィールドはありません（通常のPDF）');
    }

    console.log('\n=== 座標配置ガイド ===');
    console.log('PDF座標系は左下が原点 (0, 0) です');
    console.log('');
    console.log('推定座標（A4サイズ基準、手動調整が必要）:');
    console.log('');
    console.log('【個人情報テーブル】');
    console.log('  学籍番号値: x=180, y=695');
    console.log('  クラス値:   x=420, y=695');
    console.log('  国籍値:     x=180, y=670');
    console.log('  氏名値:     x=420, y=670');
    console.log('  生年月日値: x=180, y=645');
    console.log('  性別値:     x=420, y=645');
    console.log('  入学日値:   x=180, y=620');
    console.log('  卒業日値:   x=180, y=595');
    console.log('');
    console.log('【成績テーブル】');
    console.log('  科目列: x=100');
    console.log('  A列: x=200, B列: x=260, C列: x=320, D列: x=380, F列: x=440');
    console.log('');
    console.log('【発行情報】');
    console.log('  学校名: x=380, y=150');
    console.log('  日付:   x=380, y=130');

    console.log('\n=== 次のステップ ===');
    console.log('1. 空白テンプレートを作成するか');
    console.log('2. サンプルPDFの該当部分を白で塗りつぶしてから上書きする');
    console.log('3. 座標を微調整してテスト出力する');
}

analyzePDF().catch(console.error);
