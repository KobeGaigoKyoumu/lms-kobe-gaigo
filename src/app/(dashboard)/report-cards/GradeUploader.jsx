'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import styles from './page.module.css'
import RadarChart from './RadarChart'

export default function GradeUploader() {
    const [file, setFile] = useState(null)
    const [grades, setGrades] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef(null)

    const handleDrop = (e) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xlsm') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile)
            setError('')
        } else {
            setError('Excelファイル（.xlsx, .xlsm, .xls）をアップロードしてください')
        }
    }

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            setError('')
        }
    }

    const findHeaderRow = (data) => {
        for (let i = 0; i < Math.min(data.length, 30); i++) {
            const row = data[i]
            if (row && row.length > 0) {
                const rowStr = row.join(',').toLowerCase()
                if (rowStr.includes('学籍番号') || rowStr.includes('student id')) {
                    return i
                }
            }
        }
        return -1
    }

    const parseExcel = async () => {
        if (!file) return

        setLoading(true)
        setError('')
        setGrades([])

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)

            // Sheet 0: 期末試験データ
            const inputSheet = workbook.Sheets[workbook.SheetNames[0]]
            const inputData = XLSX.utils.sheet_to_json(inputSheet, { header: 1 })
            const headerRowIndex = findHeaderRow(inputData)

            if (headerRowIndex === -1) {
                throw new Error('期末試験シートのヘッダーが見つかりませんでした')
            }

            // Sheet 4: 総合成績評価データ（5枚目）
            // sheet_to_jsonを使わず、直接セル値(.v)を取得する（関数対策）
            const reportSheetIndex = 4
            let reportSheet = null
            let reportHeaderRowIndex = -1
            let reportDataMap = new Map() // ID -> Row Index Map

            if (workbook.SheetNames.length > reportSheetIndex) {
                reportSheet = workbook.Sheets[workbook.SheetNames[reportSheetIndex]]

                // データ範囲を取得
                const range = XLSX.utils.decode_range(reportSheet['!ref'])

                // ヘッダー行を探す（最初の20行くらい）
                for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
                    let rowText = ''
                    for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
                        const cell = reportSheet[XLSX.utils.encode_cell({ r, c })]
                        if (cell && cell.v) rowText += cell.v + ' '
                    }
                    if (rowText.includes('語彙') && rowText.includes('文法')) {
                        reportHeaderRowIndex = r
                        break
                    }
                }

                // ヘッダーが見つからない場合のフォールバック（3行目と仮定）
                // Excelの行番号は1始まり、ライブラリは0始まり。Row 3 -> Index 2
                if (reportHeaderRowIndex === -1) reportHeaderRowIndex = 2

                // IDと行番号のマッピングを作成
                // IDカラムは基本 B列(Index 1) だが、念のため探す
                // 固定列: B列(1)
                const idColIdx = 1

                for (let r = reportHeaderRowIndex + 1; r <= range.e.r; r++) {
                    const cell = reportSheet[XLSX.utils.encode_cell({ r, c: idColIdx })]
                    if (cell && cell.v) {
                        const idStr = String(cell.v).trim()
                        if (idStr) reportDataMap.set(idStr, r)
                    }
                }
            } else {
                console.warn('総合成績評価シート（5枚目）が見つかりませんでした')
            }

            // ヘッダー行から列インデックスを特定
            const headerRow = inputData[headerRowIndex]

            const findCol = (row, keywords, startIdx = 0) => {
                for (let i = startIdx; i < row.length; i++) {
                    const cell = row[i]
                    if (!cell) continue
                    const str = cell.toString().toLowerCase().trim()
                    if (keywords.some(k => str.includes(k))) return i
                }
                return -1
            }

            // 期末試験シートのマッピング
            const examColMap = {
                id: findCol(headerRow, ['学籍番号', 'student id']),
                class: findCol(headerRow, ['クラス', 'class']),
                name: findCol(headerRow, ['名前', 'name', '氏名']),
                vocab: findCol(headerRow, ['文字', '語彙', 'vocabulary', 'vocab']),
                listening: findCol(headerRow, ['聴解', 'listening']),
                reading: findCol(headerRow, ['読解', 'reading']),
                grammar: findCol(headerRow, ['文法', 'grammar']),
                writing: findCol(headerRow, ['作文', 'writing']),
                conversation: findCol(headerRow, ['会話', 'conversation', 'oral'])
            }

            // 総合成績シートのマッピング（固定列インデックス）
            // P列(15)-U列(20): 成績, V列(21): 合計
            const reportColMap = {
                vocab: 15,
                listening: 16,
                reading: 17,
                grammar: 18,
                writing: 19,
                conversation: 20,
                total: 21
            }

            // 名前が見つからない場合のフォールバック
            if (examColMap.name === -1 && examColMap.id !== -1) examColMap.name = examColMap.id + 2

            const categories = ['文字・語彙', '聴解', '読解', '文法', '作文', '会話']
            const students = []

            // Sheet 0 のデータを主としてループ
            for (let i = headerRowIndex + 1; i < inputData.length; i++) {
                const row = inputData[i]
                if (!row || row.length < 3) continue

                const id = row[examColMap.id]
                if (!id || (typeof id !== 'number' && !id.toString().match(/^\d+$/))) continue

                // 1. 期末試験データ
                const finalExam = {
                    '文字・語彙': parseFloat(row[examColMap.vocab]) || 0,
                    '聴解': parseFloat(row[examColMap.listening]) || 0,
                    '読解': parseFloat(row[examColMap.reading]) || 0,
                    '文法': parseFloat(row[examColMap.grammar]) || 0,
                    '作文': parseFloat(row[examColMap.writing]) || 0,
                    '会話': parseFloat(row[examColMap.conversation]) || 0,
                }

                // 期末試験の合計点 (600点満点)
                const examScores = Object.values(finalExam)
                const examSum = examScores.reduce((a, b) => a + b, 0)

                // 2. 総合成績データ（Sheet 4から直接取得）
                let reportCard = {
                    '文字・語彙': 0, '聴解': 0, '読解': 0, '文法': 0, '作文': 0, '会話': 0
                }
                let reportTotal = 0

                // IDで行を特定
                const reportRowIndex = reportDataMap.get(String(id).trim())

                if (reportRowIndex !== undefined && reportSheet) {
                    const getVal = (colIdx) => {
                        const cell = reportSheet[XLSX.utils.encode_cell({ r: reportRowIndex, c: colIdx })]
                        if (!cell) return 0
                        // 値(.v) または 表示テキスト(.w) を取得して数値変換
                        const val = cell.v !== undefined ? cell.v : cell.w
                        return parseFloat(val) || 0
                    }

                    reportCard = {
                        '文字・語彙': getVal(reportColMap.vocab),
                        '聴解': getVal(reportColMap.listening),
                        '読解': getVal(reportColMap.reading),
                        '文法': getVal(reportColMap.grammar),
                        '作文': getVal(reportColMap.writing),
                        '会話': getVal(reportColMap.conversation),
                    }

                    reportTotal = getVal(reportColMap.total)
                    if (reportTotal === 0) {
                        const scores = Object.values(reportCard)
                        reportTotal = Math.round(scores.reduce((a, b) => a + b, 0) * 10) / 10
                    }
                }

                // 名前
                let name = row[examColMap.name]
                if (!name && examColMap.name !== -1) name = '氏名なし'

                students.push({
                    id: id,
                    name: name,
                    class: row[examColMap.class],
                    finalExam,
                    finalExamSum: examSum,
                    reportCard,
                    reportCardTotal: reportTotal
                })
            }

            if (students.length === 0) {
                setError('有効な学生データが見つかりませんでした')
            } else {
                setGrades(students)
            }

        } catch (err) {
            console.error(err)
            setError('解析エラー: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const categories = ['文字・語彙', '聴解', '読解', '文法', '作文', '会話']

    return (
        <div>
            <div className={styles.uploadSection}>
                <h2>成績評価シートをアップロード</h2>
                <div
                    className={`${styles.dropzone} ${file ? styles.active : ''}`}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xlsm,.xls"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    <svg className={styles.dropzoneIcon} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M8 32l8-8 8 8M24 24l8-8 8 8" />
                        <path d="M16 24v16h16V24" />
                        <path d="M8 8h32v8" />
                    </svg>
                    <p className={styles.dropzoneText}>
                        ファイルをドラッグ＆ドロップ または クリックして選択
                    </p>
                    <p className={styles.dropzoneHint}>
                        対応形式: .xlsx, .xlsm, .xls
                    </p>
                </div>

                {file && (
                    <div className={styles.fileName}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M4 4a2 2 0 0 1 2-2h6l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
                            <path d="M12 2v4h4" />
                        </svg>
                        {file.name}
                    </div>
                )}

                <button
                    onClick={parseExcel}
                    disabled={!file || loading}
                    className={styles.parseBtn}
                >
                    {loading ? '解析中...' : '成績データを読み込む'}
                </button>

                {error && <div className={styles.error}>{error}</div>}
            </div>

            {grades.length > 0 && (
                <div className={styles.resultsSection}>
                    <div className={styles.resultsHeader}>
                        <h2>成績処理結果</h2>
                        <span className={styles.studentCount}>{grades.length}名</span>
                    </div>

                    <div className={styles.studentList}>
                        {grades.map((student, index) => (
                            <div key={index} className={styles.studentRow}>
                                {/* 学生情報ヘッダー */}
                                <div className={styles.studentHeader}>
                                    <div>
                                        <h3 className={styles.studentName}>
                                            {student.name}
                                            <span className={styles.studentId}>({student.id})</span>
                                        </h3>
                                        <p className={styles.className}>{student.class}</p>
                                    </div>
                                    <div className={styles.totalScoreBadge}>
                                        <span className={styles.totalLabel}>総合成績（合計）</span>
                                        <span className={styles.totalValue}>{student.reportCardTotal}</span>
                                    </div>
                                </div>

                                {/* チャートエリア */}
                                <div className={styles.chartsGrid}>
                                    {/* 期末試験チャート */}
                                    <div className={styles.chartWrapper}>
                                        <h4 className={styles.chartTitle}>
                                            期末試験結果
                                            <span style={{ fontSize: '0.8em', marginLeft: '8px', color: '#6b7280' }}>
                                                (合計: {student.finalExamSum}/600)
                                            </span>
                                        </h4>
                                        <div className={styles.chartContainer}>
                                            <RadarChart
                                                labels={categories}
                                                data={categories.map(c => student.finalExam[c])}
                                                title="期末試験"
                                                color="blue"
                                            />
                                        </div>
                                    </div>

                                    {/* 成績通知チャート */}
                                    <div className={styles.chartWrapper}>
                                        <h4 className={styles.chartTitle}>
                                            成績通知表 (総合成績)
                                            <span style={{ fontSize: '0.8em', marginLeft: '8px', color: '#6b7280' }}>
                                                (合計: {student.reportCardTotal})
                                            </span>
                                        </h4>
                                        <div className={styles.chartContainer}>
                                            <RadarChart
                                                labels={categories}
                                                data={categories.map(c => student.reportCard[c])}
                                                title="総合成績"
                                                color="green"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
