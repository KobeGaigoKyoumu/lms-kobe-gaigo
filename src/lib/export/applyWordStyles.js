const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート.docx');

// 設定値
const STYLES = {
    'studentId': { scale: 90, spacing: -2 },       // {studentId}
    'className': { scale: 95, spacing: -5 },       // {className}
    'nationality': { scale: 100, spacing: -2 },    // {nationality}
    'name': { scale: 85, spacing: -2 },            // {name}
    'birthDate': { scale: 90, spacing: -2 },       // {birthDate}
    'gender': { scale: 100, spacing: 0 },          // {gender}
    'enrollmentDate': { scale: 90, spacing: 0 },   // {enrollmentDate}
    'graduationDate': { scale: 90, spacing: 0 },   // {graduationDate}
};

function applyStyles() {
    try {
        const data = fs.readFileSync(TEMPLATE_PATH, 'binary');
        const zip = new PizZip(data);

        let xml = zip.file('word/document.xml').asText();

        for (const [midKeyword, style] of Object.entries(STYLES)) {
            // 完全な {placeholder} ではなく、中身のキーワード (studentIdなど) を含む <w:t> を探す
            // これにより、{ と } が別タグに分割されていてもヒットする

            // 正規表現:
            // (<w:r(?: [^>]*)?>)   : <w:r>タグ開始 (グループ1)
            // (.*?)                : 中身 (グループ2)
            // (<w:t>.*?キーワード.*?<\/w:t>) : キーワードを含むtタグ (グループ3)
            const keywordRegex = new RegExp(`(<w:r(?: [^>]*)?>)(.*?)(<w:t>[^<]*${midKeyword}[^<]*<\\/w:t>)`, 'g');

            let matchCount = 0;
            xml = xml.replace(keywordRegex, (match, rTag, middle, tTag) => {
                matchCount++;
                let newMiddle = middle;

                // --- 1. w:w (倍率) ---
                const scaleTag = `<w:w w:val="${style.scale}"/>`;
                if (newMiddle.includes('<w:w ')) {
                    newMiddle = newMiddle.replace(/<w:w w:val="[^"]*"\/>/, scaleTag);
                } else {
                    if (newMiddle.includes('</w:rPr>')) {
                        newMiddle = newMiddle.replace('</w:rPr>', `${scaleTag}</w:rPr>`);
                    } else {
                        // rPrがない場合、先頭に追加
                        newMiddle = `<w:rPr>${scaleTag}</w:rPr>` + newMiddle;
                    }
                }

                // --- 2. w:spacing (文字間隔) ---
                const spacingTag = `<w:spacing w:val="${style.spacing}"/>`;
                if (newMiddle.includes('<w:spacing ')) {
                    newMiddle = newMiddle.replace(/<w:spacing w:val="[^"]*"\/>/, spacingTag);
                } else {
                    if (newMiddle.includes('</w:rPr>')) {
                        newMiddle = newMiddle.replace('</w:rPr>', `${spacingTag}</w:rPr>`);
                    } else {
                        if (newMiddle.startsWith('<w:rPr>')) {
                            newMiddle = newMiddle.replace('</w:rPr>', `${spacingTag}</w:rPr>`);
                        } else {
                            newMiddle = `<w:rPr>${spacingTag}</w:rPr>` + newMiddle;
                        }
                    }
                }

                return `${rTag}${newMiddle}${tTag}`;
            });

            if (matchCount > 0) {
                console.log(`✅ ${midKeyword}: スタイル適用完了 (x${matchCount})`);
            } else {
                console.warn(`⚠️ ${midKeyword} が見つかりませんでした。`);
            }
        }

        zip.file('word/document.xml', xml);

        const buffer = zip.generate({ type: 'nodebuffer' });
        fs.writeFileSync(TEMPLATE_PATH, buffer);
        console.log('テンプレートファイルを更新しました。');

    } catch (e) {
        console.error('エラー:', e);
    }
}

applyStyles();
