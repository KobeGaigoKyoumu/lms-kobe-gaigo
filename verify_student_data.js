const XLSX = require('xlsx');
const filename = '成績評価シート_202502_2-1.xlsm';

try {
    const workbook = XLSX.readFile(filename);
    const sheet4Name = workbook.SheetNames[3]; // '総合成績評価'
    const sheet4 = workbook.Sheets[sheet4Name];

    // Find row for ID 2304067
    const range = XLSX.utils.decode_range(sheet4['!ref']);
    let targetRow = -1;

    // Scan column B (Index 1) for ID
    for (let r = range.s.r; r <= range.e.r; r++) {
        const cell = sheet4[XLSX.utils.encode_cell({ c: 1, r })];
        if (cell && (cell.v == 2304067 || cell.w == '2304067')) {
            targetRow = r;
            console.log(`Found ID 2304067 at Row ${r}`);
            break;
        }
    }

    if (targetRow !== -1) {
        // Dump columns 12 to 30
        console.log('--- Data for 2304067 ---');
        const headers = ['Attendance(12)', 'Participation(13)', 'VocabBase(14)', 'VocabTotal(15)', 'ListenBase(16)', 'ListenTotal(17)', 'ReadBase(18)', 'ReadTotal(19)', 'GrammarBase(20)', 'GrammarTotal(21)', 'WritingBase(22)', 'WritingTotal(23)', 'ConvBase(24)', 'ConvTotal(25)', 'OverallTotal(26)', 'OverallRank(27)'];

        let headerIdx = 0;
        for (let c = 12; c <= 27; c++) {
            const cell = sheet4[XLSX.utils.encode_cell({ c, r: targetRow })];
            const val = cell ? cell.v : 'null';
            console.log(`Col ${c} [${headers[headerIdx] || ''}]: ${val}`);
            headerIdx++;
        }
    } else {
        console.log('ID 2304067 not found in Sheet 4');
    }

} catch (e) {
    console.error(e);
}
