/**
 * 成績証明書 PDF 生成 (Puppeteer版) v2
 * オリジナルPDFを完璧に再現
 */

const fs = require('fs');
const path = require('path');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

async function getBrowser() {
  if (isProduction) {
    // Vercel / Production environment
    const chromium = require('@sparticuz/chromium');
    const puppeteerCore = require('puppeteer-core');

    // Setup for Japanese fonts
    // IPAmjMincho (45MB) is too heavy and local loading is fragile on Vercel.
    // Switching to Noto Serif CJK JP (Regular) via direct GitHub Raw link.
    // This provides a formal Mincho-style look for official documents.
    try {
      await chromium.font('https://github.com/googlefonts/noto-cjk/raw/main/Serif/OTF/Japanese/NotoSerifCJKjp-Regular.otf');
    } catch (e) {
      console.error('Font loading failed:', e);
    }

    return await puppeteerCore.launch({
      args: chromium.args,
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
 * 成績証明書HTMLを生成 v2
 * オリジナルPDFの構造を完璧に再現
 */
function generateTranscriptHTML(data, issueDate) {
  const grades = data.grades || {};
  const subjects = ['文字語彙', '文法', '読解', '聴解', '作文', '会話', '総合'];
  const gradeLetters = ['A', 'B', 'C', 'D', 'F'];

  // 成績行を生成（選択された評価に丸を表示）
  const gradeRows = subjects.map(subject => {
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

  // 卒業状態
  const isExpected = data.graduationStatus === 'expected';
  const isGraduated = data.graduationStatus === 'graduated';

  // 名前の長さ計算とスケーリングクラス決定
  const name = data.name || '';
  const nameLen = countLength(name);
  let nameClass = 'value'; // デフォルトクラス

  // Wordテンプレートのロジックに合わせる
  if (nameLen > 30) nameClass += ' scale-30'; // 4pt, 30% width相当
  else if (nameLen > 25) nameClass += ' scale-40';
  else if (nameLen > 20) nameClass += ' scale-60';
  else if (nameLen > 15) nameClass += ' scale-80';
  else if (nameLen > 12) nameClass += ' scale-90';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>成績証明書</title>
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
      font-family: "Noto Serif CJK JP", "Noto Serif JP", "ＭＳ 明朝", "MS Mincho", "游明朝", "Yu Mincho", serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
      padding: 18mm 22mm;
    }
    
    /* タイトル */
    h1 {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.35em;
      margin-bottom: 18px;
    }
    
    /* テーブル共通 */
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
    
    /* 個人情報テーブル */
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

    /* Scaling Classes (Transformを利用して幅縮小をシミュレート) */
    .scale-wrapper {
        display: inline-block;
        transform-origin: center;
        width: 100%;
    }
    
    .scale-90 .scale-wrapper { transform: scaleX(0.9); }
    .scale-80 .scale-wrapper { transform: scaleX(0.8); }
    .scale-60 .scale-wrapper { transform: scaleX(0.6); }
    .scale-40 .scale-wrapper { transform: scaleX(0.4); font-size: 8pt; } /* サイズも少し下げる */
    .scale-30 .scale-wrapper { transform: scaleX(0.3); font-size: 6pt; } /* かなり小さく */
    
    .info-table .full-value {
      text-align: left;
      padding-left: 12px;
    }
    
    /* 卒業見込みの丸 */
    .grad-circle {
      display: inline-block;
      border: 1px solid #000;
      border-radius: 50%;
      padding: 0 5px;
      margin: 0 2px;
    }
    
    /* 証明文 */
    .cert-text {
      margin: 12px 0;
      font-size: 9pt;
    }
    
    /* 成績テーブル（特記事項含む） */
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
    
    /* 成績の丸 */
    .grade-circle {
      display: inline-block;
      border: 1px solid #000;
      border-radius: 50%;
      width: 20px;
      height: 18px;
      line-height: 16px;
      text-align: center;
    }
    
    /* 特記事項 */
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
    
    /* 評価基準 */
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
    
    /* 発行元 */
    .issuer {
      text-align: right;
      font-size: 9pt;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <h1>成績証明書</h1>
  
  <table class="info-table">
    <tr>
      <td class="label">学籍番号：</td>
      <td class="value">${data.studentId || ''}</td>
      <td class="label">クラス：</td>
      <td class="value">${data.className || ''}</td>
    </tr>
    <tr>
      <td class="label">国　籍：</td>
      <td class="value">${data.nationality || ''}</td>
      <td class="label">氏　名：</td>
      <td class="${nameClass}">
        <span class="scale-wrapper">${data.name || ''}</span>
      </td>
    </tr>
    <tr>
      <td class="label">生年月日：</td>
      <td class="value">${data.birthDate || ''}</td>
      <td class="label">性　別：</td>
      <td class="value">${data.gender || ''}</td>
    </tr>
    <tr>
      <td class="label">入学年月日：</td>
      <td class="full-value" colspan="3">${data.enrollmentDate || ''}</td>
    </tr>
    <tr>
      <td class="label">卒業年月日：</td>
      <td class="full-value" colspan="3">
        ${data.graduationDate || ''} （　 ${isGraduated ? '<span class="grad-circle">卒業</span>' : '卒業'} ・ ${isExpected ? '<span class="grad-circle">卒業見込み</span>' : '卒業見込み'}　 ）
      </td>
    </tr>
  </table>
  
  <p class="cert-text">上記の者の成績は下記の通りであることを証明致します。</p>
  
  <table class="grade-table">
    <thead>
      <tr>
        <th class="subject-header">科目</th>
        <th class="grade-header" colspan="5">評価</th>
      </tr>
    </thead>
    <tbody>
      ${gradeRows}
      <tr>
        <td class="notes-label" colspan="6">特記事項</td>
      </tr>
      <tr>
        <td class="notes-content" colspan="6">${data.specialNotes || ''}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="criteria">
    <div class="title">＊評価基準　ＡＢＣＤＦの5段階</div>
    <div class="item">A　80点以上</div>
    <div class="item">B　79点～70点</div>
    <div class="item">C　69点～60点</div>
    <div class="item">D　59点～50点</div>
  </div>
  
  <div class="issuer">
    <div>神戸外語教育学院</div>
    <div>${issueDate || ''}</div>
  </div>
</body>
</html>`;
}

// 簡易文字数カウント (半角0.9)
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
 * 成績証明書PDFを生成
 */
async function generateTranscriptPDF(data, issueDate, outputPath = null) {
  const html = generateTranscriptHTML(data, issueDate);
  return await htmlToPdf(html, outputPath);
}

/**
 * PuppeteerでHTMLをPDFに変換
 * @param {string} html
 * @param {string|null} outputPath - Path to save PDF (optional)
 * @returns {Promise<Buffer>} PDF Buffer
 */
async function htmlToPdf(html, outputPath = null) {
  const browser = await getBrowser();

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
      console.log('PDF生成完了:', outputPath);
    }

    return buffer;
  } finally {
    await browser.close();
  }
}


/**
 * 出席状況個票HTMLを生成
 */
function generateAttendanceHTML(data) {
  const { student, history, currentStats } = data;
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); // 2026年1月15日

  // データの準備（月別と累計を結合）
  const monthlyData = [...(history.monthlyData || [])];
  const cumulativeData = [...(history.cumulativeData || [])];

  // マージデータの作成
  let combinedRows = monthlyData.map(m => {
    const c = cumulativeData.find(cum => cum.year === m.year && cum.month === m.month) || {};
    return {
      year: m.year,
      month: m.month,
      attendance_days: m.attendance_days,
      absence_days: m.absence_days,
      monthly_rate: m.attendance_rate,
      cumulative_rate: c.attendance_rate // 未定義ならundefined
    };
  });

  // 降順ソート（新しい順）
  combinedRows.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

  // 最新データの年月取得（ボックス表示用）
  const latestData = combinedRows.length > 0 ? combinedRows[0] : { year: '----', month: '--' };
  const latestRatePercent = (currentStats.rate * 100).toFixed(1);

  // 評価ボックスの色判定
  let rateClass = 'rate-normal';
  if (currentStats.rate <= 0.80) rateClass = 'rate-danger';
  else if (currentStats.rate <= 0.85) rateClass = 'rate-warning';
  else if (currentStats.rate <= 0.90) rateClass = 'rate-caution';
  else if (currentStats.rate <= 0.95) rateClass = 'rate-notice';

  // 行HTML生成
  const rowsHtml = combinedRows.map(row => {
    const mRate = row.monthly_rate;
    const cRate = row.cumulative_rate;

    // 条件付き書式（月別出席率に基づく）
    let rowClass = '';
    if (mRate <= 0.80) rowClass = 'bg-danger';
    else if (mRate <= 0.85) rowClass = 'bg-warning';
    else if (mRate <= 0.90) rowClass = 'bg-caution';
    else if (mRate <= 0.95) rowClass = 'bg-notice';

    return `
      <tr class="${rowClass}">
        <td>${row.year}年${row.month}月</td>
        <td>${row.attendance_days}</td>
        <td>${row.absence_days}</td>
        <td>${(mRate * 100).toFixed(1)}%</td>
        <td class="col-cumulative">${cRate !== undefined ? (cRate * 100).toFixed(1) + '%' : '-'}</td>
      </tr>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>出席表</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Sans JP", "Noto Sans CJK JP", "ＭＳ ゴシック", sans-serif;
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
      background-color: #f9fbfd;
      font-weight: bold;
    }

    /* Backgrounds */
    .bg-danger { background-color: #ffebee !important; }
    .bg-warning { background-color: #fff3e0 !important; }
    .bg-caution { background-color: #fffde7 !important; }
    .bg-notice { background-color: #e1f5fe !important; }

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

  <div class="issue-date-top">発行日：${today}</div>

  <div class="title-container">
    <h1>神戸外語教育学院</h1>
  </div>

  <div class="header-layout">
    <div class="student-info">
      <div class="student-id">学籍番号：${student.id}</div>
      <div class="student-name">名前：${student.name}</div>
      <div class="student-class">クラス：${student.className || ''}</div>
    </div>

    <div class="summary-box">
      <div class="summary-header">
        ${latestData.year}年${latestData.month}月出席率
      </div>
      <div class="summary-content">
        <span class="summary-value ${rateClass}">${latestRatePercent}%</span>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th width="20%">年月</th>
        <th width="15%">出席日数</th>
        <th width="15%">欠席日数</th>
        <th width="25%">出席率</th>
        <th width="25%">累計出席率</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="legend">
    <div class="legend-item">
      <div class="legend-color bg-notice"></div>
      95%以下
    </div>
    <div class="legend-item">
      <div class="legend-color bg-caution"></div>
      90%以下
    </div>
    <div class="legend-item">
      <div class="legend-color bg-warning"></div>
      85%以下
    </div>
    <div class="legend-item">
      <div class="legend-color bg-danger"></div>
      80%以下
    </div>
  </div>

  <div class="footer-notes">
    <p>※：累計出席率が90%以下の場合は次のビザの更新に影響が出る可能性があります。</p>
    <p>※：本校では累計出席率95%以下の者に指定校推薦書および学校推薦書を発行しません。</p>
    <p>※：本書は出席証明書ではありません。</p>
  </div>

</body>
</html>`;
}

/**
 * 出席個票PDFを生成
 */
async function generateAttendancePDF(data, outputPath = null) {
  const html = generateAttendanceHTML(data);
  return await htmlToPdf(html, outputPath);
}

/**
 * 成績通知表 個票HTMLを生成 (日本語版)
 */
/**
 * 成績通知表 個票HTMLを生成 (日本語版・公的文書スタイル)
 */
function generateGradeReportHTML(data, yearTerm) {
  const { student_name, student_id_text, class_name, final_exam_total, report_card_total, report_card_data } = data;
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  // 評価判定
  const calculateGrade = (score) => {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  };

  const subjectNames = {
    'vocab': '文字・語彙',
    'grammar': '文法',
    'reading': '読解',
    'listening': '聴解',
    'writing': '作文',
    'conversation': '会話'
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
  <title>成績通知表</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Serif CJK JP", "Noto Serif JP", "ＭＳ 明朝", "MS Mincho", "游明朝", "Yu Mincho", serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #000;
      padding: 15mm 20mm;
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
        top: 0;
        right: 0;
        font-size: 10pt;
    }
    
    h1 {
      text-align: center;
      font-size: 22pt;
      font-weight: bold;
      letter-spacing: 5px;
      margin-top: 5mm;
      font-family: "Noto Serif CJK JP", "Noto Serif JP", "ＭＳ ゴシック", "MS Gothic", sans-serif;
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
        font-family: "Noto Serif CJK JP", "Noto Serif JP", "ＭＳ ゴシック", "MS Gothic", sans-serif;
    }
    
    /* Utility */
    .bold { font-weight: bold; }
    .note { margin-top: 2mm; font-size: 9pt; }
  </style>
</head>
<body>
  
  <div class="header-area">
      <div class="date-right">発行日：${today}</div>
      <h1>成績通知表</h1>
  </div>

  <table class="info-table">
    <tr>
      <td class="info-label">学籍番号</td>
      <td class="info-value">${student_id_text}</td>
      <td class="info-label">氏　名</td>
      <td class="info-value" style="font-size: 13pt;">${student_name}</td>
    </tr>
    <tr>
      <td class="info-label">クラス</td>
      <td class="info-value">${class_name}</td>
      <td class="info-label">学　期</td>
      <td class="info-value">${yearTerm}</td>
    </tr>
  </table>

  <div style="margin-bottom: 3mm; font-size: 10.5pt;">
    今学期の成績を下記の通り通知致します。
  </div>

  <table class="grade-table">
    <thead>
      <tr>
        <th width="20%">科目</th>
        <th width="16%">基礎点<br><span style="font-size:8pt; font-weight:normal;">(70点満点)</span></th>
        <th width="16%">出席点<br><span style="font-size:8pt; font-weight:normal;">(15点満点)</span></th>
        <th width="16%">平常点<br><span style="font-size:8pt; font-weight:normal;">(15点満点)</span></th>
        <th width="16%">合計<br><span style="font-size:8pt; font-weight:normal;">(100点満点)</span></th>
        <th width="16%">評定</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="summary-item">
        <div>期末試験合計</div>
        <div><span class="summary-val">${final_exam_total}</span> / 600</div>
    </div>
    <div class="summary-item">
        <div>成績合計点</div>
        <div><span class="summary-val">${report_card_total.toFixed(1)}</span> / 100</div>
    </div>
    <div class="summary-item">
        <div>総合評定</div>
        <div style="margin-top:5px;"><span class="grade-circle">${calculateGrade(report_card_total)}</span></div>
    </div>
  </div>

  <div class="note">
    <p>＊評価基準： A (80点以上), B (79-60点), C (59-40点), D (39-20点), F (19点以下)</p>
  </div>

  <div class="footer">
    <div class="school-name">神戸外語教育学院</div>
    <div>Kobe Gaigo Language School</div>
  </div>

</body>
</html>`;
}

/**
 * 成績通知表PDFを生成
 */
async function generateGradeReportPDF(data, yearTerm, outputPath = null) {
  const html = generateGradeReportHTML(data, yearTerm);
  return await htmlToPdf(html, outputPath);
}

export {
  generateTranscriptHTML,
  htmlToPdf,
  generateTranscriptPDF,
  generateAttendanceHTML,
  generateAttendancePDF,
  generateGradeReportHTML,
  generateGradeReportPDF
};
