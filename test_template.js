const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');
const { applyGraduationCircle } = require('./src/lib/export/wordStyleApplicator');

const templatePath = path.join(__dirname, 'public', 'templates', '成績証明書_テンプレート_fixed_safe.docx');
const content = fs.readFileSync(templatePath);

console.log('--- Testing with ACTUAL template ---\n');

// Test 'expected' (卒業見込み)
console.log('=== Test: expected ===');
const outBuffer = applyGraduationCircle(content, 'expected');
const outZip = new PizZip(outBuffer);
const outXml = outZip.file('word/document.xml').asText();

if (outXml.includes('<v:oval')) {
    console.log('SUCCESS: <v:oval> found for "expected".');
    const ovalMatch = outXml.match(/<v:oval[^>]*\/>/);
    if (ovalMatch) console.log('Oval:', ovalMatch[0]);
} else {
    console.error('FAILURE: <v:oval> not found for "expected".');
}

// Test 'graduated' (卒業)
console.log('\n=== Test: graduated ===');
const outBuffer2 = applyGraduationCircle(content, 'graduated');
const outZip2 = new PizZip(outBuffer2);
const outXml2 = outZip2.file('word/document.xml').asText();

if (outXml2.includes('<v:oval')) {
    console.log('SUCCESS: <v:oval> found for "graduated".');
    const ovalMatch2 = outXml2.match(/<v:oval[^>]*\/>/);
    if (ovalMatch2) console.log('Oval:', ovalMatch2[0]);
} else {
    console.error('FAILURE: <v:oval> not found for "graduated".');
}
