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

  // マージデータの作成（月別データを基準にして累計を結合）
  let combinedRows = monthlyData.map(m => {
    const c = cumulativeData.find(cum => cum.year === m.year && cum.month === m.month) || {};
    return {
      year: m.year,
      month: m.month,
      class_days: (m.attendance_days || 0) + (m.absence_days || 0),  // 授業日数 = 出席日数 + 欠席日数
      attendance_days: m.attendance_days,
      absence_days: m.absence_days,
      late_slots: m.late_slots,  // 遅刻・早退
      monthly_rate: m.attendance_rate,  // 月間出席率
      cumulative_rate: c.attendance_rate  // 累計出席率
    };
  });

  // 降順ソート（新しい順）
  combinedRows.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

  // 最新データの年月取得（ボックス表示用）
  const latestData = combinedRows.length > 0 ? combinedRows[0] : { year: '----', month: '--', monthly_rate: 0 };
  const latestMonthlyRate = latestData.monthly_rate !== undefined ? latestData.monthly_rate : 0;
  const latestRatePercent = (latestMonthlyRate * 100).toFixed(1);

  // 評価ボックスの色判定（月間出席率に基づく）
  let rateClass = 'rate-normal';
  if (latestMonthlyRate <= 0.80) rateClass = 'rate-danger';
  else if (latestMonthlyRate <= 0.85) rateClass = 'rate-warning';
  else if (latestMonthlyRate <= 0.90) rateClass = 'rate-caution';
  else if (latestMonthlyRate <= 0.95) rateClass = 'rate-notice';

  // 行 HTML生成（背景色なし、月間のみ文字色）
  const rowsHtml = combinedRows.map(row => {
    const mRate = row.monthly_rate;
    const cRate = row.cumulative_rate;

    // 月間出席率の文字色（95%以上は黒）
    let mRateClass = '';
    if (mRate <= 0.80) mRateClass = 'text-danger';
    else if (mRate <= 0.85) mRateClass = 'text-warning';
    else if (mRate <= 0.90) mRateClass = 'text-caution';
    else if (mRate <= 0.95) mRateClass = 'text-notice';

    // 累計出席率の文字色（95%以上は黒）
    let cRateClass = '';
    if (cRate <= 0.80) cRateClass = 'text-danger';
    else if (cRate <= 0.85) cRateClass = 'text-warning';
    else if (cRate <= 0.90) cRateClass = 'text-caution';
    else if (cRate <= 0.95) cRateClass = 'text-notice';

    return `
      <tr>
        <td>${row.year}年${row.month}月</td>
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
        <th width="14%">年月</th>
        <th width="10%">授業日数</th>
        <th width="12%">出席日数</th>
        <th width="12%">欠席日数</th>
        <th width="12%">遅刻・早退</th>
        <th width="18%">累計出席率</th>
        <th width="22%">月間出席率</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="legend">
    <div class="legend-item">
      <span class="text-notice">■</span> 95%以下
    </div>
    <div class="legend-item">
      <span class="text-caution">■</span> 90%以下
    </div>
    <div class="legend-item">
      <span class="text-warning">■</span> 85%以下
    </div>
    <div class="legend-item">
      <span class="text-danger">■</span> 80%以下
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Serif JP", "Noto Serif CJK JP", "ＭＳ 明朝", "MS Mincho", "游明朝", "Yu Mincho", serif;
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
    <div class="summary-item" style="border: 2px solid #000; padding: 5px 15px;">
        <div style="font-size: 11pt;">総合評定</div>
        <div style="margin-top:0px; font-size: 20pt; font-weight: bold;">${calculateGrade(report_card_total)}</div>
    </div>
  </div>

  <div class="note">
    <p>＊評価基準： A (80点以上), B (79-60点), C (59-40点), D (39-20点), F (19点以下)</p>
  </div>

  <div class="footer">
    <div class="school-name">神戸外語教育学院</div>

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

/**
 * 期末試験結果通知書 HTMLを生成 (日本語版・公的文書スタイル)
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
      const rate = score / (max || 60);
      if (rate <= 1 / 3) return 'C';
      if (rate <= 2 / 3) return 'B';
      return 'A';
    };

    const getEvalStyle = (val) => {
      if (val === 'A') return 'background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
      if (val === 'B') return 'background-color: #fef9c3; color: #854d0e; border: 1px solid #fef08a;';
      return 'background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca;';
    };

    let subjectRows = '';
    if (finalExam.level === 'N4' || finalExam.level === 'N5') {
      const vocab = reportDetails.subjectCorrectCounts?.['文字・語彙'] || reportDetails.subjectCorrectCounts?.['文字語彙'] || reportDetails.subjectCorrectCounts?.['語彙'] || { correct: 0, total: 0 };
      const grammar = reportDetails.subjectCorrectCounts?.['文法'] || { correct: 0, total: 0 };
      const reading = reportDetails.subjectCorrectCounts?.['読解'] || { correct: 0, total: 0 };
      const combinedScore = (finalExam.vocab || 0) + (finalExam.grammarReading || 0);
      const combinedCorrect = vocab.correct + grammar.correct + reading.correct;
      const combinedTotalQ = vocab.total + grammar.total + reading.total;
      const eStr = getEvalStr(combinedScore, 120);

      subjectRows = `
        <tr>
          <td class="subject-cell">言語知識（文字・語彙・文法）・読解</td>
          <td class="score-cell">${combinedScore} / 120</td>
          <td class="ratio-cell">${combinedCorrect} / ${combinedTotalQ}</td>
          <td class="judge-cell">${finalExam.judgments?.[0] || finalExam.judgments?.[1] || '-'}</td>
          <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(eStr)}">${eStr}</span></td>
        </tr>
      `;
    } else {
      const vocabScore = (finalExam.vocab || 0) + (finalExam.grammar || 0);
      const vocabCounts = reportDetails.subjectCorrectCounts?.['文字・語彙'] || reportDetails.subjectCorrectCounts?.['文字語彙'] || reportDetails.subjectCorrectCounts?.['語彙'] || { correct: 0, total: 0 };
      const grammarCounts = reportDetails.subjectCorrectCounts?.['文法'] || { correct: 0, total: 0 };
      const vCorrect = vocabCounts.correct + grammarCounts.correct;
      const vTotal = vocabCounts.total + grammarCounts.total;
      const vEval = getEvalStr(vocabScore, 60);

      const rScore = finalExam.reading || 0;
      const rCounts = reportDetails.subjectCorrectCounts?.['読解'] || { correct: 0, total: 0 };
      const rEval = getEvalStr(rScore, 60);

      subjectRows = `
        <tr>
          <td class="subject-cell">言語知識（文字・語彙・文法）</td>
          <td class="score-cell">${vocabScore} / 60</td>
          <td class="ratio-cell">${vCorrect} / ${vTotal}</td>
          <td class="judge-cell">${finalExam.judgments?.[0] || '-'}</td>
          <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(vEval)}">${vEval}</span></td>
        </tr>
        <tr>
          <td class="subject-cell">読解</td>
          <td class="score-cell">${rScore} / 60</td>
          <td class="ratio-cell">${rCounts.correct} / ${rCounts.total}</td>
          <td class="judge-cell">${finalExam.judgments?.[1] || '-'}</td>
          <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(rEval)}">${rEval}</span></td>
        </tr>
      `;
    }

    // Listening Row
    const lScore = finalExam.listening || 0;
    const lCounts = reportDetails.subjectCorrectCounts?.['聴解'] || { correct: 0, total: 0 };
    const lEval = getEvalStr(lScore, 60);
    const lJudgeIdx = (finalExam.level === 'N4' || finalExam.level === 'N5') ? 1 : 2;

    subjectRows += `
      <tr>
        <td class="subject-cell">聴解</td>
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
    const vC = counts['文字・語彙'] || counts['文字語彙'] || counts['語彙'] || { correct: 0, total: 0 };
    const gC = counts['文法'] || { correct: 0, total: 0 };
    const rC = counts['読解'] || { correct: 0, total: 0 };
    const lC = counts['聴解'] || { correct: 0, total: 0 };
    const allC = vC.correct + gC.correct + rC.correct + lC.correct;
    const allT = vC.total + gC.total + rC.total + lC.total;

    subjectRows += `
      <tr class="total-row">
        <td class="subject-cell">合計</td>
        <td class="score-cell">${totalScore} / 180</td>
        <td class="ratio-cell">${allC} / ${allT}</td>
        <td class="judge-cell">${finalExam.result === '合' || finalExam.result === '○' ? '合格' : '不合格'}</td>
        <td class="eval-cell"><span class="eval-badge" style="${getEvalStyle(totalEval)}">${totalEval}</span></td>
      </tr>
    `;

    // Answer Details HTML
    let detailsHtml = '';
    if (reportDetails.answerDetails && reportDetails.answerDetails.length > 0) {
      const categories = ['文字・語彙', '文法', '読解', '聴解'];
      detailsHtml = categories.map(sub => {
        const subDetails = reportDetails.answerDetails.filter(d => {
          if (sub === '文字・語彙') return d.subject === '文字・語彙' || d.subject === '文字語彙' || d.subject === '語彙';
          return d.subject === sub;
        });
        if (subDetails.length === 0) return '';

        const catCounts = sub === '文字・語彙'
          ? (reportDetails.subjectCorrectCounts?.['文字・語彙'] || reportDetails.subjectCorrectCounts?.['文字語彙'] || reportDetails.subjectCorrectCounts?.['語彙'])
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
  <title>JLPT模擬試験結果</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Sans JP", sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #334155;
      background: #fff;
    }
    
    .header-info {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        font-size: 0.9rem;
    }
    .header-info table { width: 100%; border: none; }
    .header-info td { border: none; padding: 2px 0; text-align: left; font-size: 8.5pt; color: #475569; }
    .header-info strong { color: #334155; }

    .main-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 15px 20px;
        border-left: 5px solid ${finalExam.result === '合' || finalExam.result === '○' ? '#10b981' : '#ef4444'};
        background-color: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border-radius: 0 8px 8px 0;
        margin-bottom: 25px;
    }
    .student-data { flex: 1; }
    .class-name { font-size: 8.5pt; color: #64748b; margin-bottom: 4px; }
    .student-name { font-size: 16pt; font-weight: bold; color: #1e293b; margin: 0; }
    .student-id { font-size: 10pt; color: #64748b; font-weight: normal; margin-left: 8px; }
    .exam-name { font-size: 9pt; color: #6b7280; margin-top: 4px; }

    .result-tiles { display: flex; gap: 12px; }
    .tile {
        text-align: center;
        padding: 10px 18px;
        border-radius: 8px;
        min-width: 100px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .score-tile { background-color: #fff; border: 1px solid #e2e8f0; }
    .judge-tile { 
        background-color: ${finalExam.result === '合' || finalExam.result === '○' ? '#f0fdf4' : '#fef2f2'};
        border: 1px solid ${finalExam.result === '合' || finalExam.result === '○' ? '#10b981' : '#ef4444'};
    }
    .tile-label { font-size: 7.5pt; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .score-tile .tile-label { color: #64748b; }
    .judge-tile .tile-label { color: ${finalExam.result === '合' || finalExam.result === '○' ? '#166534' : '#991b1b'}; }
    .tile-value { font-size: 14pt; font-weight: bold; }
    .result-text { font-size: 14pt; font-weight: 800; color: ${finalExam.result === '合' || finalExam.result === '○' ? '#10b981' : '#ef4444'}; }
    .score-sm { font-size: 10pt; color: #64748b; font-weight: normal; }

    .score-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
    }
    .score-table th {
        background-color: #f9fafb;
        padding: 10px;
        font-size: 9pt;
        font-weight: 600;
        border: 1px solid #e5e7eb;
        text-align: left;
    }
    .score-table td {
        padding: 12px 10px;
        font-size: 9.5pt;
        border: 1px solid #e5e7eb;
    }
    .subject-cell { font-weight: 500; width: 35%; }
    .score-cell { text-align: right; width: 20%; font-weight: 600; }
    .ratio-cell { text-align: center; width: 15%; color: #475569; }
    .judge-cell { text-align: center; width: 15%; font-weight: 600; }
    .eval-cell { text-align: center; width: 15%; }
    
    .eval-badge {
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 8pt;
        font-weight: 700;
        display: inline-block;
    }
    .total-row { background-color: #f8fafc; font-weight: bold !important; }

    .answer-details {
        background-color: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
    }
    .details-title { font-size: 11pt; font-weight: bold; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; display: inline-block; }
    .answer-category { margin-bottom: 20px; }
    .answer-category:last-child { margin-bottom: 0; }
    .category-title { font-size: 9.5pt; font-weight: bold; color: #334155; margin-bottom: 10px; padding-left: 8px; border-left: 3px solid #64748b; }
    .category-count { font-size: 8pt; color: #64748b; font-weight: normal; margin-left: 5px; }
    
    .question-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }
    .question-item {
        width: 45px;
        padding: 6px 2px;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        text-align: center;
        background-color: #fff;
    }
    .q-no { font-size: 7.5pt; font-weight: bold; color: #64748b; margin-bottom: 2px; }
    .q-ans { font-size: 9pt; font-weight: 700; color: #1e293b; }
    .q-correct { font-size: 7pt; color: #94a3b8; }
    .correct { background-color: #f0fdf4; border-color: #bbf7d0; }
    .incorrect { background-color: #fef2f2; border-color: #fecaca; }

    .footer-report { margin-top: 20px; text-align: right; font-size: 8pt; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header-info">
      <table>
        <tr>
            <td><strong>レベル:</strong> ${finalExam.level || '-'}</td>
            <td><strong>使用教材:</strong> ${finalExam.textbook || '-'}</td>
            <td><strong>試験名/学期:</strong> ${yearTerm || '-'}</td>
        </tr>
        ${finalExam.levelInfo ? `
        <tr>
            <td><strong>合格点:</strong> ${finalExam.levelInfo.passingScore}点</td>
            <td colspan="2">
                <strong>基準点:</strong> ${finalExam.levelInfo.criteria1Name}(${finalExam.levelInfo.criteria1Score})
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
            <div class="tile-label">合計点</div>
            <div class="tile-value">${totalScore}点 <span class="score-sm">/ 180</span></div>
        </div>
        <div class="tile judge-tile">
            <div class="tile-label">判定</div>
            <div class="result-text">${finalExam.result === '合' || finalExam.result === '○' ? '合格' : '不合格'}</div>
        </div>
    </div>
  </div>

  <table class="score-table">
    <thead>
        <tr>
            <th>科目</th>
            <th style="text-align:right">得点</th>
            <th style="text-align:center">正答数</th>
            <th style="text-align:center">判定</th>
            <th style="text-align:center">評価</th>
        </tr>
    </thead>
    <tbody>
        ${subjectRows}
    </tbody>
  </table>

  ${detailsHtml ? `
  <div class="answer-details">
    <h3 class="details-title">解答詳細</h3>
    ${detailsHtml}
  </div>
  ` : ''}

  <div class="footer-report">
    神戸外語教育学院 | 発行日: ${today}
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
    'vocab': '文字・語彙',
    'grammar': '文法',
    'reading': '読解',
    'listening': '聴解',
    'writing': '作文',
    'conversation': '会話'
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
  <title>期末試験結果通知書</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Serif JP", "Noto Serif CJK JP", "ＭＳ 明朝", "MS Mincho", "游明朝", "Yu Mincho", serif;
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
      font-family: "Noto Serif CJK JP", "Noto Serif JP", "ＭＳ ゴシック", "MS Gothic", sans-serif;
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
    .school-name { font-size: 16pt; font-weight: bold; margin-bottom: 5px; font-family: "Noto Serif CJK JP", "Noto Serif JP", "ＭＳ ゴシック", "MS Gothic", sans-serif; }
    .bold { font-weight: bold; }
    .note { margin-top: 2mm; font-size: 9pt; }
  </style>
</head>
<body>
  <div class="header-area">
      <div class="date-right">発行日：${today}</div>
      <h1>期末試験結果通知書</h1>
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
  <div style="margin-bottom: 3mm; font-size: 10.5pt;">今学期の期末試験の結果を下記の通り通知致します。</div>
  <table class="grade-table">
    <thead>
      <tr>
        <th width="25%">科目</th>
        <th width="25%">満点</th>
        <th width="25%">得点</th>
        <th width="25%">評価</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>
  <div class="summary-section">
    <div class="summary-item">
        <div>総得点</div>
        <div><span class="summary-val">${final_exam_total}</span> / 600</div>
    </div>
    <div class="summary-item">
        <div>6科目平均</div>
        <div><span class="summary-val">${(final_exam_total / 6).toFixed(1)}</span> / 100</div>
    </div>
    <div class="summary-item" style="border: 2px solid #000; padding: 5px 15px;">
        <div style="font-size: 11pt;">総合判定</div>
        <div style="margin-top:0px; font-size: 20pt; font-weight: bold;">${calculateTotalGrade(final_exam_total)}</div>
    </div>
  </div>
  <div class="note">
    <p>＊評価基準： A (80点以上), B (79-60点), C (59-40点), D (39-20点), F (19点以下)</p>
  </div>
  <div class="footer"><div class="school-name">神戸外語教育学院</div></div>
</body>
</html>`;
}

/**
 * 期末試験結果PDFを生成
 */
async function generateFinalExamPDF(data, yearTerm, outputPath = null) {
  const html = generateFinalExamHTML(data, yearTerm);
  return await htmlToPdf(html, outputPath);
}

export {
  generateTranscriptHTML,
  htmlToPdf,
  generateTranscriptPDF,
  generateAttendanceHTML,
  generateAttendancePDF,
  generateGradeReportHTML,
  generateGradeReportPDF,
  generateFinalExamHTML,
  generateFinalExamPDF
};
