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

    const isGraduated = graduationStatus === 'graduated';
    console.log(`[GradCircle] Status: ${graduationStatus}, isGraduated: ${isGraduated}`);

    const zip = new PizZip(docxBuffer);
    let xml = zip.file('word/document.xml').asText();

    // VML名前空間を追加
    if (!xml.includes('xmlns:v="urn:schemas-microsoft-com:vml"')) {
        xml = xml.replace(/<w:document/, '<w:document xmlns:v="urn:schemas-microsoft-com:vml"');
        console.log('[GradCircle] Injected VML namespace.');
    }

    // 全ての<w:r>...</w:r>を抽出して処理
    const runRegex = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
    let runs = xml.match(runRegex);

    if (!runs) {
        console.warn('[GradCircle] No runs found.');
        return docxBuffer;
    }

    let matchCount = 0;
    let modifiedXml = xml;

    for (const run of runs) {
        // このRunのテキスト内容を取得
        const textMatches = run.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (!textMatches) continue;

        const fullText = textMatches.map(t => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '')).join('');

        let shouldCircle = false;
        let width = '45pt';

        if (isGraduated) {
            // 「卒業」を含むが「見込み」「年月日」を含まない
            if (fullText.includes('卒業') && !fullText.includes('見込み') && !fullText.includes('年月日')) {
                shouldCircle = true;
                width = '48pt';
            }
        } else {
            // 「卒業見込み」を含む
            if (fullText.includes('卒業見込み')) {
                shouldCircle = true;
                width = '95pt';
            }
        }

        if (shouldCircle && matchCount === 0) { // 最初の一致のみ処理
            matchCount++;
            console.log(`[GradCircle] Found: "${fullText.trim()}"`);

            // 座標微調整と正円化
            let circleWidth, circleHeight, marginLeft;

            if (isGraduated) {
                circleWidth = '35pt';
                circleHeight = '25pt';
                marginLeft = '108pt';
            } else {
                circleWidth = '70pt';
                circleHeight = '25pt';
                marginLeft = '210pt';
            }

            const vmlXml = `<w:r><w:pict><v:oval style="position:absolute;margin-left:${marginLeft};margin-top:-2pt;width:${circleWidth};height:${circleHeight};z-index:251658240" filled="f" strokeweight="0.75pt" strokecolor="black"/></w:pict></w:r>`;
            modifiedXml = modifiedXml.replace(run, vmlXml + run);
        }
    }

    if (matchCount === 0) {
        console.warn(`[GradCircle] No match found for: ${graduationStatus}`);
    } else {
        console.log(`[GradCircle] Inserted ${matchCount} oval(s).`);
    }

    zip.file('word/document.xml', modifiedXml);
    return zip.generate({ type: 'nodebuffer' });
}

module.exports = { applyNameScaling, applyGraduationCircle };
