const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_出力テスト.docx');

function diagnose() {
    const content = fs.readFileSync(OUTPUT_PATH, 'binary');
    const zip = new PizZip(content);
    const xml = zip.file('word/document.xml').asText();

    console.log('=== Output XML Diagnosis ===');
    console.log('File size:', content.length);
    console.log('XML length:', xml.length);

    const searchValues = ['2404999', 'TEST STUDENT', '2-11 クラス', '{studentId}', '{name}'];

    searchValues.forEach(val => {
        const index = xml.indexOf(val);
        if (index !== -1) {
            console.log(`✅ Found "${val}" at index ${index}`);
            // 周辺のXMLを表示
            const start = Math.max(0, index - 100);
            const end = Math.min(xml.length, index + 100 + val.length);
            console.log(`Context:\n${xml.substring(start, end)}\n`);
        } else {
            console.log(`❌ Not found "${val}"`);

            // 分割されているかチェック
            // 例えば "2" "4" "0"...
            if (val === '2404999') {
                const parts = val.split('');
                let allFound = true;
                parts.forEach(p => {
                    if (xml.indexOf(p) === -1) allFound = false;
                });
                if (allFound) console.log('   (Individual characters found anywhere in doc)');
            }
        }
    });

    // XMLの構造を少し見る
    console.log('\n--- XML Start ---');
    console.log(xml.substring(0, 500));
}

diagnose();
