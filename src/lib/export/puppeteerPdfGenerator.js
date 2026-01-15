/**
 * 成績証明書 PDF 生成 (Puppeteer版) v2
 * オリジナルPDFを完璧に再現
 */

const fs = require('fs');
const path = require('path');

// Determine environment
// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

async function getBrowser() {
  if (isProduction) {
    // Vercel / Production environment
    const chromium = require('@sparticuz/chromium');
    const puppeteerCore = require('puppeteer-core');

    // Setup for Japanese fonts
    // IPAmjMincho (45MB) is too heavy and local loading is fragile on Vercel.
    // Switching to Noto Serif JP (Regular) via direct GitHub Raw link.
    // This is a standard, reliable, and lighter Mincho-style font.
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
      font-family: "ＭＳ 明朝", "MS Mincho", "游明朝", "Yu Mincho", serif;
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
    
    .info-table .value {
      width: 37%;
      text-align: center;
      white-space: nowrap; /* 改行禁止 */
      overflow: hidden; /* はみ出し防止 (万が一) */
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
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.'); // 2026.01.15形式

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
        <td>${row.year} ${row.month}</td>
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
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Sans CJK JP", "ＭＳ ゴシック", sans-serif;
      font-size: 10pt;
      color: #333;
      padding: 15mm 20mm;
    }
    
    .title-container {
      text-align: center;
      margin-bottom: 5mm;
      padding-top: 10mm;
    }
    h1 {
      display: inline-block;
      font-size: 28pt;
      color: #333;
      font-weight: bold;
      margin: 0;
      letter-spacing: 2px;
    }

    .header-layout {
      position: relative;
      height: 35mm;
      margin-bottom: 5mm;
      border-bottom: 2px solid #333;
    }

    .student-info {
      position: absolute;
      bottom: 2mm;
      left: 0;
      width: 60%;
    }
    .student-info div {
      margin-bottom: 5px;
      font-size: 11pt;
    }
    .student-id { font-weight: bold; font-size: 12pt; margin-bottom: 2px !important; }
    .student-name { font-weight: bold; font-size: 16pt; margin-bottom: 5px !important; }
    .student-class { font-weight: bold; font-size: 12pt; }

    .summary-box {
      position: absolute;
      top: 0;
      right: 0;
      width: 60mm;
      height: 25mm;
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    .summary-header {
      height: 8mm;
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
      height: 17mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .summary-value {
      font-size: 22pt;
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
      margin-top: 5mm;
      font-size: 9.5pt;
    }
    
    .data-table th {
      background-color: #f0f0f0;
      border: 1px solid #999;
      padding: 8px 4px;
      font-weight: normal;
      color: #555;
    }
    
    .data-table td {
      border: 1px solid #ddd;
      border-left: 1px solid #999;
      border-right: 1px solid #999;
      border-bottom: 1px solid #999;
      padding: 6px 4px;
      text-align: center;
      height: 8mm;
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
      margin-top: 5mm;
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

  </style>
</head>
<body>

  <div class="title-container">
    <h1>神戸外語教育学院</h1>
  </div>

  <div class="header-layout">
    <div class="student-info">
      <div class="student-id">${student.id}</div>
      <div class="student-name">${student.name}</div>
      <div class="student-class">${student.className || ''}</div>
    </div>

    <div class="summary-box">
      <div class="summary-header">
        ${latestData.year}年${latestData.month}月出席率<br>${today}
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

</body>
</html>`;
}

// マージデータの作成
const combinedRows = monthlyReversed.map(m => {
  const c = cumulativeReversed.find(cum => cum.year === m.year && cum.month === m.month) || {};
  return {
    year: m.year,
    month: m.month,
    attendance_days: m.attendance_days,
    absence_days: m.absence_days,
    monthly_rate: m.attendance_rate,
    cumulative_rate: c.attendance_rate // 未定義ならundefined
  };
});

// 最新データの年月取得（ボックス表示用）
const latestData = cumulativeReversed.length > 0 ? cumulativeReversed[0] : (monthlyReversed.length > 0 ? monthlyReversed[0] : { year: '----', month: '--' });
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
        <td>${row.year} ${row.month}</td>
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
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Sans CJK JP", "ＭＳ ゴシック", sans-serif;
      font-size: 10pt; /* 少し小さくして収まりよくする */
      color: #333;
      padding: 15mm 20mm; /* 余白調整 */
    }
    
    /* タイトル：赤枠で囲って大きく */
    .title-container {
      text-align: center;
      margin-bottom: 5mm;
      padding-top: 10mm;
    }
    h1 {
      display: inline-block;
      font-size: 28pt;
      color: #333; /* 赤枠の中の文字は黒？ユーザーは「赤で囲った部分に」と言っているが枠線か？文字色か？文脈的に「重要なタイトルエリア」 */
      /* 「赤で囲った部分に大きい文字で」 => 文字も赤にする？いや、学校名は通常黒。枠線を描く？ */
      /* 普通の感覚では目立つタイトルにする。ここでは文字を大きく太く。 */
      /* ユーザー添付画像が見えないので推測。学校名をタイトルにする。 */
      font-weight: bold;
      margin: 0;
      letter-spacing: 2px;
    }

    /* ヘッダー情報レイアウト */
    .header-layout {
      position: relative; /* ボックスを絶対配置するための基準 */
      height: 35mm; /* 高さ確保 */
      margin-bottom: 5mm;
      border-bottom: 2px solid #333; /* 区切り線 */
    }

    /* 学生情報 */
    .student-info {
      position: absolute;
      bottom: 2mm;
      left: 0;
      width: 60%;
    }
    .student-info div {
      margin-bottom: 5px;
      font-size: 11pt;
    }
    .student-id { font-weight: bold; font-size: 12pt; margin-bottom: 2px !important; }
    .student-name { font-weight: bold; font-size: 16pt; margin-bottom: 5px !important; }
    .student-class { font-weight: bold; font-size: 12pt; }

    /* サマリーボックス（右上） */
    .summary-box {
      position: absolute;
      top: 0;
      right: 0;
      width: 60mm; /* 幅 */
      height: 25mm; /* 高さ */
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden; /* 角丸用 */
      background: #fff;
    }
    .summary-header {
      height: 8mm;
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
      height: 17mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .summary-value {
      font-size: 22pt;
      font-weight: bold;
    }

    /* カラー定義 */
    .rate-danger { color: #d32f2f; }
    .rate-warning { color: #f57c00; }
    .rate-caution { color: #fbc02d; }
    .rate-notice { color: #0288d1; }
    .rate-normal { color: #2e7d32; }

    /* データテーブル */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5mm;
      font-size: 9.5pt;
    }
    
    /* ヘッダー装飾 */
    .data-table th {
      background-color: #f0f0f0;
      border: 1px solid #999;
      padding: 8px 4px;
      font-weight: normal; /* 画像では太字でないかも */
      color: #555;
    }
    
    .data-table td {
      border: 1px solid #ddd; /* 縦線は薄く？ */
      border-left: 1px solid #999;
      border-right: 1px solid #999;
      border-bottom: 1px solid #999;
      padding: 6px 4px;
      text-align: center;
      height: 8mm; /* 行の高さ確保 */
    }

    /* 累計列の強調 */
    .col-cumulative {
      background-color: #f9fbfd;
      font-weight: bold;
    }

    /* 背景色（条件付き） */
    .bg-danger { background-color: #ffebee !important; }
    .bg-warning { background-color: #fff3e0 !important; }
    .bg-caution { background-color: #fffde7 !important; }
    .bg-notice { background-color: #e1f5fe !important; }

  </style>
</head>
<body>

  <div class="title-container">
    <h1>神戸外語教育学院</h1>
  </div>

  <div class="header-layout">
    <div class="student-info">
      <div class="student-id">${student.id}</div>
      <div class="student-name">${student.name}</div>
      <div class="student-class">${student.className || ''}</div>
    </div>

    <div class="summary-box">
      <div class="summary-header">
        ${latestData.year}年${latestData.month}月出席率<br>${today}
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

module.exports = {
  generateTranscriptHTML,
  htmlToPdf,
  generateTranscriptPDF,
  generateAttendanceHTML,
  generateAttendancePDF
};
