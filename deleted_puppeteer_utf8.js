/**
 * 謌千ｸｾ險ｼ譏取嶌 PDF 逕滓・ (Puppeteer迚・ v2
 * 繧ｪ繝ｪ繧ｸ繝翫ΝPDF繧貞ｮ檎挑縺ｫ蜀咲樟
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
// Standard 'https' module for downloading if needed
const https = require('https');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

// Supabase helper for storage (Lazy initialization)
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Supabase Admin: URL or Service Role Key missing');
      return null;
    }
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabaseAdmin;
}

// Helper to download font to temp directory
async function getFontPath() {
  const fontUrl = 'https://github.com/googlefonts/noto-cjk/raw/main/Serif/OTF/Japanese/NotoSerifCJKjp-Regular.otf';
  const tempPath = '/tmp/NotoSerifCJKjp-Regular.otf';

  // Check if file already exists
  if (fs.existsSync(tempPath)) {
    // Check if file size is reasonable (not empty)
    const stats = fs.statSync(tempPath);
    if (stats.size > 1000) {
      console.log('Using cached font from /tmp');
      return tempPath;
    }
  }

  console.log('Downloading font to /tmp...');
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tempPath);
    https.get(fontUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download font: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log('Font downloaded successfully');
          resolve(tempPath);
        });
      });
    }).on('error', (err) => {
      fs.unlink(tempPath, () => { }); // Delete imperfect file
      reject(err);
    });
  });
}

async function getBrowser() {
  if (isProduction) {
    // Vercel / Production environment
    const chromium = require('@sparticuz/chromium');
    const puppeteerCore = require('puppeteer-core');

    // Setup for Japanese fonts
    try {
      const fontPath = await getFontPath();
      await chromium.font(fontPath);
    } catch (e) {
      console.error('Font loading failed:', e);
    }

    return await puppeteerCore.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } else {
    // Local environment
    const puppeteer = require('puppeteer');
    return await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
}

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
      font-family: "Noto Serif CJK JP", "Noto Serif JP", "・ｭ・ｳ 譏取悃", "MS Mincho", "貂ｸ譏取悃", "Yu Mincho", serif;
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
 * 謌千ｸｾ險ｼ譏取嶌PDF繧堤函謌・ */
async function generateTranscriptPDF(data, issueDate, outputPath = null, browser = null) {
  const html = generateTranscriptHTML(data, issueDate);
  const cacheKey = `transcripts/${data.studentId}_${data.name}.pdf`;
  return await htmlToPdf(html, outputPath, cacheKey, browser);
}


/**
 * Puppeteer縺ｧHTML繧単DF縺ｫ螟画鋤 (Supabase Storage 繧ｭ繝｣繝・す繝･蟇ｾ蠢・
 * @param {string} html
 * @param {string|null} outputPath - Path to save PDF (optional)
 * @param {string|null} cacheKey - Storage path for caching (e.g. 'transcripts/STUDENT_ID.pdf')
 * @returns {Promise<Buffer>} PDF Buffer
 */
async function htmlToPdf(html, outputPath = null, cacheKey = null, browser = null) {
  // 1. Check Cache first
  if (cacheKey) {
    try {
      const admin = getSupabaseAdmin();
      if (!admin) throw new Error('Supabase Admin client not available');

      const { data, error } = await admin.storage
        .from('reports-pdf')
        .download(cacheKey);

      if (data && !error) {
        console.log('PDF Cache Hit:', cacheKey);
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (outputPath) fs.writeFileSync(outputPath, buffer);
        return buffer;
      }
    } catch (e) {
      console.warn('Cache check failed, generating new PDF:', e.message);
    }
  }

  // 2. Generate PDF using Puppeteer
  if (browser === 'CHECK_CACHE_ONLY') {
    return null;
  }

  const shouldCloseBrowser = !browser;
  if (!browser) {
    browser = await getBrowser();
  }

  try {
    const page = await browser.newPage();
    try {
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

      // 3. Store in Cache asynchronously (don't block the response)
      if (cacheKey) {
        const admin = getSupabaseAdmin();
        if (admin) {
          admin.storage
            .from('reports-pdf')
            .upload(cacheKey, buffer, {
              contentType: 'application/pdf',
              upsert: true
            })
            .then(({ error }) => {
              if (error) console.error('PDF Cache Upload Failed:', error.message);
              else console.log('PDF Cache Updated:', cacheKey);
            });
        }
      }

      if (outputPath) {
        console.log('PDF逕滓・螳御ｺ・', outputPath);
      }

      return buffer;
    } finally {
      if (page) await page.close();
    }
  } finally {
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
}


/**
 * 蜃ｺ蟶ｭ迥ｶ豕∝狗･ｨHTML繧堤函謌・ */
function generateAttendanceHTML(data) {
  const { student, history, currentStats } = data;
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); // 2026蟷ｴ1譛・5譌･

  // 繝・・繧ｿ縺ｮ貅門ｙ・域怦蛻･縺ｨ邏ｯ險医ｒ邨仙粋・・  const monthlyData = [...(history.monthlyData || [])];
  const cumulativeData = [...(history.cumulativeData || [])];

  // 繝槭・繧ｸ繝・・繧ｿ縺ｮ菴懈・・域怦蛻･繝・・繧ｿ繧貞渕貅悶↓縺励※邏ｯ險医ｒ邨仙粋・・  let combinedRows = monthlyData.map(m => {
    const c = cumulativeData.find(cum => cum.year === m.year && cum.month === m.month) || {};
    return {
      year: m.year,
      month: m.month,
      class_days: (m.attendance_days || 0) + (m.absence_days || 0),  // 謗域･ｭ譌･謨ｰ = 蜃ｺ蟶ｭ譌･謨ｰ + 谺蟶ｭ譌･謨ｰ
      attendance_days: m.attendance_days,
      absence_days: m.absence_days,
      late_slots: m.late_slots,  // 驕・綾繝ｻ譌ｩ騾
      monthly_rate: m.attendance_rate,  // 譛磯俣蜃ｺ蟶ｭ邇・      cumulative_rate: c.attendance_rate  // 邏ｯ險亥・蟶ｭ邇・    };
  });

  // 髯埼・た繝ｼ繝茨ｼ域眠縺励＞鬆・ｼ・  combinedRows.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

  // 譛譁ｰ繝・・繧ｿ縺ｮ蟷ｴ譛亥叙蠕暦ｼ医・繝・け繧ｹ陦ｨ遉ｺ逕ｨ・・  const latestData = combinedRows.length > 0 ? combinedRows[0] : { year: '----', month: '--', monthly_rate: 0 };
  const latestMonthlyRate = latestData.monthly_rate !== undefined ? latestData.monthly_rate : 0;
  const latestRatePercent = (latestMonthlyRate * 100).toFixed(1);

  // 隧穂ｾ｡繝懊ャ繧ｯ繧ｹ縺ｮ濶ｲ蛻､螳夲ｼ域怦髢灘・蟶ｭ邇・↓蝓ｺ縺･縺擾ｼ・  let rateClass = 'rate-normal';
  if (latestMonthlyRate <= 0.80) rateClass = 'rate-danger';
  else if (latestMonthlyRate <= 0.85) rateClass = 'rate-warning';
  else if (latestMonthlyRate <= 0.90) rateClass = 'rate-caution';
  else if (latestMonthlyRate <= 0.95) rateClass = 'rate-notice';

  // 陦・HTML逕滓・・郁レ譎ｯ濶ｲ縺ｪ縺励∵怦髢薙・縺ｿ譁・ｭ苓牡・・  const rowsHtml = combinedRows.map(row => {
    const mRate = row.monthly_rate;
    const cRate = row.cumulative_rate;

    // 譛磯俣蜃ｺ蟶ｭ邇・・譁・ｭ苓牡・・5%莉･荳翫・鮟抵ｼ・    let mRateClass = '';
    if (mRate <= 0.80) mRateClass = 'text-danger';
    else if (mRate <= 0.85) mRateClass = 'text-warning';
    else if (mRate <= 0.90) mRateClass = 'text-caution';
    else if (mRate <= 0.95) mRateClass = 'text-notice';

    // 邏ｯ險亥・蟶ｭ邇・・譁・ｭ苓牡・・5%莉･荳翫・鮟抵ｼ・    let cRateClass = '';
    if (cRate <= 0.80) cRateClass = 'text-danger';
    else if (cRate <= 0.85) cRateClass = 'text-warning';
    else if (cRate <= 0.90) cRateClass = 'text-caution';
    else if (cRate <= 0.95) cRateClass = 'text-notice';

    return `
      <tr>
        <td>${row.year}蟷ｴ${row.month}譛・/td>
        <td>${row.class_days}</td>
        <td>${row.attendance_days}</td>
        <td>${row.absence_days}</td>
        <td>${row.late_slots !== undefined ? row.late_slots : '-'}</td>
        <td class="${cRateClass}">${cRate !== undefined ? (cRate * 100).toFixed(1) + '%' : '-'}</td>
        <td class="${mRateClass}">${mRate !== undefined ? (mRate * 100).toFixed(1) + '%' : '-'}</td>
      </tr>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>蜃ｺ蟶ｭ陦ｨ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Sans JP", "Noto Sans CJK JP", "・ｭ・ｳ 繧ｴ繧ｷ繝・け", sans-serif;
      font-size: 10pt;
      color: #333;
      padding: 15mm 20mm;
    }
    
    .title-container {
      text-align: center;
      margin-bottom: 2mm;
      padding-top: 0;
    }
    h1 {
      display: inline-block;
      font-size: 26pt;
      color: #333;
      font-weight: bold;
      margin: 0;
      letter-spacing: 2px;
    }

    .header-layout {
      position: relative;
      height: 30mm; /* Reduced from 35mm */
      margin-bottom: 3mm; /* Reduced from 5mm */
      border-bottom: 2px solid #333;
    }

    .student-info {
      position: absolute;
      bottom: 1mm; /* Reduced from 2mm */
      left: 0;
      width: 60%;
    }
    .student-info div {
      margin-bottom: 3px; /* Reduced from 5px */
      font-size: 11pt;
    }

    .issue-date-top {
      text-align: right;
      font-size: 10pt;
      margin-bottom: 2mm;
    }

    .student-id { font-weight: bold; font-size: 11pt; margin-bottom: 2px !important; }
    .student-name { font-weight: bold; font-size: 14pt; margin-bottom: 3px !important; } /* Reduced form 16pt */
    .student-class { font-weight: bold; font-size: 11pt; }

    .summary-box {
      position: absolute;
      top: 2mm; /* Reduced from 5mm */
      right: 0;
      width: 55mm; /* Reduced from 60mm */
      height: 22mm; /* Reduced from 25mm */
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    .summary-header {
      height: 7mm; /* Reduced from 8mm */
      background-color: #f5f5f5;
      border-bottom: 1px solid #333;
      font-size: 8pt;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1.1;
      color: #555;
    }
    .summary-content {
      height: 15mm; /* Reduced from 17mm */
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .summary-value {
      font-size: 20pt; /* Reduced from 22pt */
      font-weight: bold;
    }

    /* Colors */
    .rate-danger { color: #d32f2f; }
    .rate-warning { color: #f57c00; }
    .rate-caution { color: #fbc02d; }
    .rate-notice { color: #0288d1; }
    .rate-normal { color: #2e7d32; }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3mm; /* Reduced from 5mm */
      font-size: 9pt; /* Reduced from 9.5pt */
    }
    
    .data-table th {
      background-color: #f0f0f0;
      border: 1px solid #999;
      padding: 6px 4px; /* Reduced from 8px */
      font-weight: normal;
      color: #555;
    }
    
    .data-table td {
      border: 1px solid #ddd;
      border-left: 1px solid #999;
      border-right: 1px solid #999;
      border-bottom: 1px solid #999;
      padding: 4px 4px; /* Reduced from 6px */
      text-align: center;
      height: 6mm; /* Reduced from 8mm */
    }

    .col-cumulative {
      font-weight: bold;
    }

    /* Row Backgrounds - standard colors */
    .bg-danger { background-color: #ffcdd2 !important; }
    .bg-warning { background-color: #ffe0b2 !important; }
    .bg-caution { background-color: #fff9c4 !important; }
    .bg-notice { background-color: #b3e5fc !important; }

    /* Text Colors for rates (all bold) */
    .text-danger { color: #c62828 !important; font-weight: bold; }
    .text-warning { color: #e65100 !important; font-weight: bold; }
    .text-caution { color: #f9a825 !important; font-weight: bold; }
    .text-notice { color: #0277bd !important; font-weight: bold; }
    .text-normal { color: #2e7d32 !important; font-weight: bold; }

    /* Legend */
    .legend {
      margin-top: 3mm; /* Reduced from 5mm */
      display: flex;
      justify-content: flex-end;
      font-size: 8pt;
      gap: 10px;
    }
    .legend-item {
      display: flex;
      align-items: center;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      margin-right: 4px;
      border: 1px solid #ccc;
    }

    /* Footer Notes */
    .footer-notes {
      margin-top: 4mm; /* Reduced from 5mm */
      font-size: 7.5pt; /* Reduced from 8pt */
      line-height: 1.3;
      color: #333;
    }

  </style>
</head>
<body>

  <div class="issue-date-top">逋ｺ陦梧律・・{today}</div>

  <div class="title-container">
    <h1>逾樊虻螟冶ｪ樊蕗閧ｲ蟄ｦ髯｢</h1>
  </div>

  <div class="header-layout">
    <div class="student-info">
      <div class="student-id">蟄ｦ邀咲分蜿ｷ・・{student.id}</div>
      <div class="student-name">蜷榊燕・・{student.name}</div>
      <div class="student-class">繧ｯ繝ｩ繧ｹ・・{student.className || ''}</div>
    </div>

    <div class="summary-box">
      <div class="summary-header">
        ${latestData.year}蟷ｴ${latestData.month}譛亥・蟶ｭ邇・      </div>
      <div class="summary-content">
        <span class="summary-value ${rateClass}">${latestRatePercent}%</span>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th width="14%">蟷ｴ譛・/th>
        <th width="10%">謗域･ｭ譌･謨ｰ</th>
        <th width="12%">蜃ｺ蟶ｭ譌･謨ｰ</th>
        <th width="12%">谺蟶ｭ譌･謨ｰ</th>
        <th width="12%">驕・綾繝ｻ譌ｩ騾</th>
        <th width="18%">邏ｯ險亥・蟶ｭ邇・/th>
        <th width="22%">譛磯俣蜃ｺ蟶ｭ邇・/th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="legend">
    <div class="legend-item">
      <span class="text-notice">笆</span> 95%莉･荳・    </div>
    <div class="legend-item">
      <span class="text-caution">笆</span> 90%莉･荳・    </div>
    <div class="legend-item">
      <span class="text-warning">笆</span> 85%莉･荳・    </div>
    <div class="legend-item">
      <span class="text-danger">笆</span> 80%莉･荳・    </div>
  </div>

  <div class="footer-notes">
    <p>窶ｻ・夂ｴｯ險亥・蟶ｭ邇・′90%莉･荳九・蝣ｴ蜷医・谺｡縺ｮ繝薙じ縺ｮ譖ｴ譁ｰ縺ｫ蠖ｱ髻ｿ縺悟・繧句庄閭ｽ諤ｧ縺後≠繧翫∪縺吶・/p>
    <p>窶ｻ・壽悽譬｡縺ｧ縺ｯ邏ｯ險亥・蟶ｭ邇・5%莉･荳九・閠・↓謖・ｮ壽｡謗ｨ阮ｦ譖ｸ縺翫ｈ縺ｳ蟄ｦ譬｡謗ｨ阮ｦ譖ｸ繧堤匱陦後＠縺ｾ縺帙ｓ縲・/p>
    <p>窶ｻ・壽悽譖ｸ縺ｯ蜃ｺ蟶ｭ險ｼ譏取嶌縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・/p>
  </div>

</body>
</html>`;
}

/**
 * 蜃ｺ蟶ｭ蛟狗･ｨPDF繧堤函謌・ */
async function generateAttendancePDF(data, outputPath = null, browser = null) {
  const html = generateAttendanceHTML(data);
  const cacheKey = `attendance/${data.student.id}_${data.student.name}.pdf`;
  return await htmlToPdf(html, outputPath, cacheKey, browser);
}


/**
 * 謌千ｸｾ騾夂衍陦ｨ 蛟狗･ｨHTML繧堤函謌・(譌･譛ｬ隱樒沿)
 */
/**
 * 謌千ｸｾ騾夂衍陦ｨ 蛟狗･ｨHTML繧堤函謌・(譌･譛ｬ隱樒沿繝ｻ蜈ｬ逧・枚譖ｸ繧ｹ繧ｿ繧､繝ｫ)
 */
function generateGradeReportHTML(data, yearTerm) {
  const { student_name, student_id_text, class_name, final_exam_total, report_card_total, report_card_data } = data;
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  // 隧穂ｾ｡蛻､螳・  const calculateGrade = (score) => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  };

  const subjectNames = {
    'vocab': '譁・ｭ励・隱槫ｽ・,
    'grammar': '譁・ｳ・,
    'reading': '隱ｭ隗｣',
    'listening': '閨ｴ隗｣',
    'writing': '菴懈枚',
    'conversation': '莨夊ｩｱ'
  };

  // Define order
  const subjects = ['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'];

  const subjectRows = subjects.map(key => {
    const d = report_card_data[key] || {};
    // StudentGradeDetail.jsx logic: Attendance and Participation are from the top-level object, repeated for each row
    const att = report_card_data.attendance;
    const part = report_card_data.participation;

    return `
      <tr>
        <td class="subject-name">${subjectNames[key]}</td>
        <td>${d.base !== undefined ? d.base.toFixed(1) : '-'}</td>
        <td>${att !== undefined ? att.toFixed(1) : '-'}</td>
        <td>${part !== undefined ? part.toFixed(1) : '-'}</td>
        <td class="bold">${d.total !== undefined ? d.total.toFixed(1) : '-'}</td>
        <td class="bold">${d.total !== undefined ? calculateGrade(d.total) : '-'}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>謌千ｸｾ騾夂衍陦ｨ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Serif JP", "Noto Serif CJK JP", "・ｭ・ｳ 譏取悃", "MS Mincho", "貂ｸ譏取悃", "Yu Mincho", serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #000;
      padding: 25mm 20mm;
      background: #fff;
    }
    
    /* Header */
    .header-area {
        position: relative;
        margin-bottom: 10mm;
        height: 25mm;
        border-bottom: 2px solid #000;
    }
    
    .date-right {
        position: absolute;
        top: -10mm;
        right: 0;
        font-size: 10pt;
    }
    
    h1 {
      text-align: center;
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 5px;
      margin-top: 5mm;
      font-family: "Noto Serif CJK JP", "Noto Serif JP", "・ｭ・ｳ 繧ｴ繧ｷ繝・け", "MS Gothic", sans-serif;
    }

    /* Info Table */
    .info-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000; /* Outer border mostly handled by cells, but 1px solid helps */
        margin-bottom: 8mm;
    }
    .info-table td {
        border: 1px solid #000;
        padding: 5px 10px;
        font-size: 11pt;
    }
    .info-label {
        background-color: #f5f5f5;
        text-align: center;
        width: 15%;
        font-weight: normal;
        font-size: 10pt;
    }
    .info-value {
        width: 35%;
        text-align: left;
        font-weight: bold;
    }
    
    /* Grade Table */
    .grade-table {
        width: 100%;
        border-collapse: collapse;
        border: 2px solid #000;
        margin-bottom: 8mm;
    }
    .grade-table th, .grade-table td {
        border: 1px solid #000;
        padding: 6px 4px;
        text-align: center;
        font-size: 10pt;
    }
    .grade-table th {
        background-color: #f0f0f0;
        font-weight: bold;
        height: 10mm;
    }
    .grade-table td {
        height: 9mm;
    }
    .subject-name {
        font-weight: bold;
        text-align: center !important;
    }
    
    /* Summary Section */
    .summary-section {
        margin-top: 5mm;
        border: 1px solid #000;
        padding: 4mm;
        overflow: hidden;
        display: flex;
        justify-content: space-around;
        align-items: center;
    }
    .summary-item {
        font-size: 12pt;
        text-align: center;
    }
    .summary-val {
        font-size: 16pt;
        font-weight: bold;
        margin-left: 5px;
        margin-right: 5px;
    }
    .grade-circle {
        display: inline-block;
        width: 40px; 
        height: 40px; 
        line-height: 36px;
        border: 2px solid #000; 
        border-radius: 50%;
        text-align: center;
        font-size: 18pt;
        font-weight: bold;
    }

    /* Footer */
    .footer {
        margin-top: 15mm;
        text-align: right;
        font-size: 11pt;
    }
    .school-name {
        font-size: 16pt;
        font-weight: bold;
        margin-bottom: 5px;
        font-family: "Noto Serif CJK JP", "Noto Serif JP", "・ｭ・ｳ 繧ｴ繧ｷ繝・け", "MS Gothic", sans-serif;
    }
    
    /* Utility */
    .bold { font-weight: bold; }
    .note { margin-top: 2mm; font-size: 9pt; }
  </style>
</head>
<body>
  
  <div class="header-area">
      <div class="date-right">逋ｺ陦梧律・・{today}</div>
      <h1>謌千ｸｾ騾夂衍陦ｨ</h1>
  </div>

  <table class="info-table">
    <tr>
      <td class="info-label">蟄ｦ邀咲分蜿ｷ</td>
      <td class="info-value">${student_id_text}</td>
      <td class="info-label">豌上蜷・/td>
      <td class="info-value" style="font-size: 13pt;">${student_name}</td>
    </tr>
    <tr>
      <td class="info-label">繧ｯ繝ｩ繧ｹ</td>
      <td class="info-value">${class_name}</td>
      <td class="info-label">蟄ｦ縲譛・/td>
      <td class="info-value">${yearTerm}</td>
    </tr>
  </table>

  <div style="margin-bottom: 3mm; font-size: 10.5pt;">
    莉雁ｭｦ譛溘・謌千ｸｾ繧剃ｸ玖ｨ倥・騾壹ｊ騾夂衍閾ｴ縺励∪縺吶・  </div>

  <table class="grade-table">
    <thead>
      <tr>
        <th width="20%">遘醍岼</th>
        <th width="16%">蝓ｺ遉守せ<br><span style="font-size:8pt; font-weight:normal;">(70轤ｹ貅轤ｹ)</span></th>
        <th width="16%">蜃ｺ蟶ｭ轤ｹ<br><span style="font-size:8pt; font-weight:normal;">(15轤ｹ貅轤ｹ)</span></th>
        <th width="16%">蟷ｳ蟶ｸ轤ｹ<br><span style="font-size:8pt; font-weight:normal;">(15轤ｹ貅轤ｹ)</span></th>
        <th width="16%">蜷郁ｨ・br><span style="font-size:8pt; font-weight:normal;">(100轤ｹ貅轤ｹ)</span></th>
        <th width="16%">隧募ｮ・/th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="summary-item">
        <div>譛滓忰隧ｦ鬨灘粋險・/div>
        <div><span class="summary-val">${final_exam_total}</span> / 600</div>
    </div>
    <div class="summary-item">
        <div>謌千ｸｾ蜷郁ｨ育せ</div>
        <div><span class="summary-val">${report_card_total.toFixed(1)}</span> / 100</div>
    </div>
    <div class="summary-item" style="border: 2px solid #000; padding: 5px 15px;">
        <div style="font-size: 11pt;">邱丞粋隧募ｮ・/div>
        <div style="margin-top:0px; font-size: 20pt; font-weight: bold;">${calculateGrade(report_card_total)}</div>
    </div>
  </div>

  <div class="note">
    <p>・願ｩ穂ｾ｡蝓ｺ貅厄ｼ・A (80轤ｹ莉･荳・, B (79-60轤ｹ), C (59-40轤ｹ), D (39-20轤ｹ), F (19轤ｹ莉･荳・</p>
  </div>

  <div class="footer">
    <div class="school-name">逾樊虻螟冶ｪ樊蕗閧ｲ蟄ｦ髯｢</div>

  </div>

</body>
</html>`;
}

/**
 * 謌千ｸｾ騾夂衍陦ｨPDF繧堤函謌・ */
async function generateGradeReportPDF(data, yearTerm, outputPath = null) {
  const html = generateGradeReportHTML(data, yearTerm);
  return await htmlToPdf(html, outputPath);
}

/**
 * 譛滓忰隧ｦ鬨鍋ｵ先棡騾夂衍譖ｸ HTML繧堤函謌・(譌･譛ｬ隱樒沿繝ｻ蜈ｬ逧・枚譖ｸ繧ｹ繧ｿ繧､繝ｫ)
 */
function generateFinalExamHTML(data, yearTerm) {
  const { student_name, student_id_text, class_name, final_exam_total, final_exam_data, report_card_data } = data;
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const isJlpt = final_exam_data?.type === 'JLPT';

  // --- JLPT SPECIFIC TEMPLATE ---
  if (isJlpt) {
    const finalExam = final_exam_data;
    const reportDetails = report_card_data || {};
    const finalExamSum = data.final_exam_total;

    const getEvalStr = (score, max) => {
      // 1/3 and 2/3 thresholds
      if (score > (max * 2 / 3)) return 'A';
      if (score > (max / 3)) return 'B';
      return 'C';
    };

    const getEvalStyle = (val) => {
      if (val === 'A') return 'background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
      if (val === 'B') return 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fef08a;';
      return 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca;';
    };

    let subjectRows = '';
    if (finalExam.level === 'N4' || finalExam.level === 'N5') {
      const vocab = reportDetails.subjectCorrectCounts?.['譁・ｭ励・隱槫ｽ・] || reportDetails.subjectCorrectCounts?.['譁・ｭ苓ｪ槫ｽ・] || reportDetails.subjectCorrectCounts?.['隱槫ｽ・] || { correct: 0, total: 0 };
      const grammar = reportDetails.subjectCorrectCounts?.['譁・ｳ・] || { correct: 0, total: 0 };
      const reading = reportDetails.subjectCorrectCounts?.['隱ｭ隗｣'] || { correct: 0, total: 0 };
      const combinedScore = (finalExam.vocab || 0) + (finalExam.grammarReading || 0);
      const combinedCorrect = vocab.correct + grammar.correct + reading.correct;
      const combinedTotalQ = vocab.total + grammar.total + reading.total;
      const eStr = getEvalStr(combinedScore, 120);

      subjectRows = `
        <tr>
          <td class="subject-cell">險隱樒衍隴假ｼ域枚蟄励・隱槫ｽ吶・譁・ｳ包ｼ峨・隱ｭ隗｣</td>
          <td class="score-cell">${combinedScore} / 120</td>
          <td class="ratio-cell">${combinedCorrect} / ${combinedTotalQ}</td>
          <td class="judge-cell">${finalExam.judgments?.[0] || finalExam.judgments?.[1] || '-'}</td>
          <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(eStr)}">${eStr}</span></td>
        </tr>
      `;
    } else {
      const vocabScore = (finalExam.vocab || 0) + (finalExam.grammar || 0);
      const vocabCounts = reportDetails.subjectCorrectCounts?.['譁・ｭ励・隱槫ｽ・] || reportDetails.subjectCorrectCounts?.['譁・ｭ苓ｪ槫ｽ・] || reportDetails.subjectCorrectCounts?.['隱槫ｽ・] || { correct: 0, total: 0 };
      const grammarCounts = reportDetails.subjectCorrectCounts?.['譁・ｳ・] || { correct: 0, total: 0 };
      const vCorrect = vocabCounts.correct + grammarCounts.correct;
      const vTotal = vocabCounts.total + grammarCounts.total;
      const vEval = getEvalStr(vocabScore, 60);

      const rScore = finalExam.reading || 0;
      const rCounts = reportDetails.subjectCorrectCounts?.['隱ｭ隗｣'] || { correct: 0, total: 0 };
      const rEval = getEvalStr(rScore, 60);

      subjectRows = `
        <tr>
          <td class="subject-cell">險隱樒衍隴假ｼ域枚蟄励・隱槫ｽ吶・譁・ｳ包ｼ・/td>
          <td class="score-cell">${vocabScore} / 60</td>
          <td class="ratio-cell">${vCorrect} / ${vTotal}</td>
          <td class="judge-cell">${finalExam.judgments?.[0] || '-'}</td>
          <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(vEval)}">${vEval}</span></td>
        </tr>
        <tr>
          <td class="subject-cell">隱ｭ隗｣</td>
          <td class="score-cell">${rScore} / 60</td>
          <td class="ratio-cell">${rCounts.correct} / ${rCounts.total}</td>
          <td class="judge-cell">${finalExam.judgments?.[1] || '-'}</td>
          <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(rEval)}">${rEval}</span></td>
        </tr>
      `;
    }

    // Listening Row
    const lScore = finalExam.listening || 0;
    const lCounts = reportDetails.subjectCorrectCounts?.['閨ｴ隗｣'] || { correct: 0, total: 0 };
    const lEval = getEvalStr(lScore, 60);
    const lJudgeIdx = (finalExam.level === 'N4' || finalExam.level === 'N5') ? 1 : 2;

    subjectRows += `
      <tr>
        <td class="subject-cell">閨ｴ隗｣</td>
        <td class="score-cell">${lScore} / 60</td>
        <td class="ratio-cell">${lCounts.correct} / ${lCounts.total}</td>
        <td class="judge-cell">${finalExam.judgments?.[lJudgeIdx] || '-'}</td>
        <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(lEval)}">${lEval}</span></td>
      </tr>
    `;

    // Total Row
    const totalScore = finalExam.total || finalExamSum;
    const totalEval = getEvalStr(totalScore, 180);
    const counts = reportDetails.subjectCorrectCounts || {};
    const vC = counts['譁・ｭ励・隱槫ｽ・] || counts['譁・ｭ苓ｪ槫ｽ・] || counts['隱槫ｽ・] || { correct: 0, total: 0 };
    const gC = counts['譁・ｳ・] || { correct: 0, total: 0 };
    const rC = counts['隱ｭ隗｣'] || { correct: 0, total: 0 };
    const lC = counts['閨ｴ隗｣'] || { correct: 0, total: 0 };
    const allC = vC.correct + gC.correct + rC.correct + lC.correct;
    const allT = vC.total + gC.total + rC.total + lC.total;

    subjectRows += `
      <tr class="total-row">
        <td class="subject-cell">蜷郁ｨ・/td>
        <td class="score-cell">${totalScore} / 180</td>
        <td class="ratio-cell">${allC} / ${allT}</td>
        <td class="judge-cell">${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '蜷域ｼ' : '荳榊粋譬ｼ'}</td>
        <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(totalEval)}">${totalEval}</span></td>
      </tr>
    `;

    // Answer Details HTML
    let detailsHtml = '';
    if (reportDetails.answerDetails && reportDetails.answerDetails.length > 0) {
      const categories = ['譁・ｭ励・隱槫ｽ・, '譁・ｳ・, '隱ｭ隗｣', '閨ｴ隗｣'];
      detailsHtml = categories.map(sub => {
        const subDetails = reportDetails.answerDetails.filter(d => {
          if (sub === '譁・ｭ励・隱槫ｽ・) return d.subject === '譁・ｭ励・隱槫ｽ・ || d.subject === '譁・ｭ苓ｪ槫ｽ・ || d.subject === '隱槫ｽ・;
          return d.subject === sub;
        });
        if (subDetails.length === 0) return '';

        const catCounts = sub === '譁・ｭ励・隱槫ｽ・
          ? (reportDetails.subjectCorrectCounts?.['譁・ｭ励・隱槫ｽ・] || reportDetails.subjectCorrectCounts?.['譁・ｭ苓ｪ槫ｽ・] || reportDetails.subjectCorrectCounts?.['隱槫ｽ・])
          : reportDetails.subjectCorrectCounts?.[sub];

        return `
          <div class="answer-category">
            <h4 class="category-title">${sub} <span class="category-count">(${catCounts?.correct || 0} / ${catCounts?.total || 0})</span></h4>
            <div class="question-grid">
              ${subDetails.map(d => `
                <div class="question-item ${d.isCorrect ? 'correct' : 'incorrect'}">
                  <div class="q-no">${d.questionNo}</div>
                  <div class="q-ans">${d.selected || '-'}</div>
                  <div class="q-correct">(${d.correctAnswer})</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    }

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>JLPT讓｡謫ｬ隧ｦ鬨鍋ｵ先棡</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=block" rel="stylesheet">
  <style>
    @page { size: A4; margin: 8mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Sans JP", sans-serif;
      font-size: 8.5pt;
      line-height: 1.25;
      color: #334155;
      background: #fff;
    }
    
    .header-info {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 6px 12px;
        margin-bottom: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
    }
    .header-info table { width: 100%; border: none; }
    .header-info td { border: none; padding: 1px 0; text-align: left; font-size: 7.5pt; color: #475569; }
    .header-info strong { color: #334155; }

    .main-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 15px;
        border-left: 4px solid ${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '#10b981' : '#ef4444'};
        background-color: #fff;
        border: 1px solid #e2e8f0;
        border-left: 4px solid ${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '#10b981' : '#ef4444'};
        border-radius: 6px;
        margin-bottom: 10px;
    }
    .student-data { flex: 1; }
    .class-name { font-size: 7.5pt; color: #64748b; margin-bottom: 1px; }
    .student-name { font-size: 13pt; font-weight: bold; color: #1e293b; margin: 0; }
    .student-id { font-size: 9pt; color: #64748b; font-weight: normal; margin-left: 6px; }
    .exam-name { font-size: 8pt; color: #6b7280; margin-top: 1px; }

    .result-tiles { display: flex; gap: 8px; }
    .tile {
        text-align: center;
        padding: 4px 12px;
        border-radius: 6px;
        min-width: 80px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .score-tile { background-color: #fff; border: 1px solid #000; }
    .judge-tile { 
        background-color: ${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '#f0fdf4' : '#fef2f2'};
        border: 1px solid ${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '#10b981' : '#ef4444'};
    }
    .tile-label { font-size: 6.5pt; color: #64748b; margin-bottom: 1px; font-weight: 500; }
    .judge-tile .tile-label { color: ${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '#166534' : '#991b1b'}; }
    .tile-value { font-size: 11pt; font-weight: bold; }
    .result-text { font-size: 11pt; font-weight: 800; color: ${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '#10b981' : '#ef4444'}; }
    .score-sm { font-size: 8.5pt; color: #64748b; font-weight: normal; }

    .score-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
    }
    .score-table th {
        background-color: #f9fafb;
        padding: 6px;
        font-size: 8pt;
        font-weight: 600;
        border: 1px solid #e5e7eb;
        text-align: left;
    }
    .score-table td {
        padding: 6px;
        font-size: 8.5pt;
        border: 1px solid #e5e7eb;
    }
    .subject-cell { font-weight: 500; width: 35%; }
    .score-cell { text-align: right; width: 20%; font-weight: 600; }
    .ratio-cell { text-align: center; width: 15%; color: #475569; }
    .judge-cell { text-align: center; width: 15%; font-weight: 600; }
    .eval-cell { text-align: center; width: 15%; }
    
    .eval-badge {
        padding: 1px 8px;
        border-radius: 9999px;
        font-size: 7pt;
        font-weight: 700;
        display: inline-block;
    }
    .total-row { background-color: #f8fafc; font-weight: bold !important; }

    .answer-details {
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px;
    }
    .details-title { font-size: 9pt; font-weight: bold; color: #1e293b; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 2px; display: inline-block; }
    .answer-category { margin-bottom: 8px; }
    .answer-category:last-child { margin-bottom: 0; }
    .category-title { font-size: 8pt; font-weight: bold; color: #334155; margin-bottom: 4px; padding-left: 6px; border-left: 3px solid #64748b; }
    .category-count { font-size: 7.5pt; color: #64748b; font-weight: normal; margin-left: 4px; }
    
    .question-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    .question-item {
        width: 38px;
        padding: 3px 1px;
        border: 1px solid #e5e7eb;
        border-radius: 3px;
        text-align: center;
        background-color: #fff;
    }
    .q-no { font-size: 6.5pt; font-weight: bold; color: #64748b; margin-bottom: 1px; }
    .q-ans { font-size: 8pt; font-weight: 700; color: #1e293b; }
    .q-correct { font-size: 6pt; color: #94a3b8; }
    .correct { background-color: #f0fdf4; border-color: #bbf7d0; }
    .incorrect { background-color: #fef2f2; border-color: #fecaca; }

    .footer-report { margin-top: 8px; text-align: right; font-size: 7.5pt; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header-info">
      <table>
        <tr>
            <td><strong>繝ｬ繝吶Ν:</strong> ${finalExam.level || '-'}</td>
            <td><strong>菴ｿ逕ｨ謨呎攝:</strong> ${finalExam.textbook || '-'}</td>
            <td><strong>隧ｦ鬨灘錐/蟄ｦ譛・</strong> ${yearTerm || '-'}</td>
        </tr>
        ${finalExam.levelInfo ? `
        <tr>
            <td><strong>蜷域ｼ轤ｹ:</strong> ${finalExam.levelInfo.passingScore}轤ｹ</td>
            <td colspan="2">
                <strong>蝓ｺ貅也せ:</strong> ${finalExam.levelInfo.criteria1Name}(${finalExam.levelInfo.criteria1Score})
                ${finalExam.levelInfo.criteria2Name ? ` / ${finalExam.levelInfo.criteria2Name}(${finalExam.levelInfo.criteria2Score})` : ''}
                ${finalExam.levelInfo.criteria3Name ? ` / ${finalExam.levelInfo.criteria3Name}(${finalExam.levelInfo.criteria3Score})` : ''}
            </td>
        </tr>
        ` : ''}
      </table>
  </div>

  <div class="main-header">
    <div class="student-data">
        <div class="class-name">${class_name}</div>
        <h3 class="student-name">${student_name}<span class="student-id">(${student_id_text})</span></h3>
        <div class="exam-name">${yearTerm}</div>
    </div>
    <div class="result-tiles">
        <div class="tile score-tile">
            <div class="tile-label">蜷郁ｨ育せ</div>
            <div class="tile-value">${totalScore}轤ｹ <span class="score-sm">/ 180</span></div>
        </div>
        <div class="tile judge-tile">
            <div class="tile-label">蛻､螳・/div>
            <div class="result-text">${finalExam.result === '蜷・ || finalExam.result === '笳・ ? '蜷域ｼ' : '荳榊粋譬ｼ'}</div>
        </div>
    </div>
  </div>

  <table class="score-table">
    <thead>
        <tr>
            <th>遘醍岼</th>
            <th style="text-align:right">蠕礼せ</th>
            <th style="text-align:center">豁｣遲疲焚</th>
            <th style="text-align:center">蛻､螳・/th>
            <th style="text-align:center">隧穂ｾ｡</th>
        </tr>
    </thead>
    <tbody>
        ${subjectRows}
    </tbody>
  </table>

  ${detailsHtml ? `
  <div class="answer-details">
    <h3 class="details-title">隗｣遲碑ｩｳ邏ｰ</h3>
    ${detailsHtml}
  </div>
  ` : ''}

  <div class="footer-report">
    逾樊虻螟冶ｪ樊蕗閧ｲ蟄ｦ髯｢ | 逋ｺ陦梧律: ${today}
  </div>

</body>
</html>`;
  }

  // --- STANDARD FINAL EXAM TEMPLATE (Legacy) ---
  const calculateGrade = (score) => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  };

  const calculateTotalGrade = (totalScore) => {
    return calculateGrade(totalScore / 6);
  };

  const subjectNames = {
    'vocab': '譁・ｭ励・隱槫ｽ・,
    'grammar': '譁・ｳ・,
    'reading': '隱ｭ隗｣',
    'listening': '閨ｴ隗｣',
    'writing': '菴懈枚',
    'conversation': '莨夊ｩｱ'
  };

  const subjects = ['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'];
  const subjectRows = subjects.map(key => {
    const score = final_exam_data[key];
    return `
      <tr>
        <td class="subject-name">${subjectNames[key]}</td>
        <td>100</td>
        <td class="bold">${score !== undefined ? score : '-'}</td>
        <td class="bold">${score !== undefined ? calculateGrade(score) : '-'}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>譛滓忰隧ｦ鬨鍋ｵ先棡騾夂衍譖ｸ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Serif JP", "Noto Serif CJK JP", "・ｭ・ｳ 譏取悃", "MS Mincho", "貂ｸ譏取悃", "Yu Mincho", serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #000;
      padding: 25mm 20mm;
      background: #fff;
    }
    
    .header-area {
        position: relative;
        margin-bottom: 10mm;
        height: 25mm;
        border-bottom: 2px solid #000;
    }
    .date-right {
        position: absolute;
        top: -10mm;
        right: 0;
        font-size: 10pt;
    }
    h1 {
      text-align: center;
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 5px;
      margin-top: 5mm;
      font-family: "Noto Serif CJK JP", "Noto Serif JP", "・ｭ・ｳ 繧ｴ繧ｷ繝・け", "MS Gothic", sans-serif;
    }
    .info-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
        margin-bottom: 8mm;
    }
    .info-table td { border: 1px solid #000; padding: 5px 10px; font-size: 11pt; }
    .info-label { background-color: #f5f5f5; text-align: center; width: 15%; font-weight: normal; font-size: 10pt; }
    .info-value { width: 35%; text-align: left; font-weight: bold; }
    .grade-table { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 8mm; }
    .grade-table th, .grade-table td { border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10pt; }
    .grade-table th { background-color: #f0f0f0; font-weight: bold; height: 10mm; }
    .grade-table td { height: 9mm; }
    .subject-name { font-weight: bold; text-align: center !important; }
    .summary-section { margin-top: 5mm; border: 1px solid #000; padding: 4mm; overflow: hidden; display: flex; justify-content: space-around; align-items: center; }
    .summary-item { font-size: 12pt; text-align: center; }
    .summary-val { font-size: 16pt; font-weight: bold; margin-left: 5px; margin-right: 5px; }
    .footer { margin-top: 15mm; text-align: right; font-size: 11pt; }
    .school-name { font-size: 16pt; font-weight: bold; margin-bottom: 5px; font-family: "Noto Serif CJK JP", "Noto Serif JP", "・ｭ・ｳ 繧ｴ繧ｷ繝・け", "MS Gothic", sans-serif; }
    .bold { font-weight: bold; }
    .note { margin-top: 2mm; font-size: 9pt; }
  </style>
</head>
<body>
  <div class="header-area">
      <div class="date-right">逋ｺ陦梧律・・{today}</div>
      <h1>譛滓忰隧ｦ鬨鍋ｵ先棡騾夂衍譖ｸ</h1>
  </div>
  <table class="info-table">
    <tr>
      <td class="info-label">蟄ｦ邀咲分蜿ｷ</td>
      <td class="info-value">${student_id_text}</td>
      <td class="info-label">豌上蜷・/td>
      <td class="info-value" style="font-size: 13pt;">${student_name}</td>
    </tr>
    <tr>
      <td class="info-label">繧ｯ繝ｩ繧ｹ</td>
      <td class="info-value">${class_name}</td>
      <td class="info-label">蟄ｦ縲譛・/td>
      <td class="info-value">${yearTerm}</td>
    </tr>
  </table>
  <div style="margin-bottom: 3mm; font-size: 10.5pt;">莉雁ｭｦ譛溘・譛滓忰隧ｦ鬨薙・邨先棡繧剃ｸ玖ｨ倥・騾壹ｊ騾夂衍閾ｴ縺励∪縺吶・/div>
  <table class="grade-table">
    <thead>
      <tr>
        <th width="25%">遘醍岼</th>
        <th width="25%">貅轤ｹ</th>
        <th width="25%">蠕礼せ</th>
        <th width="25%">隧穂ｾ｡</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>
  <div class="summary-section">
    <div class="summary-item">
        <div>邱丞ｾ礼せ</div>
        <div><span class="summary-val">${final_exam_total}</span> / 600</div>
    </div>
    <div class="summary-item">
        <div>6遘醍岼蟷ｳ蝮・/div>
        <div><span class="summary-val">${(final_exam_total / 6).toFixed(1)}</span> / 100</div>
    </div>
    <div class="summary-item" style="border: 2px solid #000; padding: 5px 15px;">
        <div style="font-size: 11pt;">邱丞粋蛻､螳・/div>
        <div style="margin-top:0px; font-size: 20pt; font-weight: bold;">${calculateTotalGrade(final_exam_total)}</div>
    </div>
  </div>
  <div class="note">
    <p>・願ｩ穂ｾ｡蝓ｺ貅厄ｼ・A (80轤ｹ莉･荳・, B (79-60轤ｹ), C (59-40轤ｹ), D (39-20轤ｹ), F (19轤ｹ莉･荳・</p>
  </div>
  <div class="footer"><div class="school-name">逾樊虻螟冶ｪ樊蕗閧ｲ蟄ｦ髯｢</div></div>
</body>
</html>`;
}

/**
 * 謌千ｸｾ騾夂衍陦ｨPDF繧堤函謌・(Japanese Edition)
 */
async function generateGradeReportPDF(data, yearTerm, outputPath = null, browser = null) {
  const html = generateGradeReportHTML(data, yearTerm);
  const cacheKey = `report-cards/${data.student_id_text}_${yearTerm}.pdf`;
  return await htmlToPdf(html, outputPath, cacheKey, browser);
}


/**
 * 譛滓忰隧ｦ鬨鍋ｵ先棡PDF繧堤函謌・ */
async function generateFinalExamPDF(data, yearTerm, outputPath = null, browser = null) {
  const html = generateFinalExamHTML(data, yearTerm);
  const cacheKey = `final-exams/${data.student_id_text}_${yearTerm}.pdf`;
  return await htmlToPdf(html, outputPath, cacheKey, browser);
}


module.exports = {
  generateTranscriptHTML,
  htmlToPdf,
  generateTranscriptPDF,
  generateAttendanceHTML,
  generateAttendancePDF,
  generateGradeReportHTML,
  generateGradeReportPDF,
  generateFinalExamHTML,
  generateFinalExamPDF,
  getBrowser
};
