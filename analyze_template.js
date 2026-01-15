const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'public', 'templates', '成績証明書_テンプレート_fixed_safe.docx');
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);
const xml = zip.file('word/document.xml').asText();

// Search for "卒業見込み" or split versions
console.log('--- Searching for 卒業見込み ---');
if (xml.includes('卒業見込み')) {
    console.log('Found: 卒業見込み (full)');
} else {
    console.log('NOT Found: 卒業見込み (full)');
}

// Check for partial matches
const partials = ['卒業見', '見込み', '卒業　', '　卒業'];
partials.forEach(p => {
    if (xml.includes(p)) {
        console.log(`Found partial: "${p}"`);
    }
});

// Extract all <w:t> contents
const textMatches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
console.log('\n--- All <w:t> text contents containing 卒 or 見 ---');
if (textMatches) {
    textMatches.forEach(m => {
        const text = m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
        if (text.includes('卒') || text.includes('見')) {
            console.log(`"${text}"`);
        }
    });
}
