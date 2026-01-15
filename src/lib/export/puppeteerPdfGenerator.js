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
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const ratePercent = (currentStats.rate * 100).toFixed(1);

  // 評価ボックスの色
  let rateClass = 'rate-normal';
  if (currentStats.rate <= 0.80) rateClass = 'rate-danger';
  else if (currentStats.rate <= 0.85) rateClass = 'rate-warning';
  else if (currentStats.rate <= 0.90) rateClass = 'rate-caution';
  else if (currentStats.rate <= 0.95) rateClass = 'rate-notice';

  // 月別データの行生成
  // 最新順になっているはずだが、表は時系列（古い順）の方が見やすいかもしれない。
  // ここでは受け取った順序（Frontendで表示されている順序）に従うが、
  // 通常履歴は「新しい順」か「古い順」か。個票なら時系列（昇順）が自然。
  // history.monthlyData は通常新しい順で来ているなら、reverse() する。
  const rows = [...(history.monthlyData || [])].reverse().map(row => {
    const rate = row.attendance_rate;
    let rowClass = '';
    if (rate <= 0.80) rowClass = 'bg-danger';
    else if (rate <= 0.85) rowClass = 'bg-warning';
    else if (rate <= 0.90) rowClass = 'bg-caution';
    else if (rate <= 0.95) rowClass = 'bg-notice';

    return `
      <tr class="${rowClass}">
        <td>${row.year}年 ${row.month}月</td>
        <td>${row.attendance_days}</td>
        <td>${row.absence_days}</td>
        <td>${(rate * 100).toFixed(1)}%</td>
      </tr>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>出席状況個票</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Noto Sans CJK JP", "ＭＳ ゴシック", sans-serif; /* ゴシック系優先 */
      font-size: 11pt;
      color: #333;
      padding: 20mm;
    }
    h1 {
      text-align: center;
      font-size: 24pt;
      margin-bottom: 10mm;
      border-bottom: 2px solid #333;
      padding-bottom: 5mm;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10mm;
    }
    .student-info {
      width: 60%;
    }
    .student-info table {
      width: 100%;
      border-collapse: collapse;
    }
    .student-info th, .student-info td {
      text-align: left;
      padding: 5px;
      font-size: 12pt;
    }
    .student-info th { width: 30%; font-weight: normal; color: #666; }
    .student-info td { font-weight: bold; font-size: 14pt; }

    .summary-box {
      width: 35%;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      background-color: #f9f9f9;
    }
    .summary-label { font-size: 10pt; margin-bottom: 5px; color: #555; }
    .summary-value { font-size: 28pt; font-weight: bold; }
    
    .rate-danger { color: #d32f2f; }
    .rate-warning { color: #f57c00; }
    .rate-caution { color: #fbc02d; }
    .rate-notice { color: #0288d1; }
    .rate-normal { color: #2e7d32; }

    table.history-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10mm;
    }
    .history-table th, .history-table td {
      border: 1px solid #999;
      padding: 10px;
      text-align: center;
    }
    .history-table th {
      background-color: #eee;
      font-weight: bold;
    }

    /* Conditional Formatting Backgrounds */
    .bg-danger { background-color: #ffcdd2; } /* <= 80% */
    .bg-warning { background-color: #ffe0b2; } /* <= 85% */
    .bg-caution { background-color: #fff9c4; } /* <= 90% */
    .bg-notice { background-color: #e1f5fe; } /* <= 95% */

    .footer {
      margin-top: 20mm;
      text-align: right;
      font-size: 10pt;
      color: #777;
    }
  </style>
</head>
<body>
  <h1>出席状況個票</h1>

  <div class="header-info">
    <div class="student-info">
      <table>
        <tr><th>学籍番号</th><td>${student.id}</td></tr>
        <tr><th>氏名</th><td>${student.name}</td></tr>
        <tr><th>クラス</th><td>${student.className || '未設定'}</td></tr>
      </table>
    </div>
    <div class="summary-box">
      <div class="summary-label">現在の累計出席率</div>
      <div class="summary-value ${rateClass}">${ratePercent}%</div>
    </div>
  </div>

  <table class="history-table">
    <thead>
      <tr>
        <th>年月</th>
        <th>出席日数</th>
        <th>欠席日数</th>
        <th>出席率</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    発行日: ${today}
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

module.exports = {
  generateTranscriptHTML,
  htmlToPdf,
  generateTranscriptPDF,
  generateAttendanceHTML,
  generateAttendancePDF
};
