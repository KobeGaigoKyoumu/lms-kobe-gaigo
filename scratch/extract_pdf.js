const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const PDFParse = pdf.PDFParse;

const pdfPath = path.join(__dirname, '..', '20260318-mxt_syogai01-100001403_01.pdf');
const outputPath = path.join(__dirname, '..', 'scratch', 'pdf_text.txt');

if (!fs.existsSync(pdfPath)) {
    console.error("PDF file not found at:", pdfPath);
    process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

async function run() {
    try {
        const parser = new PDFParse({ data: dataBuffer, verbosity: 0 });
        console.log("Loading PDF...");
        await parser.load();
        console.log("Extracting text...");
        const text = await parser.getText();
        
        fs.writeFileSync(outputPath, text.text || '');
        console.log("PDF text extracted successfully! Total characters:", text.length);
        console.log("Output saved to:", outputPath);
        
        await parser.destroy();
    } catch (err) {
        console.error("PDF Parsing Error:", err);
    }
}

run();

