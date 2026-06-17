const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const PDFParse = pdf.PDFParse;

const pdfPath = path.join(__dirname, '..', '20260318-mxt_syogai01-100001403_01.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

async function run() {
    const parser = new PDFParse({ data: dataBuffer, verbosity: 0 });
    await parser.load();
    const textResult = await parser.getText();
    console.log('textResult type:', typeof textResult);
    console.log('textResult keys:', Object.keys(textResult || {}));
    console.log('textResult directly:', textResult);
    await parser.destroy();
}

run();
