
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ATTENDANCE_DIR = 'c:/Users/神戸外語03/Desktop/lms-kobe-gaigo/出席率'
const TARGET_FILE = '2025年4月累計.xlsx'

async function main() {
    console.log(`Debug Import: ${TARGET_FILE}`)

    // 1. Read File
    const filepath = path.join(ATTENDANCE_DIR, TARGET_FILE)
    const workbook = XLSX.readFile(filepath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    console.log(`Excel Rows: ${data.length}`)

    // 2. Prepare Records (Simplified)
    const records = []
    for (let i = 3; i < data.length; i++) {
        const row = data[i]
        if (row && row[2]) {
            const sid = String(row[2]).trim();
            // Skip if not number
            if (!/^\d+$/.test(sid)) {
                // console.log(`Skipping non-number ID: ${sid}`);
                continue;
            }

            records.push({
                student_id: sid,
                year: 2025,
                month: 4,
                is_cumulative: true,
                attendance_rate: 0, // Dummy
                student_name: 'Debug',
                attendance_days: 0,
                absence_days: 0,
                attendance_slots: 0,
                late_slots: 0,
                absence_slots: 0,
                grade: 1,
                class_code: 'Debug'
            })
        }
    }
    console.log(`Parsed Records: ${records.length}`)

    // 3. Delete
    console.log('Deleting existing...')
    const { error: delErr } = await supabase
        .from('attendance_records')
        .delete()
        .eq('year', 2025)
        .eq('month', 4)
        .eq('is_cumulative', true)

    if (delErr) console.error('Delete Error:', delErr)
    else console.log('Delete Success')

    // 4. Insert
    if (records.length > 0) {
        console.log('Inserting...')
        const { data: inserted, error: insErr } = await supabase
            .from('attendance_records')
            .insert(records)
            .select() // Request return data

        if (insErr) {
            console.error('Insert Error:', insErr)
        } else {
            console.log(`Insert Success. Returned Rows: ${inserted?.length}`)
        }
    } else {
        console.log('No records to insert.')
    }

    // 5. Verify Immediate
    console.log('Verifying...')
    const { count, error: countErr } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('year', 2025)
        .eq('month', 4)
        .eq('is_cumulative', true)

    console.log(`DB Count for 2025-04 (Cumulative): ${count}`)
    if (countErr) console.error('Verify Error:', countErr)
}

main()
