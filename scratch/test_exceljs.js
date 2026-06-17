const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { careerSurveyTemplateBase64 } = require('../src/templates/career_survey_template_base64');

async function testExcelJS() {
    console.log('=== ExcelJS Logic Test ===');
    try {
        const workbook = new ExcelJS.Workbook();
        const buffer = Buffer.from(careerSurveyTemplateBase64, 'base64');
        console.log('Template Base64 buffer size:', buffer.length);
        
        await workbook.xlsx.load(buffer);
        console.log('Workbook loaded successfully!');
        
        const ws1 = workbook.getWorksheet('2025');
        const ws2 = workbook.getWorksheet('名簿2025');
        
        console.log('ws1 exists:', !!ws1, 'rowCount:', ws1.rowCount);
        console.log('ws2 exists:', !!ws2, 'rowCount:', ws2.rowCount);
        
        const N = 2; // テスト用2名
        
        // テストデータ書き込み
        for (let targetIdx = 0; targetIdx < N; targetIdx++) {
            const startRow = targetIdx * 24;
            
            // クラス (C2) -> Row: startRow + 2, Col: 3
            ws1.getCell(startRow + 2, 3).value = '2-13';
            // 氏名 (F2) -> Row: startRow + 2, Col: 6
            ws1.getCell(startRow + 2, 6).value = 'ZHANG YEHAO ' + (targetIdx + 1);
            // 出席番号 (Q1) -> Row: startRow + 1, Col: 17
            ws1.getCell(startRow + 1, 17).value = targetIdx + 1;
            // 記入日 (N2) -> Row: startRow + 2, Col: 14
            ws1.getCell(startRow + 2, 14).value = '2026/06/05';
            
            // 希望校など
            ws1.getCell(startRow + 5, 6).value = '関西大学';
            ws1.getCell(startRow + 5, 13).value = '理由ですよ';
        }
        
        // 不要な行を削除
        if (ws1.rowCount > N * 24) {
            ws1.spliceRows(N * 24 + 1, ws1.rowCount - N * 24);
        }
        console.log('After splice ws1 rowCount:', ws1.rowCount);
        
        // 名簿シート書き込み
        for (let targetIdx = 0; targetIdx < N; targetIdx++) {
            ws2.getCell(targetIdx + 1, 1).value = '260400' + targetIdx;
            ws2.getCell(targetIdx + 1, 2).value = '2-13';
            ws2.getCell(targetIdx + 1, 3).value = targetIdx + 1;
            ws2.getCell(targetIdx + 1, 4).value = 'ZHANG YEHAO ' + (targetIdx + 1);
        }
        
        if (ws2.rowCount > N) {
            ws2.spliceRows(N + 1, ws2.rowCount - N);
        }
        console.log('After splice ws2 rowCount:', ws2.rowCount);
        
        // 書き出し
        const outBuffer = await workbook.xlsx.writeBuffer();
        console.log('Output Buffer size:', outBuffer.length);
        
        const testOutPath = path.join(__dirname, 'test_exceljs_output.xlsx');
        fs.writeFileSync(testOutPath, outBuffer);
        console.log('Saved test exceljs output to:', testOutPath);
        console.log('=== SUCCESS ===');
    } catch (e) {
        console.error('ERROR:', e.message);
        console.error(e.stack);
    }
}

testExcelJS();
