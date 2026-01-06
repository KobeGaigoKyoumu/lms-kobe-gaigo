const XLSX = require('xlsx');
const filename = '成績評価シート_202502_2-1.xlsm';

try {
    const workbook = XLSX.readFile(filename);
    const sheetNames = workbook.SheetNames;
    console.log('Sheet Names:', sheetNames);

    if (sheetNames.length > 4) {
        const sheet5Name = sheetNames[4]; // Index 4 (5th sheet)
        console.log('Sheet 5 Name:', sheet5Name);
        const sheet5 = workbook.Sheets[sheet5Name];

        // Dump first 20 rows and 10 columns to understand structure
        const range = XLSX.utils.decode_range(sheet5['!ref']);
        console.log(`Range: R${range.s.r}C${range.s.c} to R${range.e.r}C${range.e.c}`);

        for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
            let rowStr = `Row ${r}: `;
            for (let c = 0; c <= Math.min(range.e.c, 10); c++) {
                const cell = sheet5[XLSX.utils.encode_cell({ c, r })];
                rowStr += (cell ? cell.v : '[null]') + '\t';
            }
            console.log(rowStr);
        }
    } else {
        console.log('Sheet 5 does not exist.');
    }

} catch (e) {
    console.error(e);
}
