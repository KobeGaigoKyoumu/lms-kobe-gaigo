const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const PDFParse = pdf.PDFParse;

const pdfPath = path.join(__dirname, '..', '20260318-mxt_syogai01-100001403_01.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

async function tryConstructorConfig(options) {
    try {
        console.log('Trying constructor config keys:', Object.keys(options));
        const parser = new PDFParse({ ...options, verbosity: 0 });
        await parser.load();
        console.log('Load Success!');
        const text = await parser.getText();
        console.log('Text extracted! Length:', text.length);
        console.log('Sample text:', text.substring(0, 300));
        await parser.destroy();
        return true;
    } catch (err) {
        console.log('Failed:', err.message || err);
        return false;
    }
}

async function run() {
    // 1. try with { data: dataBuffer }
    if (await tryConstructorConfig({ data: dataBuffer })) return;

    // 2. try with { data: new Uint8Array(dataBuffer) }
    if (await tryConstructorConfig({ data: new Uint8Array(dataBuffer) })) return;
    
    // 3. try with { url: pdfPath }
    if (await tryConstructorConfig({ url: pdfPath })) return;
}

run();
