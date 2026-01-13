const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート.docx');
const FIXED_TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '成績証明書_テンプレート_fixed_safe.docx');

// 設定値 (1pt = 20twips)
const STYLES = {
    'studentId': { scale: 90, spacing: -2 },
    'className': { scale: 95, spacing: -5 },
    'nationality': { scale: 100, spacing: -2 },
    'name': { scale: 85, spacing: 2, noWrap: true }, // noWrap追加
    'birthDate': { scale: 85, spacing: -2 },
    'enrollmentDate': { scale: 85, spacing: 0 },
    'graduationDate': { scale: 85, spacing: 0 },
    'gender': { scale: 100, spacing: 0 },
    'issueDate': { scale: 100, spacing: 0 }
};

function fixTemplateSafe() {
    console.log('テンプレートの安全な修復を開始します...');
    const data = fs.readFileSync(TEMPLATE_PATH, 'binary');
    const zip = new PizZip(data);
    const xmlContent = zip.file('word/document.xml').asText();

    const doc = new DOMParser().parseFromString(xmlContent, 'application/xml');
    const wNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = doc.getElementsByTagNameNS(wNS, 'p');

    let totalFixed = 0;

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const textContent = p.textContent;

        for (const [key, style] of Object.entries(STYLES)) {
            if (textContent.includes(key)) {
                const runs = Array.from(p.getElementsByTagNameNS(wNS, 'r'));
                if (runs.length === 0) continue;

                let baseRPr = null;
                if (runs[0].getElementsByTagNameNS(wNS, 'rPr').length > 0) {
                    baseRPr = runs[0].getElementsByTagNameNS(wNS, 'rPr')[0].cloneNode(true);
                }

                let fullText = "";
                runs.forEach(r => {
                    const tTags = r.getElementsByTagNameNS(wNS, 't');
                    for (let j = 0; j < tTags.length; j++) fullText += tTags[j].textContent;
                });

                if (fullText.includes(`{${key}}`)) {
                    console.log(`  修復対象発見: {${key}}`);
                    runs.forEach(r => p.removeChild(r));

                    const parts = fullText.split(`{${key}}`);
                    if (parts.length >= 2) {
                        const prefix = parts[0];
                        const suffix = parts.slice(1).join(`{${key}}`);

                        if (prefix) appendRun(doc, p, prefix, baseRPr, null, wNS);
                        appendRun(doc, p, `{${key}}`, baseRPr, style, wNS);

                        if (style.noWrap) applyNoWrapToParent(doc, p, wNS);

                        if (suffix) appendRun(doc, p, suffix, baseRPr, null, wNS);
                        totalFixed++;
                    }
                }
            }
        }

        // 静的テキスト「（卒業・卒業見込み）」の修正
        if (textContent.includes('（卒業・卒業見込み）')) {
            console.log('  修復対象発見: （卒業・卒業見込み）');
            const runs = Array.from(p.getElementsByTagNameNS(wNS, 'r'));
            let baseRPr = null;
            if (runs.length > 0 && runs[0].getElementsByTagNameNS(wNS, 'rPr').length > 0) {
                baseRPr = runs[0].getElementsByTagNameNS(wNS, 'rPr')[0].cloneNode(true);
            }

            let fullText = "";
            runs.forEach(r => {
                const tTags = r.getElementsByTagNameNS(wNS, 't');
                for (let j = 0; j < tTags.length; j++) fullText += tTags[j].textContent;
            });

            if (fullText.includes('（卒業・卒業見込み）')) {
                runs.forEach(r => p.removeChild(r));
                const parts = fullText.split('（卒業・卒業見込み）');
                if (parts.length >= 2) {
                    const prefix = parts[0];
                    const suffix = parts.slice(1).join('（卒業・卒業見込み）');

                    if (prefix) appendRun(doc, p, prefix, baseRPr, null, wNS);

                    // 全角スペース(\u3000) + 半角スペース( ) 
                    // （[全][半]卒業[全][半]・[全][半]卒業見込み[全][半]）

                    appendRun(doc, p, '（\u3000 卒業\u3000 ', baseRPr, null, wNS);
                    appendRun(doc, p, '・', baseRPr, { scale: 100, spacing: 10 }, wNS); // 中点の文字間隔0.5pt
                    appendRun(doc, p, '\u3000 卒業見込み\u3000 ）', baseRPr, null, wNS);

                    if (suffix) appendRun(doc, p, suffix, baseRPr, null, wNS);
                    totalFixed++;
                }
            }
        }
    }

    console.log(`修復完了: ${totalFixed} 箇所`);
    const serializer = new XMLSerializer();
    const newXml = serializer.serializeToString(doc);
    zip.file('word/document.xml', newXml);
    const buffer = zip.generate({ type: 'nodebuffer' });
    fs.writeFileSync(FIXED_TEMPLATE_PATH, buffer);
    console.log(`安全に修復されたテンプレートを保存: ${FIXED_TEMPLATE_PATH}`);
}

function applyNoWrapToParent(doc, p, wNS) {
    let tc = p.parentNode;
    while (tc && (tc.nodeType !== 1 || (tc.localName !== 'tc' && tc.nodeName !== 'w:tc'))) {
        tc = tc.parentNode;
        if (!tc || tc.nodeType === 9) { tc = null; break; }
    }

    if (tc) {
        let tcPr = null;
        const tcPrList = tc.getElementsByTagNameNS(wNS, 'tcPr');
        if (tcPrList.length > 0) tcPr = tcPrList[0];
        else {
            tcPr = doc.createElementNS(wNS, 'w:tcPr');
            if (tc.firstChild) tc.insertBefore(tcPr, tc.firstChild);
            else tc.appendChild(tcPr);
        }

        removeNodeByName(tcPr, 'w:noWrap', wNS);
        const noWrap = doc.createElementNS(wNS, 'w:noWrap');
        noWrap.setAttribute('w:val', 'on');
        tcPr.appendChild(noWrap);
        console.log(`    改行禁止(noWrap)を親TCに適用しました`);
    } else {
        console.warn(`    警告: 親TCが見つかりませんでした`);
    }
}

function appendRun(doc, parentNode, text, baseRPr, customStyle, wNS) {
    const r = doc.createElementNS(wNS, 'w:r');
    const rPr = doc.createElementNS(wNS, 'w:rPr');
    if (baseRPr) {
        for (let i = 0; i < baseRPr.childNodes.length; i++) rPr.appendChild(baseRPr.childNodes[i].cloneNode(true));
    }
    if (customStyle) {
        removeNodeByName(rPr, 'w:w', wNS);
        removeNodeByName(rPr, 'w:spacing', wNS);
        const wScale = doc.createElementNS(wNS, 'w:w');
        wScale.setAttribute('w:val', customStyle.scale);
        rPr.appendChild(wScale);
        const wSpacing = doc.createElementNS(wNS, 'w:spacing');
        wSpacing.setAttribute('w:val', customStyle.spacing);
        rPr.appendChild(wSpacing);
    }
    r.appendChild(rPr);
    const t = doc.createElementNS(wNS, 'w:t');
    t.setAttribute('xml:space', 'preserve');
    t.textContent = text;
    r.appendChild(t);
    parentNode.appendChild(r);
}

function removeNodeByName(parent, tagName, ns) {
    const nodes = parent.getElementsByTagNameNS(ns, tagName.replace('w:', ''));
    for (let i = nodes.length - 1; i >= 0; i--) parent.removeChild(nodes[i]);
}

fixTemplateSafe();
