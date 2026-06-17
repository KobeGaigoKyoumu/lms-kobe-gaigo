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
    console.log('Type of textResult:', typeof textResult);
    console.log('Constructor name of textResult:', textResult.constructor.name);
    console.log('Keys of textResult:', Object.keys(textResult).slice(0, 10));
    
    // JSON.stringifyを試す
    try {
        const jsonStr = JSON.stringify(textResult);
        console.log('JSON.stringify length:', jsonStr.length);
        console.log('JSON sample:', jsonStr.substring(0, 200));
    } catch(e) {
        console.log('JSON.stringify failed:', e.message);
    }
    
    await parser.destroy();
}

run();
