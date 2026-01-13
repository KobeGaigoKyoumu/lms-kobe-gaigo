/**
 * Wordファイル内のプレースホルダーを診断するスクリプト
 */

const AdmZip = require('adm-zip');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート.docx');

function diagnoseTemplate() {
    const zip = new AdmZip(TEMPLATE_PATH);
    const documentXml = zip.getEntry('word/document.xml');

    if (!documentXml) {
        console.error('document.xml not found');
        return;
    }

    const content = documentXml.getData().toString('utf8');

    // プレースホルダーを検索
    const placeholders = [
        '{studentId}',
        '{className}',
        '{nationality}',
        '{name}',
        '{birthDate}',
        '{gender}',
        '{enrollmentDate}',
        '{graduationDate}',
        '{issueDate}'
    ];

    console.log('=== プレースホルダー診断 ===\n');

    for (const ph of placeholders) {
        if (content.includes(ph)) {
            console.log(`✅ ${ph} - そのまま存在`);
        } else {
            // 分割されている可能性をチェック
            const parts = ph.split('');
            let found = false;

            // { と } の間のテキストを探す
            const innerText = ph.slice(1, -1); // studentId, className, etc.
            if (content.includes(innerText)) {
                console.log(`⚠️  ${ph} - 分割されている可能性 (内部テキスト "${innerText}" は存在)`);
                found = true;
            }

            if (!found) {
                console.log(`❌ ${ph} - 見つからない`);
            }
        }
    }

    // XMLを整形して表示（デバッグ用）
    console.log('\n=== プレースホルダー周辺のXML ===\n');

    // {で始まる部分を探す
    const matches = content.match(/<w:t[^>]*>[^<]*\{[^<]*<\/w:t>/g);
    if (matches) {
        matches.forEach((m, i) => {
            console.log(`${i + 1}. ${m}`);
        });
    }
}

diagnoseTemplate();
