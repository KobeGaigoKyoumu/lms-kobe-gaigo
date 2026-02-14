/**
 * PDF逕滓・繝・せ繝医せ繧ｯ繝ｪ繝励ヨ v3
 * 譛邨りｪｿ謨ｴ迚・ */

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '謌千ｸｾ險ｼ譏取嶌_繝・Φ繝励Ξ繝ｼ繝・pdf');
const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'public', 'templates', '謌千ｸｾ險ｼ譏取嶌_繝・せ繝亥・蜉孥3.pdf');

/**
 * 蠎ｧ讓吶Ξ繧､繧｢繧ｦ繝亥ｮ夂ｾｩ v3
 * 譛邨りｪｿ謨ｴ迚・ */
const LAYOUT = {
    // 逋ｽ蝪励ｊ縺､縺ｶ縺鈴伜沺・磯ｫ倥＆繧貞｢怜刈縲〆蠎ｧ讓吶ｒ荳九￡繧具ｼ・    whiteouts: [
        // 蟄ｦ邀咲分蜿ｷ蛟､
        { x: 148, y: 698, width: 180, height: 24 },
        // 繧ｯ繝ｩ繧ｹ蛟､・亥ｹ・ｒ蠎・￡繧具ｼ・        { x: 418, y: 698, width: 160, height: 24 },
        // 蝗ｽ邀榊､
        { x: 148, y: 673, width: 180, height: 24 },
        // 豌丞錐蛟､
        { x: 418, y: 673, width: 160, height: 24 },
        // 逕溷ｹｴ譛域律蛟､
        { x: 148, y: 648, width: 180, height: 24 },
        // 諤ｧ蛻･蛟､
        { x: 418, y: 648, width: 160, height: 24 },
        // 蜈･蟄ｦ蟷ｴ譛域律蛟､
        { x: 148, y: 623, width: 360, height: 24 },
        // 蜊呈･ｭ蟷ｴ譛域律・亥穀讌ｭ隕玖ｾｼ縺ｿ驛ｨ蛻・・谿九☆・・        { x: 148, y: 598, width: 180, height: 24 },
        // 逋ｺ陦悟・諠・ｱ
        { x: 395, y: 56, width: 180, height: 46 },
    ],

    // 繝・く繧ｹ繝磯・鄂ｮ蠎ｧ讓呻ｼ・蠎ｧ讓吶ｒ3pt荳九￡繧具ｼ・    text: {
        studentId: { x: 155, y: 704 },
        className: { x: 425, y: 704 },
        nationality: { x: 155, y: 679 },
        name: { x: 425, y: 679 },
        birthDate: { x: 155, y: 654 },
        gender: { x: 425, y: 654 },
        enrollmentDate: { x: 155, y: 629 },
        graduationInfo: { x: 155, y: 604 },
        schoolName: { x: 405, y: 82 },
        issueDate: { x: 405, y: 64 },
    },

    // 謌千ｸｾ繝・・繝悶Ν Y蠎ｧ讓・    gradeRows: {
        '譁・ｭ苓ｪ槫ｽ・: 508,
        '譁・ｳ・: 483,
        '隱ｭ隗｣': 458,
        '閨ｴ隗｣': 433,
        '菴懈枚': 408,
        '莨夊ｩｱ': 383,
        '邱丞粋': 358,
    },

    // 隧穂ｾ｡蛻励・X荳ｭ蠢・ｺｧ讓呻ｼ亥ｷｦ縺ｫ8pt遘ｻ蜍包ｼ・    gradeColumns: {
        'A': 184,
        'B': 269,
        'C': 354,
        'D': 439,
        'F': 524,
    },
};

async function testPdfGeneration() {
    console.log('繝・Φ繝励Ξ繝ｼ繝・DF隱ｭ縺ｿ霎ｼ縺ｿ:', TEMPLATE_PATH);

    const templateBytes = fs.readFileSync(TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    console.log(`繝壹・繧ｸ繧ｵ繧､繧ｺ: ${width} x ${height}`);

    const white = rgb(1, 1, 1);
    const black = rgb(0, 0, 0);

    // 逋ｽ縺・洸蠖｢縺ｧ譌｢蟄倥ョ繝ｼ繧ｿ繧貞｡励ｊ縺､縺ｶ縺・    console.log('\n譌｢蟄倥ョ繝ｼ繧ｿ繧堤區縺ｧ蝪励ｊ縺､縺ｶ縺嶺ｸｭ...');
    for (const rect of LAYOUT.whiteouts) {
        page.drawRectangle({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            color: white,
        });
    }

    // 繝輔か繝ｳ繝・    const { StandardFonts } = require('pdf-lib');
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 繝・せ繝医ョ繝ｼ繧ｿ
    const testData = {
        studentId: '2404999',
        className: '2-11 Class',
        nationality: 'China',
        name: 'TEST STUDENT',
        birthDate: '2000 / 01 / 01',
        gender: 'Male',
        enrollmentDate: '2024 / 04 / 01',
        graduationInfo: '2026 / 03 / 31',
        schoolName: 'Kobe Gaigo',
        issueDate: '2026/01/13',
    };

    console.log('\n繝・せ繝医ョ繝ｼ繧ｿ繧呈緒逕ｻ荳ｭ...');
    for (const [key, pos] of Object.entries(LAYOUT.text)) {
        const text = testData[key];
        if (text) {
            page.drawText(text, {
                x: pos.x,
                y: pos.y,
                size: 10,
                font: font,
                color: black,
            });
        }
    }

    // 謌千ｸｾ縺ｫ荳ｸ繧呈緒逕ｻ
    console.log('\n謌千ｸｾ縺ｮ荳ｸ繧呈緒逕ｻ荳ｭ...');
    const testGrades = {
        '譁・ｭ苓ｪ槫ｽ・: 'A',
        '譁・ｳ・: 'B',
        '隱ｭ隗｣': 'C',
        '閨ｴ隗｣': 'B',
        '菴懈枚': 'A',
        '莨夊ｩｱ': 'B',
        '邱丞粋': 'B',
    };

    for (const [subject, grade] of Object.entries(testGrades)) {
        const rowY = LAYOUT.gradeRows[subject];
        const colX = LAYOUT.gradeColumns[grade];

        if (rowY && colX) {
            page.drawEllipse({
                x: colX,
                y: rowY,
                xScale: 13,
                yScale: 9,
                borderColor: black,
                borderWidth: 1.2,
            });
        }
    }

    // 菫晏ｭ・    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(OUTPUT_PATH, pdfBytes);

    console.log('\n=== 蜃ｺ蜉帛ｮ御ｺ・===');
    console.log('蜃ｺ蜉帙ヵ繧｡繧､繝ｫ:', OUTPUT_PATH);
}

testPdfGeneration().catch(console.error);
