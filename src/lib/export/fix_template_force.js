const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート.docx');
const FIXED_TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート_fixed.docx');

// 設定値 (1pt = 20twips, マイナスは狭く)
const STYLES = {
    'studentId': { scale: 90, spacing: -2 },
    'className': { scale: 95, spacing: -5 },
    'nationality': { scale: 100, spacing: -2 },
    'name': { scale: 85, spacing: -2 },
    'birthDate': { scale: 90, spacing: -2 },
    'enrollmentDate': { scale: 90, spacing: 0 },
    'graduationDate': { scale: 90, spacing: 0 },
    'gender': { scale: 100, spacing: 0 },
    'issueDate': { scale: 100, spacing: 0 }
};

function fixTemplate() {
    console.log('テンプレート修復開始...');
    const data = fs.readFileSync(TEMPLATE_PATH, 'binary');
    const zip = new PizZip(data);
    let xml = zip.file('word/document.xml').asText();

    // 各キーワードについて、XML内で「分割されているかもしれない箇所」を探して置換
    for (const [key, style] of Object.entries(STYLES)) {
        // 検索パターン: { ... key ... }
        // タグをまたぐことを許容するが、あまりに遠いと誤爆するので制限する
        // { で始まり、直後に任意のタグ、そしてキーワード、直後に任意のタグ、そして }

        // 単純なindexOfで見つかるか確認
        const placeholder = `{${key}}`;
        if (xml.includes(placeholder)) {
            console.log(`✅ ${placeholder} は正常です。スタイル適用のみ行います。`);
            // 正常な場合は単純置換でスタイル適用
            const newTag = createStyledRun(key, style);
            xml = xml.replace(
                new RegExp(`<w:r(?: [^>]*)?>.*?<w:t>${escapeRegex(placeholder)}<\/w:t>.*?<\/w:r>`, 'g'),
                newTag
            );
        } else {
            console.log(`⚠️ ${placeholder} は分割されています。修復を試みます。`);
            // キーワードの位置を探す
            let searchIdx = 0;
            while (true) {
                const keyIdx = xml.indexOf(key, searchIdx);
                if (keyIdx === -1) break;

                // キーワードの前後にある { と } を探す
                // { はキーワードより前にあるはず
                const openBraceIdx = xml.lastIndexOf('{', keyIdx);
                const closeBraceIdx = xml.indexOf('}', keyIdx);

                if (openBraceIdx !== -1 && closeBraceIdx !== -1) {
                    // これらが同じw:p内にあるかチェックすべきだが、簡易的に距離で判断
                    if (closeBraceIdx - openBraceIdx < 500) {
                        // 見つかった！
                        // この範囲を含む最小の w:r ... w:r を特定したいが、
                        // 複数の w:r にまたがっている場合、それら全てを消し去って、1つの w:r に置き換える

                        // openBraceIdx を含む <w:r> の開始位置を探す
                        const rStart = xml.lastIndexOf('<w:r', openBraceIdx);

                        // closeBraceIdx を含む </w:r> の終了位置を探す
                        const rEndTag = xml.indexOf('</w:r>', closeBraceIdx);
                        const rEnd = rEndTag + 6; // length of </w:r>

                        if (rStart !== -1 && rEndTag !== -1) {
                            const targetStr = xml.substring(rStart, rEnd);
                            // 本当にターゲットか確認 (キーワードを含んでいるか)
                            if (targetStr.includes(key)) {
                                const newContent = createStyledRun(key, style);
                                xml = xml.substring(0, rStart) + newContent + xml.substring(rEnd);
                                console.log(`  修復完了: ${key} (index: ${rStart})`);

                                // XMLが変わったので検索位置を調整... 面倒なのでループをリセットしたほうがいいが
                                // 今回は置換後の文字列内にはキーワードが含まれない形(プレースホルダー)にするので、
                                // 次の検索は飛ばされるはず... 
                                // いや、createStyledRunで作る内容は {key} を含むので無限ループのリスクあり
                                // だだし createStyledRun は <w:t>{key}</w:t> を返す。
                                // indexOf(key) はヒットするので、無限ループ回避のために searchIdx を更新する必要あり。
                                searchIdx = rStart + newContent.length;
                                continue;
                            }
                        }
                    }
                }
                searchIdx = keyIdx + 1;
            }
        }
    }

    zip.file('word/document.xml', xml);
    const buffer = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(FIXED_TEMPLATE_PATH, buffer);
    console.log(`修復されたテンプレートを保存しました: ${FIXED_TEMPLATE_PATH}`);
}

function createStyledRun(key, style) {
    // スタイル付きの w:r XMLを生成
    return `<w:r><w:rPr><w:rFonts w:hint="eastAsia"/><w:w w:val="${style.scale}"/><w:spacing w:val="${style.spacing}"/></w:rPr><w:t>{${key}}</w:t></w:r>`;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

fixTemplate();
