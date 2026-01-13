/**
 * 成績証明書 Word テンプレート処理
 * docxtemplater + XML修復 + DOM操作によるスタイル適用
 */
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const { applyNameScaling, applyGraduationCircle } = require('./wordStyleApplicator');

// 修復済みのテンプレートを使用 (これにはフォントスタイルが適用済み)
// Vercel互換: process.cwd() を使用
const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'templates', '成績証明書_テンプレート_fixed_safe.docx');

/**
 * Wordテンプレートにデータを差し込み
 * @param {Object} data - 学生データ
 * @param {string} issueDate - 発行日
 * @returns {Promise<Buffer>} 生成されたWordファイルのバッファ
 */
async function generateFromTemplate(data, issueDate) {
    // テンプレート読み込み
    console.log('[WordGen] Template path:', TEMPLATE_PATH);
    if (!fs.existsSync(TEMPLATE_PATH)) {
        console.error('[WordGen] Template not found! Listing public/templates...');
        const templatesDir = path.join(process.cwd(), 'public', 'templates');
        if (fs.existsSync(templatesDir)) {
            console.log('[WordGen] Available files:', fs.readdirSync(templatesDir));
        }
        throw new Error(`Template not found at ${TEMPLATE_PATH}`);
    }
    const content = fs.readFileSync(TEMPLATE_PATH, 'binary');

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    // データ加工
    const templateData = {
        studentId: data.studentId || '',
        className: data.className ? data.className.replace(' ', '　') : '', // 半角スペースを全角に
        nationality: data.nationality || '',
        name: data.name || '',
        birthDate: data.birthDate || '',
        gender: data.gender || '',
        enrollmentDate: data.enrollmentDate || '',
        // 卒業月日の後ろにスペースを追加 (レイアウト調整)
        graduationDate: data.graduationDate ? data.graduationDate + '　　　　　' : '',
        issueDate: issueDate || '',
    };

    // 成績データの展開 (必要なら)
    if (data.grades) {
        Object.keys(data.grades).forEach(key => {
            templateData[`grade_${key}`] = data.grades[key];
        });
    }

    doc.render(templateData);

    let buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });

    // スタイル後処理 (長い名前の縮小)
    buffer = applyNameScaling(buffer, templateData.name);

    // 卒業状態に応じた〇マーク
    buffer = applyGraduationCircle(buffer, data.graduationStatus);

    return buffer;
}

/**
 * 成績証明書を生成して保存 (旧 generateTranscript と互換)
 */
async function generateTranscript(data, issueDate, outputPath) {
    try {
        const buffer = await generateFromTemplate(data, issueDate);
        fs.writeFileSync(outputPath, buffer);
        console.log('Word生成完了:', outputPath);
        return outputPath;
    } catch (error) {
        console.error('generateTranscript error:', error);
        throw error;
    }
}

module.exports = {
    generateFromTemplate,
    generateTranscript
};
