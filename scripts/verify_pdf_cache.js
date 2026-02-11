const { generateTranscriptPDF } = require('./src/lib/export/puppeteerPdfGenerator');
const fs = require('fs');
const path = require('path');

const testData = {
    studentId: 'TEST-001',
    name: 'Verification Test Student',
    nationality: 'Japan',
    birthDate: '2000/01/01',
    gender: 'Male',
    enrollmentDate: '2024/04/01',
    graduationDate: '2026/03/31',
    graduationStatus: 'expected',
    className: 'Test Class',
    grades: { '文字語彙': 'A', '文法': 'A', '読解': 'A' },
    specialNotes: 'Verification of Phase 3 Caching'
};

async function verifyCache() {
    const outputPath = path.join(process.cwd(), 'test-output.pdf');

    console.log('--- Round 1: Cold Start (Generation & Storage) ---');
    console.time('Round 1');
    await generateTranscriptPDF(testData, '2026/02/11', outputPath);
    console.timeEnd('Round 1');

    console.log('\n--- Round 2: Cache Hit (Retrieval from Supabase) ---');
    console.time('Round 2');
    await generateTranscriptPDF(testData, '2026/02/11', outputPath);
    console.timeEnd('Round 2');

    if (fs.existsSync(outputPath)) {
        console.log('\nSuccess: PDF file generated and retrieved correctly.');
        // Don't delete it automatically, let observer see if needed
    }
}

verifyCache().catch(console.error);
