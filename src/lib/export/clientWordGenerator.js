import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

// Template path in public folder
const TEMPLATE_URL = '/templates/成績証明書_テンプレート_fixed_safe.docx';

/**
 * Load Template ArrayBuffer (Cache this if needed)
 */
export async function loadCertificateTemplate() {
    const response = await fetch(TEMPLATE_URL);
    if (!response.ok) throw new Error(`Template load failed: ${response.statusText}`);
    return await response.arrayBuffer();
}

/**
 * Generate Word Certificate Blob
 * @param {ArrayBuffer} templateBuffer - Content of the docx template
 * @param {Object} data - Student Data
 * @param {string} issueDate - Issue Date string
 * @returns {Blob} Generated DOCX Blob
 */
export function generateClientCertificateBlob(templateBuffer, data, issueDate) {
    try {
        // 1. Init PizZip with COPY of buffer (PizZip mutates)
        const zip = new PizZip(templateBuffer.slice(0));

        // 2. Init Docxtemplater
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // 3. Prepare Data
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

        if (data.grades) {
            Object.keys(data.grades).forEach(key => {
                templateData[`grade_${key}`] = data.grades[key];
            });
        }

        // 4. Render
        doc.render(templateData);

        // 5. Apply Name Scaling (Modifies Zip)
        applyNameScalingClient(doc.getZip(), templateData.name);

        // 6. Generate Blob
        return doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

    } catch (error) {
        console.error('Generation Error:', error);
        throw error;
    }
}

// Deprecated: One-shot function (kept for compatibility or simple use)
/**
 * Generate Word Certificate (Client-Side)
 * @param {Object} data - Student Data
 * @param {string} issueDate - Issue Date string
 * @returns {Promise<void>} Triggers download
 */
export async function generateClientCertificateDocx(data, issueDate) {
    try {
        const buf = await loadCertificateTemplate();
        const blob = generateClientCertificateBlob(buf, data, issueDate);
        return blob;
    } catch (error) {
        console.error('Client-side generation error:', error);
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors.map(function (error) {
                return error.properties.explanation;
            }).join("\n");
            console.error('Template Errors:', errorMessages);
        }
        alert('証明書の生成に失敗しました: ' + error.message);
        throw error;
    }
}

/**
 * Client-side Name Scaling Logic
 * Modifies the PizZip instance directly by editing document.xml
 */
function applyNameScalingClient(zip, nameValue) {
    if (!nameValue) return;

    // Load document.xml
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) return;

    let xml = docXmlFile.asText();

    // Logic from wordStyleApplicator.js tailored for client

    // Prevent line breaks by replacing space with NBSP
    const nameValueNbsp = nameValue.replace(/ /g, '\u00A0');

    // Length count
    const len = countLength(nameValue);

    let newSize = 21; // 10.5pt
    let newScale = 100;

    // Strict Stepwise Logic
    if (len > 30) {
        newSize = 8;   // 4pt
        newScale = 30;
    } else if (len > 25) {
        newSize = 10;  // 5pt
        newScale = 40;
    } else if (len > 20) {
        newSize = 12;  // 6pt
        newScale = 60;
    } else if (len > 15) {
        newSize = 14;  // 7pt
        newScale = 80;
    } else if (len > 12) {
        newSize = 16;  // 8pt
        newScale = 90;
    } else {
        return; // No change needed
    }

    console.log(`[Client] Name Scaling: Len=${len} -> Size=${newSize}, Scale=${newScale}%`);

    const escapedName = escapeXml(nameValue);

    // Replace logic
    const regex = new RegExp(`(<w:r(?: [^>]*)?>)(.*?<w:t>${escapeRegex(escapedName)}<\\/w:t>.*?)(<\\/w:r>)`, 'g');

    xml = xml.replace(regex, (match, openTag, content, closeTag) => {
        let newContent = content;

        // Replace text with NBSP version
        const escapedNameNbsp = escapeXml(nameValueNbsp);
        if (newContent.indexOf(escapedName) !== -1) {
            newContent = newContent.replace(escapedName, escapedNameNbsp);
        }

        const szTags = [`<w:sz w:val="${newSize}"/>`, `<w:szCs w:val="${newSize}"/>`];
        const wTag = `<w:w w:val="${newScale}"/>`;

        // Create or Update rPr
        if (!newContent.includes('<w:rPr>')) {
            newContent = `<w:rPr></w:rPr>` + newContent;
        }

        newContent = newContent.replace(/(<w:rPr>)(.*?)(<\/w:rPr>)/, (m, start, body, end) => {
            let newBody = body;

            // Size
            if (newBody.includes('<w:sz ')) newBody = newBody.replace(/<w:sz w:val="[^"]*"\/>/g, szTags[0]);
            else newBody += szTags[0];

            if (newBody.includes('<w:szCs ')) newBody = newBody.replace(/<w:szCs w:val="[^"]*"\/>/g, szTags[1]);
            else newBody += szTags[1];

            // Scale
            if (newBody.includes('<w:w ')) newBody = newBody.replace(/<w:w w:val="[^"]*"\/>/g, wTag);
            else newBody += wTag;

            return `${start}${newBody}${end}`;
        });

        return `${openTag}${newContent}${closeTag}`;
    });

    // Write back to zip
    zip.file('word/document.xml', xml);
}

// Helpers
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
