const XLSX = require('xlsx');
const path = require('path');

function readExcel() {
  const filePath = path.join(__dirname, '..', '2026年＿学生入試アンケート （回答）.xlsx');
  console.log('Reading file:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  console.log('Sheets:', sheetNames);
  
  sheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    
    // Print range
    console.log('Range:', sheet['!ref']);
    
    // Print headers from row 1
    const range = XLSX.utils.decode_range(sheet['!ref']);
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = sheet[cellRef];
      headers.push(cell ? cell.v : '');
    }
    console.log('Headers (Row 1):', headers);
    
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log('Total Rows (sheet_to_json):', data.length);
  });
}

readExcel();

readExcel();
