/**
 * 成績証明書 HTML テンプレート生成
 * PDFサンプルを完璧に再現したフォーマット
 */

/**
 * 成績証明書のHTMLを生成
 * @param {Object} data - 学生データ
 * @param {string} data.studentId - 学籍番号
 * @param {string} data.className - クラス名
 * @param {string} data.nationality - 国籍
 * @param {string} data.name - 氏名
 * @param {string} data.birthDate - 生年月日 (YYYY/MM/DD形式)
 * @param {string} data.gender - 性別
 * @param {string} data.enrollmentDate - 入学年月日 (YYYY/MM/DD形式)
 * @param {string} data.graduationDate - 卒業年月日 (YYYY/MM/DD形式)
 * @param {string} data.graduationStatus - 卒業状態 ('graduated' | 'expected')
 * @param {Object} data.grades - 科目別評価 { 文字語彙: 'A', 文法: 'B', ... }
 * @param {string} data.specialNotes - 特記事項
 * @param {string} issueDate - 発行日 (YYYY年MM月DD日形式)
 * @returns {string} HTML文字列
 */
export function generateTranscriptHTML(data, issueDate) {
  const grades = data.grades || {};
  const subjects = ['文字語彙', '文法', '読解', '聴解', '作文', '会話', '総合'];
  const gradeLetters = ['A', 'B', 'C', 'D', 'F'];

  // 科目ごとの成績行を生成
  const gradeRows = subjects.map(subject => {
    const selectedGrade = grades[subject] || '';
    const gradeCells = gradeLetters.map(letter => {
      const isSelected = selectedGrade === letter;
      return `<td${isSelected ? ' class="selected"' : ''}>${letter}</td>`;
    }).join('');
    return `
        <tr class="grade-section">
          <td class="subject-cell">${subject}</td>
          ${gradeCells}
        </tr>`;
  }).join('');

  // 卒業状態の表示
  const isGraduated = data.graduationStatus === 'graduated';
  const isExpected = data.graduationStatus === 'expected';

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>成績証明書 - ${data.name || ''}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 20mm 18mm 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "ＭＳ 明朝", "MS Mincho", "游明朝", "Yu Mincho", serif;
      font-size: 10pt;
      line-height: 1.25;
      color: #000;
      background-color: #fff;
    }

    .transcript-container {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 20mm;
      margin: 0 auto;
      background: #fff;
    }

    /* タイトル */
    .transcript-title {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      letter-spacing: 0.3em;
      margin-bottom: 14px;
      font-family: "ＭＳ 明朝", "MS Mincho", "游明朝", serif;
    }

    /* 個人情報テーブル */
    .student-info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      table-layout: fixed;
      border: 2px solid #000;
    }

    .student-info-table td {
      border: 1px solid #000;
      padding: 1px 4px;
      vertical-align: middle;
      font-size: 8.5pt;
      height: 20px;
    }

    .student-info-table .label-cell {
      background-color: #fff;
      font-weight: normal;
      text-align: center;
      width: 11%;
      font-size: 7.5pt;
    }

    .student-info-table .value-cell {
      background-color: #fff;
      text-align: center;
      width: 39%;
      font-size: 8.5pt;
    }

    .student-info-table .full-row .label-cell {
      width: 11%;
    }

    .student-info-table .full-row .value-cell {
      width: 89%;
      text-align: left;
      padding-left: 8px;
    }

    /* 卒業見込みの楕円 */
    .graduation-circle {
      display: inline-block;
      border: 1px solid #000;
      border-radius: 50%;
      padding: 0 4px;
    }

    /* 証明文 */
    .certification-text {
      text-align: left;
      margin: 10px 0;
      font-size: 8.5pt;
    }

    /* 成績テーブル */
    .grade-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      border: 2px solid #000;
    }

    .grade-table th,
    .grade-table td {
      border: 1px solid #000;
      padding: 1px 1px;
      text-align: center;
      vertical-align: middle;
      font-size: 8.5pt;
      height: 18px;
    }

    .grade-table th {
      background-color: #fff;
      font-weight: normal;
    }

    .grade-table .subject-header {
      width: 14%;
      border-right: 1px solid #000;
    }

    .grade-table .grade-header {
      width: 86%;
    }

    .grade-table .subject-cell {
      text-align: center;
      font-weight: normal;
      border-right: 1px solid #000;
    }

    .grade-table .grade-section td {
      width: 17.2%;
    }

    .grade-table .grade-section td:first-child {
      width: 14%;
    }

    .grade-table td.selected {
      font-weight: bold;
    }

    /* 特記事項 */
    .grade-table .notes-label-row td {
      text-align: left;
      padding: 1px 5px;
      font-weight: normal;
      height: 18px;
    }

    .grade-table .notes-content-row td {
      height: 38px;
      text-align: left;
      padding: 3px 5px;
      vertical-align: top;
    }

    /* 評価基準 */
    .evaluation-criteria {
      margin-top: 14px;
      font-size: 7.5pt;
      line-height: 1.3;
      text-align: left;
    }

    .evaluation-criteria .criteria-title {
      font-weight: normal;
      margin-bottom: 0;
    }

    .evaluation-criteria .criteria-item {
      display: block;
      margin-left: 0.2em;
    }

    /* 発行元情報 */
    .issuer-info {
      margin-top: 24px;
      text-align: right;
      font-size: 8.5pt;
      line-height: 1.3;
    }

    /* 印刷用 */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .transcript-container {
        width: 100%;
        padding: 0;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="transcript-container">
    <h1 class="transcript-title">成績証明書</h1>

    <table class="student-info-table">
      <tbody>
        <tr>
          <td class="label-cell">学籍番号：</td>
          <td class="value-cell">${data.studentId || ''}</td>
          <td class="label-cell">クラス：</td>
          <td class="value-cell">${data.className || ''}</td>
        </tr>
        <tr>
          <td class="label-cell">国　籍：</td>
          <td class="value-cell">${data.nationality || ''}</td>
          <td class="label-cell">氏　名：</td>
          <td class="value-cell">${data.name || ''}</td>
        </tr>
        <tr>
          <td class="label-cell">生年月日：</td>
          <td class="value-cell">${data.birthDate || ''}</td>
          <td class="label-cell">性　別：</td>
          <td class="value-cell">${data.gender || ''}</td>
        </tr>
        <tr class="full-row">
          <td class="label-cell">入学年月日：</td>
          <td class="value-cell" colspan="3">${data.enrollmentDate || ''}</td>
        </tr>
        <tr class="full-row">
          <td class="label-cell">卒業年月日：</td>
          <td class="value-cell" colspan="3">${data.graduationDate || ''} （ ${isGraduated ? '<span class="graduation-circle">卒業</span>' : '卒業'} ・ ${isExpected ? '<span class="graduation-circle">卒業見込み</span>' : '卒業見込み'} ）</td>
        </tr>
      </tbody>
    </table>

    <p class="certification-text">上記の者の成績は下記の通りであることを証明致します。</p>

    <table class="grade-table">
      <thead>
        <tr>
          <th class="subject-header">科目</th>
          <th colspan="5" class="grade-header">評価</th>
        </tr>
      </thead>
      <tbody>
        ${gradeRows}
        <tr class="notes-label-row">
          <td colspan="6">特記事項</td>
        </tr>
        <tr class="notes-content-row">
          <td colspan="6">${data.specialNotes || ''}</td>
        </tr>
      </tbody>
    </table>

    <div class="evaluation-criteria">
      <div class="criteria-title">＊評価基準　ＡＢＣＤＦの5段階</div>
      <span class="criteria-item">A　80点以上</span>
      <span class="criteria-item">B　79点～70点</span>
      <span class="criteria-item">C　69点～60点</span>
      <span class="criteria-item">D　59点～50点</span>
    </div>

    <div class="issuer-info">
      <div>神戸外語教育学院</div>
      <div>${issueDate || ''}</div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * サンプルデータで成績証明書を生成（テスト用）
 * @returns {string} HTML文字列
 */
export function generateSampleTranscript() {
  const sampleData = {
    studentId: '2404005',
    className: '2-11 クラス',
    nationality: '中国',
    name: 'LIN WEIJIAN',
    birthDate: '2002 / 04 / 11',
    gender: '男',
    enrollmentDate: '2024 / 04 / 01',
    graduationDate: '2026 / 03 / 31',
    graduationStatus: 'expected',
    grades: {
      '文字語彙': 'A',
      '文法': 'B',
      '読解': 'C',
      '聴解': 'B',
      '作文': 'A',
      '会話': 'B',
      '総合': 'B'
    },
    specialNotes: ''
  };

  return generateTranscriptHTML(sampleData, '2026年01月13日');
}

export default {
  generateTranscriptHTML,
  generateSampleTranscript
};
