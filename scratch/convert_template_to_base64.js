const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, '../src/templates/career_survey_template_2025.xlsx');
if (!fs.existsSync(excelPath)) {
    console.error('File not found at:', excelPath);
    process.exit(1);
}

const base64Data = fs.readFileSync(excelPath).toString('base64');
console.log('Base64 length:', base64Data.length);

// 出力JSファイルを作成
const outputJsPath = path.join(__dirname, '../src/templates/career_survey_template_base64.js');
const jsContent = `// Generated automatically. Do not edit directly.
export const careerSurveyTemplateBase64 = "${base64Data}";
`;

fs.writeFileSync(outputJsPath, jsContent);
console.log('Saved Base64 JS to:', outputJsPath);
