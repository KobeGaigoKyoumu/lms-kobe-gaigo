/**
 * CSV Structure Inspector
 * Inspects CSV file headers and first few rows to verify column mapping
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const filePath = path.join(process.cwd(), 'data', 'JLPT結果', '2024年第1回', 'N2.csv');

try {
    const buffer = fs.readFileSync(filePath);
    const content = iconv.decode(buffer, 'Shift_JIS');
    const lines = content.split(/\r?\n/);

    console.log("=== CSV Structure Analysis ===\n");
    console.log("File:", filePath);
    console.log("Total lines:", lines.length);
    console.log("");

    // Parse and display header
    function parseCSVLine(line) {
        const parts = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);
        return parts.map(p => p.replace(/^"|"$/g, '').trim());
    }

    console.log("=== Header Row (Line 1) ===");
    const header = parseCSVLine(lines[0]);
    header.forEach((col, idx) => {
        console.log(`  [${idx}]: "${col}"`);
    });

    console.log("\n=== Sample Data Rows ===");
    for (let i = 1; i <= 3 && i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        console.log(`\n--- Row ${i} ---`);
        const row = parseCSVLine(lines[i]);

        // Focus on key columns
        console.log(`  [0] ${header[0] || 'Col0'}: "${row[0]}"`);
        console.log(`  [1] ${header[1] || 'Col1'}: "${row[1]}"`);
        console.log(`  [2] ${header[2] || 'Col2'}: "${row[2]}"`);
        console.log(`  [8] ${header[8] || 'Col8'}: "${row[8]}" <-- RESULT COLUMN`);
        console.log(`  [9] ${header[9] || 'Col9'}: "${row[9]}" <-- SCORE COLUMN`);

        // Check if result is correctly identified
        const expectedResult = row[8] === '合格' || row[8] === '不合格';
        console.log(`  Result parsing check: ${expectedResult ? '✓ VALID' : '✗ INVALID (unexpected value)'}`);
    }

    // Count pass/fail in this file
    console.log("\n=== File Statistics ===");
    let total = 0, passed = 0, failed = 0, invalid = 0;

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const row = parseCSVLine(lines[i]);
        if (row.length < 10) continue;

        total++;
        const result = row[8];
        if (result === '合格') passed++;
        else if (result === '不合格') failed++;
        else invalid++;
    }

    console.log(`Total rows: ${total}`);
    console.log(`合格 (Pass): ${passed}`);
    console.log(`不合格 (Fail): ${failed}`);
    console.log(`Invalid results: ${invalid}`);
    console.log(`Pass rate: ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%`);

} catch (e) {
    console.error("Error:", e);
}
