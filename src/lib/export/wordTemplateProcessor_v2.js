/**
 * 成績証明書 Word テンプレート処理 v2 (docxtemplater版)
 * 修復済みテンプレートを使用し、正確なスタイルで出力する
 */

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');

// 修復済みのテンプレートを使用 (これにはフォントスタイルが適用済み)
const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート_fixed_safe.docx');

/**
 * Wordテンプレートにデータを差し込み
 * @param {Object} data - 学生データ
 * @param {string} issueDate - 発行日
 * @returns {Promise<Buffer>} 生成されたWordファイルのバッファ
 */
async function generateFromTemplate(data, issueDate) {
    // 1. テンプレートをバイナリとして読み込む
    const content = fs.readFileSync(TEMPLATE_PATH, 'binary');

    // 2. PizZipでzipを開く
    const zip = new PizZip(content);

    // 3. Docxtemplaterを初期化
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    // 4. データをセット
    const templateData = {
        studentId: data.studentId || '',
        className: data.className || '',
        nationality: data.nationality || '',
        name: data.name || '',
        birthDate: data.birthDate || '',
        gender: data.gender || '',
        enrollmentDate: data.enrollmentDate || '',
        graduationDate: data.graduationDate || '',
        issueDate: issueDate || '',
    };

    // 拡張: 成績データがあればフラットに展開して追加
    if (data.grades) {
        Object.keys(data.grades).forEach(key => {
            templateData[`grade_${key}`] = data.grades[key];
        });
    }

    doc.render(templateData);

    // 5. 生成されたドキュメントをバッファとして取得
    // 5. 生成されたドキュメントをバッファとして取得
    let buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });

    // 6. 名前の縮小処理 (後処理)
    const { applyNameScaling } = require('./wordStyleApplicator');
    buffer = applyNameScaling(buffer, templateData.name);

    return buffer;
}

/**
 * Wordファイルとして保存
 */
async function saveAsWord(data, issueDate, outputPath) {
    try {
        const buffer = await generateFromTemplate(data, issueDate);
        fs.writeFileSync(outputPath, buffer);
        console.log('Word生成完了:', outputPath);
        return outputPath;
    } catch (error) {
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors.map(function (error) {
                return error.properties.explanation;
            }).join("\n");
            console.log('errorMessages', errorMessages);
        }
        throw error;
    }
}

/**
 * テスト生成
 */
async function testGeneration() {
    const sampleData = {
        studentId: '2404999',
        className: '2-11　クラス',
        nationality: '中国',
        name: 'VERY LONG NAME TEST STUDENT (SHRINK ME)',
        birthDate: '2000 / 01 / 01',
        gender: '男',
        enrollmentDate: '2024 / 04 / 01',
        graduationDate: '2026 / 03 / 31　　　　　',
        // 他のデータ...
    };

    const outputPath = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_出力テスト.docx');

    await saveAsWord(sampleData, '2026年01月14日', outputPath);
}

if (require.main === module) {
    testGeneration().catch(console.error);
}

module.exports = {
    generateFromTemplate,
    saveAsWord
};
