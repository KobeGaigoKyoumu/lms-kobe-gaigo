const PizZip = require('pizzip');

/**
 * 名前が長い場合にフォントサイズと倍率を「段階的に」縮小する後処理
 */
function applyNameScaling(docxBuffer, nameValue) {
    if (!nameValue) return docxBuffer;

    // 改行を防ぐために、名前の中の半角スペースをNon-breaking space (\u00A0) に置換
    const nameValueNbsp = nameValue.replace(/ /g, '\u00A0');

    // 文字数計算 (半角は0.9文字換算)
    const len = countLength(nameValue);

    // デフォルト
    let newSize = 21; // 10.5pt
    let newScale = 100; // 100%

    // 段階的縮小ロジック (さらに厳しく - 極端に)
    if (len > 30) {
        newSize = 8;   // 4pt
        newScale = 30; // 30% (極細)
    } else if (len > 25) {
        newSize = 10;  // 5pt
        newScale = 40; // 40%
    } else if (len > 20) {
        newSize = 12;  // 6pt
        newScale = 60; // 60%
    } else if (len > 15) {
        newSize = 14;  // 7pt
        newScale = 80; // 80%
    } else if (len > 12) {
        newSize = 16;  // 8pt
        newScale = 90; // 90%
    } else {
        // 12文字以下はデフォルトのまま
        return docxBuffer;
    }

    console.log(`Name length ${len}. Applying Extreme Stepwise Logic -> Size: ${newSize} (half-pt), Scale: ${newScale}%`);

    const zip = new PizZip(docxBuffer);
    let xml = zip.file('word/document.xml').asText();

    const escapedName = escapeXml(nameValue);

    // 正規表現で「元の名前」を含むRunを探す
    const regex = new RegExp(`(<w:r(?: [^>]*)?>)(.*?<w:t>${escapeRegex(escapedName)}<\\/w:t>.*?)(<\\/w:r>)`, 'g');

    xml = xml.replace(regex, (match, openTag, content, closeTag) => {
        let newContent = content;

        // 中身のテキストをNBSP版に置換
        const escapedNameNbsp = escapeXml(nameValueNbsp);
        if (newContent.indexOf(escapedName) !== -1) {
            console.log('    Found name in XML, replacing spaces with NBSP.');
            newContent = newContent.replace(escapedName, escapedNameNbsp);
        } else {
            console.warn('    WARNING: Exact name match not found for NBSP replacement.');
        }

        // w:sz (サイズ)
        const szTags = [`<w:sz w:val="${newSize}"/>`, `<w:szCs w:val="${newSize}"/>`];

        // w:w (倍率)
        const wTag = `<w:w w:val="${newScale}"/>`;

        // rPrがない場合は作る
        if (!newContent.includes('<w:rPr>')) {
            newContent = `<w:rPr></w:rPr>` + newContent;
        }

        // rPrブロックを特定して、その中身を操作する
        newContent = newContent.replace(/(<w:rPr>)(.*?)(<\/w:rPr>)/, (m, start, body, end) => {
            let newBody = body;

            // w:sz 置換 or 追加
            if (newBody.includes('<w:sz ')) newBody = newBody.replace(/<w:sz w:val="[^"]*"\/>/g, szTags[0]);
            else newBody += szTags[0];

            if (newBody.includes('<w:szCs ')) newBody = newBody.replace(/<w:szCs w:val="[^"]*"\/>/g, szTags[1]);
            else newBody += szTags[1];

            // w:w 置換 or 追加
            if (newBody.includes('<w:w ')) newBody = newBody.replace(/<w:w w:val="[^"]*"\/>/g, wTag);
            else newBody += wTag;

            return `${start}${newBody}${end}`;
        });

        return `${openTag}${newContent}${closeTag}`;
    });

    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer' });
}

function countLength(str) {
    let len = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if ((c >= 0x00 && c < 0x81) || (c === 0xf8f0) || (c >= 0xff61 && c < 0xffa0) || (c >= 0xf8f1 && c < 0xf8f4)) {
            len += 0.9;
        } else {
            len += 1;
        }
    }
    return len;
}

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 卒業状態に応じて「卒業」または「卒業見込み」に楕円の枠線を追加
 * @param {Buffer} docxBuffer - Wordファイルバッファ
 * @param {string} graduationStatus - 'graduated' or 'expected'
 * @returns {Buffer} 処理後のバッファ
 */
/**
 * 卒業状態に応じて「卒業」または「卒業見込み」に楕円の図形(VML)を追加
 * @param {Buffer} docxBuffer - Wordファイルバッファ
 * @param {string} graduationStatus - 'graduated' or 'expected'
 * @returns {Buffer} 処理後のバッファ
 */
function applyGraduationCircle(docxBuffer, graduationStatus) {
    if (!graduationStatus) return docxBuffer;

    // 対象テキストを決定
    const targetText = graduationStatus === 'graduated' ? '卒業' : '卒業見込み';
    console.log(`[GradCircle] Applying VML circle to: ${targetText}`);

    const zip = new PizZip(docxBuffer);
    let xml = zip.file('word/document.xml').asText();

    const escapedTarget = escapeXml(targetText);

    // VMLを使用するための名前空間宣言を確認・追加 (通常はデフォルトで入っているが念のためチェックは難しいので、単純にタグを挿入する)
    // w:pict タグ内であればWordはVMLを解釈する

    // 正規表現でRunを探す
    // <w:t>target</w:t> を含む Run (<w:r>) を特定
    const regex = new RegExp(`(<w:r(?:\\s[^>]*)?>)([\\s\\S]*?<w:t[^>]*>${escapeRegex(escapedTarget)}<\\/w:t>[\\s\\S]*?)(<\\/w:r>)`, 'g');

    let matchCount = 0;
    xml = xml.replace(regex, (match, openTag, content, closeTag) => {
        matchCount++;

        if (content.includes('<v:oval')) {
            console.log(`    [GradCircle] Already has oval, skipping.`);
            return match;
        }

        // 図形サイズの調整
        // フォントサイズが概ね 10.5pt (約14px) と仮定
        // "卒業" (2文字) -> 幅 30pt くらい
        // "卒業見込み" (5文字) -> 幅 75pt くらい
        // 高さ -> 25pt くらい
        // 位置調整: margin-left で微調整

        const isLong = targetText.length > 3;
        const width = isLong ? "80pt" : "35pt";
        const height = "25pt";
        const marginLeft = isLong ? "-5pt" : "-5pt"; // 文字の開始位置より少し左から
        const marginTop = "-5pt"; // 文字より少し上から

        // VML Oval Tag
        // z-index: -1 で文字の後ろ... にしたいが、WordのVMLは前面に来がち。
        // filled="f" (塗りつぶしなし) なので文字は見えます。
        // strokeColor="black"

        const vmlXml = `
            <w:r>
                <w:pict>
                    <v:oval style="position:absolute;margin-left:${marginLeft};margin-top:${marginTop};width:${width};height:${height};z-index:1" filled="f" strokeweight="1pt" strokecolor="black"/>
                </w:pict>
            </w:r>
        `;

        // Runの直前に図形Runを挿入
        return `${vmlXml}${openTag}${content}${closeTag}`;
    });

    if (matchCount === 0) {
        console.warn(`[GradCircle] Target text "${targetText}" not found in document.`);
    }

    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'nodebuffer' });
}

module.exports = { applyNameScaling, applyGraduationCircle };
