const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTemplateStructure() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.join(__dirname, '../public/templates/全学生進路希望調査票2025.xlsx'));
    const ws = workbook.getWorksheet('2025');
    
    console.log('=== Inspecting Template Sheet Rows ===');
    for (let r = 15; r <= 24; r++) {
        const row = ws.getRow(r);
        const cellA = ws.getCell(r, 1);
        const cellF = ws.getCell(r, 6);
        console.log(`Row ${r}:`);
        console.log(`  A${r} value: "${cellA.value}" (type: ${typeof cellA.value}), master: ${cellA.isMerged ? cellA.master.address : 'no'}`);
        console.log(`  F${r} value: "${cellF.value}" (type: ${typeof cellF.value}), master: ${cellF.isMerged ? cellF.master.address : 'no'}`);
        console.log(`  Row height: ${row.height}`);
    }

    console.log('\n=== Merges in rows 15-24 ===');
    // exceljs での結合情報の確認
    ws.eachRow((row, rowNumber) => {
        if (rowNumber >= 15 && rowNumber <= 24) {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (cell.isMerged && cell.address === cell.master.address) {
                    console.log(`  Merged Range starting at ${cell.address}`);
                }
            });
        }
    });
}

inspectTemplateStructure().catch(console.error);
