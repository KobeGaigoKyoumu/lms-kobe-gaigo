const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const iconv = require('iconv-lite');
const envPath = path.join(process.cwd(), '.env.local');
console.log('Attempting to load env from:', envPath);
console.log('Env file exists:', fs.existsSync(envPath));

require('dotenv').config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL linked:', !!supabaseUrl);
console.log('Supabase Key linked:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials - check your .env.local file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const JLPT_BASE_DIR = path.join(process.cwd(), 'data', 'JLPT結果');
const JLPT_HISTORICAL_JSON = path.join(process.cwd(), 'data', 'jlpt_historical.json');

function parseLine(line) {
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

    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
    if (cleanParts.length < 10) return null;

    const level = cleanParts[2];
    const result = {
        examName: cleanParts[1],
        level: level,
        id: cleanParts[3],
        name: cleanParts[4],
        country: cleanParts[5],
        result: cleanParts[8],
        totalScore: cleanParts[9],
    };

    if (level) {
        if (/^N[1-3]$/.test(level)) {
            result.sectionScores = {
                knowledge: cleanParts[12],
                reading: cleanParts[14],
                listening: cleanParts[16]
            };
            result.referenceInfo = {
                vocabulary: { grade: cleanParts[22], name: cleanParts[21] },
                grammar: { grade: cleanParts[24], name: cleanParts[23] }
            };
        } else if (/^N[4-5]$/.test(level)) {
            result.sectionScores = {
                knowledge: cleanParts[12],
                reading: '-',
                listening: cleanParts[14]
            };
            result.referenceInfo = {
                vocabulary: { grade: cleanParts[22], name: cleanParts[21] },
                grammar: { grade: cleanParts[24], name: cleanParts[23] }
            };
        }
    }
    return result;
}

async function runMigration() {
    console.log('Starting migration of JLPT data to Supabase...');

    let allRecords = [];

    // 1. Load JSON Historical Data
    if (fs.existsSync(JLPT_HISTORICAL_JSON)) {
        const content = fs.readFileSync(JLPT_HISTORICAL_JSON, 'utf-8');
        const data = JSON.parse(content);
        if (data.records && Array.isArray(data.records)) {
            console.log(`Found ${data.records.length} records in JSON`);
            data.records.forEach(r => {
                allRecords.push({
                    student_id_text: String(r.studentId || r.id),
                    student_name: r.name,
                    class_name: 'Historical',
                    year_term: `JLPT ${r.session}`,
                    final_exam_data: {
                        level: r.level,
                        result: r.result,
                        total: r.score,
                        type: 'JLPT',
                        session: r.session,
                        country: r.country
                    },
                    report_card_data: {},
                    final_exam_total: r.score,
                    report_card_total: 0
                });
            });
        }
    }

    // 2. Load CSV Data
    if (fs.existsSync(JLPT_BASE_DIR)) {
        const sessions = fs.readdirSync(JLPT_BASE_DIR).filter(d => fs.statSync(path.join(JLPT_BASE_DIR, d)).isDirectory());
        console.log(`Found ${sessions.length} session directories in CSV`);

        for (const session of sessions) {
            const sessionDir = path.join(JLPT_BASE_DIR, session);
            const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.csv'));

            for (const file of files) {
                const filePath = path.join(sessionDir, file);
                const buffer = fs.readFileSync(filePath);
                const content = iconv.decode(buffer, 'Shift_JIS');
                const lines = content.split(/\r?\n/).slice(1).filter(l => l.trim().length > 0);

                for (const line of lines) {
                    const parsed = parseLine(line);
                    if (parsed) {
                        const scoreNum = parseInt(parsed.totalScore.split('/')[0]) || 0;
                        allRecords.push({
                            student_id_text: String(parsed.id),
                            student_name: parsed.name,
                            class_name: 'CSV_Import',
                            year_term: `JLPT ${session}`,
                            final_exam_data: {
                                level: parsed.level,
                                result: parsed.result,
                                total: scoreNum,
                                totalScoreRaw: parsed.totalScore,
                                type: 'JLPT',
                                session: session,
                                country: parsed.country,
                                sectionScores: parsed.sectionScores,
                                referenceInfo: parsed.referenceInfo
                            },
                            report_card_data: {},
                            final_exam_total: scoreNum,
                            report_card_total: 0
                        });
                    }
                }
            }
        }
    }

    console.log(`Total records to upsert: ${allRecords.length}`);

    // Batch upsert (Supabase has a limit, so we chunk it)
    const CHUNK_SIZE = 100;
    for (let i = 0; i < allRecords.length; i += CHUNK_SIZE) {
        const chunk = allRecords.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
            .from('grade_records')
            .upsert(chunk, { onConflict: 'student_id_text, year_term' });

        if (error) {
            console.error(`Error upserting chunk ${i / CHUNK_SIZE}:`, error);
        } else {
            console.log(`Uploaded chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(allRecords.length / CHUNK_SIZE)}`);
        }
    }

    console.log('Migration completed.');
}

runMigration().catch(console.error);
