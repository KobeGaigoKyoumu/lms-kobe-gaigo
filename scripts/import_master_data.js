const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Environment variables
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MASTER_DIR = 'C:/Users/神戸外語03/Desktop/lms-kobe-gaigo';
const CONFIG = [
    { file: '在籍者.xlsx', status: '在籍' },
    { file: '卒業者.xlsx', status: '卒業' },
    { file: '退学者.xlsx', status: '退学' },
    { file: '修了者.xlsx', status: '修了' },
];

/**
 * Excel serial date conversion
 */
function excelDateToISO(serial) {
    if (!serial || isNaN(serial)) return null;
    // Excel dates are days since 1899-12-30
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

/**
 * Helper to get value from row by potential keys
 */
function getValue(row, keys) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
        }
    }
    return null;
}

const STATUS_MAP = {
    '在籍': 'active',
    '卒業': 'graduated',
    '退学': 'withdrawn',
    '修了': 'completed'
};

const CAREER_DIR = 'C:/Users/神戸外語03/Desktop/lms-kobe-gaigo/卒業生進路一覧';

async function run() {
    console.log('Starting master data re-import...');

    // 1. Load Career Data (Destinations)
    const careerMap = new Map();
    if (fs.existsSync(CAREER_DIR)) {
        const careerFiles = fs.readdirSync(CAREER_DIR).filter(f => f.endsWith('.xlsx'));
        console.log(`Found ${careerFiles.length} career files.`);
        for (const file of careerFiles) {
            try {
                const workbook = XLSX.readFile(path.join(CAREER_DIR, file));
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet);
                rows.forEach(row => {
                    const sid = getValue(row, ['学籍番号', 'ID']);
                    const dest = getValue(row, ['進学先', '最終合格校']);
                    if (sid && dest) {
                        careerMap.set(String(sid).trim(), String(dest).trim());
                    }
                });
            } catch (e) {
                console.warn(`Error reading career file ${file}:`, e.message);
            }
        }
    }
    console.log(`Loaded ${careerMap.size} career destinations.`);

    for (const item of CONFIG) {
        const filePath = path.join(MASTER_DIR, item.file);
        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${item.file}`);
            continue;
        }

        console.log(`\nProcessing ${item.file} (Status: ${item.status})...`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`  Found ${rows.length} rows.`);

        const students = rows.map(row => {
            const sid = getValue(row, ['学籍番号', 'ID']);
            if (!sid) return null;

            const name = getValue(row, ['氏名', '氏　名', '名前']);
            if (!name) return null; // Mandatory

            const studentIdText = String(sid).trim();

            return {
                student_id_text: studentIdText,
                full_name: name,
                name_kana: getValue(row, ['カタカナ', 'フリガナ', 'カナ']) || '',
                name_romaji: getValue(row, ['ローマ字', '氏名（ローマ字）']) || '',
                nationality: getValue(row, ['国籍・地域', '国籍', '出身国']) || '不明',
                gender: getValue(row, ['性別']) || '不明',
                birth_date: excelDateToISO(getValue(row, ['生年月日'])) || '1900-01-01',
                visa_status: getValue(row, ['在留資格']) || 'なし',
                entry_date: excelDateToISO(getValue(row, ['入国日'])) || '1900-01-01',
                visa_expiry: excelDateToISO(getValue(row, ['在留期限'])) || '1900-01-01',
                passport_number: getValue(row, ['パスポート番号', 'パスポート\r\n番号', 'パスポート\n番号']) || '',
                residence_card_number: getValue(row, ['在留カード番号', '在留カード\r\n番号', '在留カード\n番号']) || '',
                address: getValue(row, ['住所']) || '不明',
                phone: getValue(row, ['連絡方法', '電話番号', '連絡先']) || '',
                enrollment_period: getValue(row, ['期']) || '',
                class_name: getValue(row, ['現クラス', '現\r\nクラス', '現\nクラス']) || '',
                enrollment_date: excelDateToISO(getValue(row, ['入学年月日'])) || '1900-01-01',
                graduation_date: excelDateToISO(getValue(row, ['卒業年月', '卒業日'])),
                course: getValue(row, ['コース']),
                academic_year: parseInt(studentIdText.substring(0, 2)) + 2000 || new Date().getFullYear(),
                status: STATUS_MAP[item.status] || 'inactive',
                destination: careerMap.get(studentIdText) || null,
                updated_at: new Date().toISOString()
            };
        }).filter(Boolean);

        console.log(`  Upserting ${students.length} students...`);

        // Batch upsert (Supabase handles upsert by primary key or unique index)
        // Table unique index is likely student_id_text
        const batchSize = 100;
        for (let i = 0; i < students.length; i += batchSize) {
            const batch = students.slice(i, i + batchSize);
            const { error } = await supabase
                .from('students')
                .upsert(batch, { onConflict: 'student_id_text' });

            if (error) {
                console.error('\nFull error object:', error);
                console.error(`\n  Error in batch ${i / batchSize}:`, error.message);
                console.error(`  Details:`, error.details);
                console.error(`  Hint:`, error.hint);
                // Log the first item of the failed batch for debugging
                console.log('  Failed sample item:', JSON.stringify(batch[0], null, 2));
            } else {
                process.stdout.write('.');
            }
        }
        console.log('\n  Done.');
    }

    console.log('\nAll master data updated successfully.');
}

run();
