/**
 * 謌千ｸｾ險ｼ譏取嶌 PDF 逕滓・ (Puppeteer迚・ v2
 * 繧ｪ繝ｪ繧ｸ繝翫ΝPDF繧貞ｮ檎挑縺ｫ蜀咲樟
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * 謌千ｸｾ險ｼ譏取嶌HTML繧堤函謌・v2
 * 繧ｪ繝ｪ繧ｸ繝翫ΝPDF縺ｮ讒矩繧貞ｮ檎挑縺ｫ蜀咲樟
 */
function generateTranscriptHTML(data, issueDate) {
  const grades = data.grades || {};
  const subjects = ['譁・ｭ苓ｪ槫ｽ・, '譁・ｳ・, '隱ｭ隗｣', '閨ｴ隗｣', '菴懈枚', '莨夊ｩｱ', '邱丞粋'];
  const gradeLetters = ['A', 'B', 'C', 'D', 'F'];

  // 謌千ｸｾ陦後ｒ逕滓・・磯∈謚槭＆繧後◆隧穂ｾ｡縺ｫ荳ｸ繧定｡ｨ遉ｺ・・  const gradeRows = subjects.map(subject => {
    const selectedGrade = grades[subject] || '';
    const gradeCells = gradeLetters.map(letter => {
      const isSelected = selectedGrade === letter;
      if (isSelected) {
        return `<td><span class="grade-circle">${letter}</span></td>`;
      }
      return `<td>${letter}</td>`;
    }).join('');
    return `<tr><td class="subject">${subject}</td>${gradeCells}</tr>`;
  }).join('\n');

  // 蜊呈･ｭ迥ｶ諷・  const isExpected = data.graduationStatus === 'expected';
  const isGraduated = data.graduationStatus === 'graduated';

  // 蜷榊燕縺ｮ髟ｷ縺戊ｨ育ｮ励→繧ｹ繧ｱ繝ｼ繝ｪ繝ｳ繧ｰ繧ｯ繝ｩ繧ｹ豎ｺ螳・  const name = data.name || '';
  const nameLen = countLength(name);
  let nameClass = 'value'; // 繝・ヵ繧ｩ繝ｫ繝医け繝ｩ繧ｹ

  // Word繝・Φ繝励Ξ繝ｼ繝医・繝ｭ繧ｸ繝・け縺ｫ蜷医ｏ縺帙ｋ
  if (nameLen > 30) nameClass += ' scale-30'; // 4pt, 30% width逶ｸ蠖・  else if (nameLen > 25) nameClass += ' scale-40';
  else if (nameLen > 20) nameClass += ' scale-60';
  else if (nameLen > 15) nameClass += ' scale-80';
  else if (nameLen > 12) nameClass += ' scale-90';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>謌千ｸｾ險ｼ譏取嶌</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "・ｭ・ｳ 譏取悃", "MS Mincho", "貂ｸ譏取悃", "Yu Mincho", serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 18mm 22mm;
    }
    
    /* 繧ｿ繧､繝医Ν */
    h1 {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.35em;
      margin-bottom: 18px;
    }
    
    /* 繝・・繝悶Ν蜈ｱ騾・*/
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 3px 6px;
      text-align: center;
      vertical-align: middle;
      font-weight: normal;
      font-size: 9pt;
    }
    
    /* 蛟倶ｺｺ諠・ｱ繝・・繝悶Ν */
    .info-table {
      table-layout: fixed;
      margin-bottom: 14px;
      border: 2px solid #000;
    }
    
    .info-table td {
      height: 24px;
    }
    
    .info-table .label {
      width: 13%;
      background: #fff;
      text-align: center;
      font-size: 8pt;
    }
    
    .info-table .value {
      width: 37%;
      text-align: center;
      white-space: nowrap; /* 謾ｹ陦檎ｦ∵ｭ｢ */
      overflow: hidden; /* 縺ｯ縺ｿ蜃ｺ縺鈴亟豁｢ (荳・′荳) */
    }

    /* Scaling Classes (Transform繧貞茜逕ｨ縺励※蟷・ｸｮ蟆上ｒ繧ｷ繝溘Η繝ｬ繝ｼ繝・ */
    .scale-wrapper {
        display: inline-block;
        transform-origin: center;
        width: 100%;
    }
    
    .scale-90 .scale-wrapper { transform: scaleX(0.9); }
    .scale-80 .scale-wrapper { transform: scaleX(0.8); }
    .scale-60 .scale-wrapper { transform: scaleX(0.6); }
    .scale-40 .scale-wrapper { transform: scaleX(0.4); font-size: 8pt; } /* 繧ｵ繧､繧ｺ繧ょｰ代＠荳九￡繧・*/
    .scale-30 .scale-wrapper { transform: scaleX(0.3); font-size: 6pt; } /* 縺九↑繧雁ｰ上＆縺・*/
    
    .info-table .full-value {
      text-align: left;
      padding-left: 12px;
    }
    
    /* 蜊呈･ｭ隕玖ｾｼ縺ｿ縺ｮ荳ｸ */
    .grad-circle {
      display: inline-block;
      border: 1px solid #000;
      border-radius: 50%;
      padding: 0 5px;
      margin: 0 2px;
    }
    
    /* 險ｼ譏取枚 */
    .cert-text {
      margin: 12px 0;
      font-size: 9pt;
    }
    
    /* 謌千ｸｾ繝・・繝悶Ν・育音險倅ｺ矩・性繧・・*/
    .grade-table {
      table-layout: fixed;
      border: 2px solid #000;
      margin-bottom: 0;
    }
    
    .grade-table th {
      font-weight: normal;
      height: 22px;
    }
    
    .grade-table .subject-header {
      width: 16%;
    }
    
    .grade-table .grade-header {
      width: 84%;
    }
    
    .grade-table .subject {
      width: 16%;
      text-align: center;
    }
    
    .grade-table td {
      width: 16.8%;
      height: 22px;
    }
    
    .grade-table td:first-child {
      width: 16%;
    }
    
    /* 謌千ｸｾ縺ｮ荳ｸ */
    .grade-circle {
      display: inline-block;
      border: 1px solid #000;
      border-radius: 50%;
      width: 20px;
      height: 18px;
      line-height: 16px;
      text-align: center;
    }
    
    /* 迚ｹ險倅ｺ矩・*/
    .notes-label {
      text-align: left !important;
      padding-left: 8px !important;
      height: 22px;
    }
    
    .notes-content {
      height: 45px;
      text-align: left !important;
      padding: 5px 8px !important;
      vertical-align: top !important;
    }
    
    /* 隧穂ｾ｡蝓ｺ貅・*/
    .criteria {
      font-size: 8pt;
      line-height: 1.35;
      margin-top: 16px;
      margin-bottom: 25px;
    }
    
    .criteria .title {
      margin-bottom: 1px;
    }
    
    .criteria .item {
      margin-left: 0.5em;
    }
    
    /* 逋ｺ陦悟・ */
    .issuer {
      text-align: right;
      font-size: 9pt;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <h1>謌千ｸｾ險ｼ譏取嶌</h1>
  
  <table class="info-table">
    <tr>
      <td class="label">蟄ｦ邀咲分蜿ｷ・・/td>
      <td class="value">${data.studentId || ''}</td>
      <td class="label">繧ｯ繝ｩ繧ｹ・・/td>
      <td class="value">${data.className || ''}</td>
    </tr>
    <tr>
      <td class="label">蝗ｽ縲邀搾ｼ・/td>
      <td class="value">${data.nationality || ''}</td>
      <td class="label">豌上蜷搾ｼ・/td>
      <td class="${nameClass}">
        <span class="scale-wrapper">${data.name || ''}</span>
      </td>
    </tr>
    <tr>
      <td class="label">逕溷ｹｴ譛域律・・/td>
      <td class="value">${data.birthDate || ''}</td>
      <td class="label">諤ｧ縲蛻･・・/td>
      <td class="value">${data.gender || ''}</td>
    </tr>
    <tr>
      <td class="label">蜈･蟄ｦ蟷ｴ譛域律・・/td>
      <td class="full-value" colspan="3">${data.enrollmentDate || ''}</td>
    </tr>
    <tr>
      <td class="label">蜊呈･ｭ蟷ｴ譛域律・・/td>
      <td class="full-value" colspan="3">
        ${data.graduationDate || ''} ・医 ${isGraduated ? '<span class="grad-circle">蜊呈･ｭ</span>' : '蜊呈･ｭ'} 繝ｻ ${isExpected ? '<span class="grad-circle">蜊呈･ｭ隕玖ｾｼ縺ｿ</span>' : '蜊呈･ｭ隕玖ｾｼ縺ｿ'}縲 ・・      </td>
    </tr>
  </table>
  
  <p class="cert-text">荳願ｨ倥・閠・・謌千ｸｾ縺ｯ荳玖ｨ倥・騾壹ｊ縺ｧ縺ゅｋ縺薙→繧定ｨｼ譏手・縺励∪縺吶・/p>
  
  <table class="grade-table">
    <thead>
      <tr>
        <th class="subject-header">遘醍岼</th>
        <th class="grade-header" colspan="5">隧穂ｾ｡</th>
      </tr>
    </thead>
    <tbody>
      ${gradeRows}
      <tr>
        <td class="notes-label" colspan="6">迚ｹ險倅ｺ矩・/td>
      </tr>
      <tr>
        <td class="notes-content" colspan="6">${data.specialNotes || ''}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="criteria">
    <div class="title">・願ｩ穂ｾ｡蝓ｺ貅悶・｡・｢・｣・､・ｦ縺ｮ5谿ｵ髫・/div>
    <div class="item">A縲80轤ｹ莉･荳・/div>
    <div class="item">B縲79轤ｹ・・0轤ｹ</div>
    <div class="item">C縲69轤ｹ・・0轤ｹ</div>
    <div class="item">D縲59轤ｹ・・0轤ｹ</div>
  </div>
  
  <div class="issuer">
    <div>逾樊虻螟冶ｪ樊蕗閧ｲ蟄ｦ髯｢</div>
    <div>${issueDate || ''}</div>
  </div>
</body>
</html>`;
}

// 邁｡譏捺枚蟄玲焚繧ｫ繧ｦ繝ｳ繝・(蜊願ｧ・.9)
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

/**
 * Puppeteer縺ｧHTML繧単DF縺ｫ螟画鋤
 * @param {string} html
 * @param {string|null} outputPath - Path to save PDF (optional)
 * @returns {Promise<Buffer>} PDF Buffer
 */
async function htmlToPdf(html, outputPath = null) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    };

    if (outputPath) {
      options.path = outputPath;
    }

    const buffer = await page.pdf(options);

    if (outputPath) {
      console.log('PDF逕滓・螳御ｺ・', outputPath);
    }

    return buffer;
  } finally {
    await browser.close();
  }
}

/**
 * 謌千ｸｾ險ｼ譏取嶌PDF繧堤函謌・ * @returns {Promise<string|Buffer>} Output path or Buffer
 */
async function generateTranscriptPDF(data, issueDate, outputPath = null) {
  const html = generateTranscriptHTML(data, issueDate);
  return await htmlToPdf(html, outputPath);
}

module.exports = {
  generateTranscriptHTML,
  htmlToPdf,
  generateTranscriptPDF
};
