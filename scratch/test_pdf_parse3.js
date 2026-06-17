const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const PDFParse = pdf.PDFParse;

const pdfPath = path.join(__dirname, '..', '20260318-mxt_syogai01-100001403_01.pdf');
const dataBuffer = fs.readFileSync(pdfPath);

async function tryLoad(config) {
    const parser = new PDFParse({ verbosity: 0 });
    try {
        console.log('Trying config:', Object.keys(config));
        await parser.load(config);
        console.log('Load Success!');
        const text = await parser.getText();
        console.log('Text extracted! Length:', text.length);
        console.log('Sample text:', text.substring(0, 300));
        await parser.destroy();
        return true;
    } catch (err) {
        console.log('Load Failed:', err.message || err);
        return false;
    }
}

async function run() {
    // 1. try with { data: dataBuffer }
    if (await tryLoad({ data: dataBuffer })) return;
    
    // 2. try with { url: pdfPath }
    if (await tryLoad({ url: pdfPath })) return;

    // 3. try with pdfPath directly (though load probably expects object based on the getDocument error)
    if (await tryLoad(pdfPath)) return;
}

run();
