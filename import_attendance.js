/**
 * 出席率データ一括インポートスクリプト（学生マスター対応版）
 * 
 * - 学年: 学籍番号から計算（先頭2桁＝入学年度）
 * - クラス名: 学生マスターのclass_nameから取得（学籍番号と無関係）
 * - 入学時期: 学籍番号の3-4桁目
 */

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// ========================================
// Supabase設定
// ========================================
const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

// 出席率データディレクトリ
const ATTENDANCE_DIR = 'c:/Users/神戸外語03/Desktop/lms-kobe-gaigo/出席率'

// ========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * 学籍番号から学年を計算
 * @param {string} studentId 学籍番号
 * @param {number} dataYear データの年
 * @param {number} dataMonth データの月
 * @returns {object} { grade, isGraduated }
 */
function calculateGrade(studentId, dataYear, dataMonth) {
    if (!studentId || studentId.length < 2) {
        return { grade: null, isGraduated: false }
    }

    // 入学年度（先頭2桁）
    const enrollmentYearShort = parseInt(studentId.substring(0, 2), 10)
    const enrollmentYear = 2000 + enrollmentYearShort

    // データの年度を計算（4月始まり）
    let academicYear
    if (dataMonth >= 4) {
        academicYear = dataYear
    } else {
        academicYear = dataYear - 1
    }

    // 学年を計算（2年制）
    let grade = academicYear - enrollmentYear + 1

    // 卒業判定（2年制なので3年目以降は卒業）
    const isGraduated = grade > 2

    // 卒業生の場合は grade を 0 に
    if (isGraduated) {
        grade = 0
    }

    return { grade, isGraduated }
}

/**
 * 学生マスターからクラス名を取得
 */
async function getStudentClassMap() {
    console.log('学生マスターからクラス名を取得中...')

    // 全件取得するためにループが必要かもしれないが、一旦デフォルトの1000件制限を解除してみる
    // Supabase JS clientのデフォルトは1000件だが、rangeを指定しないと全部取れない場合がある
    // ここでは安全のため 0-9999 を指定
    const { data, error } = await supabase
        .from('students')
        .select('student_id_text, class_name')
        .not('class_name', 'is', null)
        .range(0, 9999)

    if (error) {
        console.error('学生マスター取得エラー:', error.message)
        return new Map()
    }

    const studentMap = new Map()
    data?.forEach(s => {
        if (s.student_id_text && s.class_name) {
            studentMap.set(s.student_id_text, s.class_name)
        }
    })

    console.log(`学生マスター: ${studentMap.size}件のクラス情報を取得`)
    return studentMap
}

// ファイル名からメタデータを抽出
function parseFilename(filename) {
    const match = filename.match(/(\d{4})年(\d{1,2})月(度|累計)\.xlsx$/)
    if (!match) return null

    return {
        year: parseInt(match[1]),
        month: parseInt(match[2]),
        isCumulative: match[3] === '累計'
    }
}

// Excelファイルを読み込んでレコードを生成
function readExcelFile(filepath, year, month, isCumulative, studentClassMap) {
    const workbook = XLSX.readFile(filepath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    const records = []

    for (let i = 3; i < data.length; i++) {
        const row = data[i]
        if (row && row[2]) {
            const studentId = String(row[2])

            // 学籍番号が数字でない場合はスキップ
            if (!/^\d+$/.test(studentId)) continue

            const attendanceRate = row[11] || 0

            // 学年を学籍番号から計算
            const { grade, isGraduated } = calculateGrade(studentId, year, month)

            // クラス名を学生マスターから取得
            const className = studentClassMap.get(studentId) || null

            records.push({
                student_id: studentId,
                student_name: row[3] || '',
                gender: row[4] || '',
                nationality: row[5] || '',
                year: year,
                month: month,
                is_cumulative: isCumulative,
                attendance_days: row[6] || 0,
                absence_days: row[7] || 0,
                attendance_slots: row[8] || 0,
                late_slots: row[9] || 0,
                absence_slots: row[10] || 0,
                attendance_rate: typeof attendanceRate === 'number' ? attendanceRate : parseFloat(attendanceRate) || 0,
                grade: grade,  // 学籍番号から計算
                class_code: className  // 学生マスターから取得
            })
        }
    }

    return records
}

// メイン処理
async function main() {
    console.log('出席率データ一括インポート（学生マスター対応版・UTF-8版）を開始します...\n')
    console.log('ロジック:')
    console.log('  - 学年: 学籍番号から計算（先頭2桁＝入学年度）')
    console.log('  - クラス名: 学生マスターのclass_nameから取得')
    console.log('')

    try {
        // 学生マスターからクラス情報を取得
        const studentClassMap = await getStudentClassMap()

        // ファイル一覧を取得
        const files = fs.readdirSync(ATTENDANCE_DIR).filter(f => f.endsWith('.xlsx'))
        console.log(`\n${files.length}個のExcelファイルを検出しました\n`)

        let successCount = 0
        let errorCount = 0
        let totalRecords = 0

        for (const filename of files) {
            console.log(`処理中: ${filename}...`)
            const meta = parseFilename(filename)
            if (!meta) {
                console.log(`  -> スキップ: ファイル名が不正`)
                continue
            }

            const filepath = path.join(ATTENDANCE_DIR, filename)
            const typeStr = meta.isCumulative ? '累計' : '月別'

            try {
                // ファイル読み込み
                const records = readExcelFile(filepath, meta.year, meta.month, meta.isCumulative, studentClassMap)
                console.log(`  -> ${records.length}件のレコードを読み込みました`)

                if (records.length === 0) {
                    console.log(`  -> スキップ: データなし`)
                    continue
                }

                // 既存データを削除
                console.log(`  -> 既存データを削除中...`)
                const { error: deleteError } = await supabase
                    .from('attendance_records')
                    .delete()
                    .eq('year', meta.year)
                    .eq('month', meta.month)
                    .eq('is_cumulative', meta.isCumulative)

                if (deleteError) {
                    throw new Error(`削除エラー: ${deleteError.message}`)
                }

                // データを挿入（バッチサイズ500）
                const batchSize = 500
                console.log(`  -> データを挿入中（${Math.ceil(records.length / batchSize)}バッチ）...`)

                for (let i = 0; i < records.length; i += batchSize) {
                    const batch = records.slice(i, i + batchSize)
                    const { error: insertError } = await supabase
                        .from('attendance_records')
                        .insert(batch)

                    if (insertError) {
                        throw new Error(`挿入エラー (Batch ${i}): ${insertError.message}`)
                    }
                    process.stdout.write('.') // 進行状況を表示
                }
                process.stdout.write('\n') // 改行

                // 統計
                const withClass = records.filter(r => r.class_code).length
                console.log(`  -> 完了! クラス割り当て: ${withClass}/${records.length}`)
                successCount++
                totalRecords += records.length

            } catch (err) {
                console.error(`  -> 失敗: ${err.message}`)
                errorCount++
            }
        }

        console.log('\n========================================')
        console.log(`インポート完了`)
        console.log(`成功: ${successCount}ファイル (${totalRecords}件)`)
        console.log(`エラー: ${errorCount}ファイル`)
        console.log('========================================')

    } catch (error) {
        console.error('Fatal Error:', error)
    }
}

main().catch(console.error)
