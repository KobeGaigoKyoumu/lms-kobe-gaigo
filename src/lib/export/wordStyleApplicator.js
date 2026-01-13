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

module.exports = { applyNameScaling };
