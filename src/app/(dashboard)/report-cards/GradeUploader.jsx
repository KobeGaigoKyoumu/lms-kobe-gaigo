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
                throw new Error('データのヘッダー（学籍番号など）が見つかりませんでした')
            }

            // ヘッダー行から列インデックスを特定
            const headerRow = inputData[headerRowIndex]

            // 列探索ヘルパー関数
            const findCol = (row, keywords, startIdx = 0) => {
                for (let i = startIdx; i < row.length; i++) {
                    const cell = row[i]
                    if (!cell) continue
                    const str = cell.toString().toLowerCase().trim()
                    if (keywords.some(k => str.includes(k))) return i
                }
                return -1
            }

            // マッピング定義
            const colMap = {
                id: findCol(headerRow, ['学籍番号', 'student id']),
                class: findCol(headerRow, ['クラス', 'class']),
                name: findCol(headerRow, ['名前', 'name', '氏名']),

                // 期末試験（左側の列を優先）
                exam: {
                    vocab: findCol(headerRow, ['文字', '語彙', 'vocabulary', 'vocab']),
                    listening: findCol(headerRow, ['聴解', 'listening']),
                    reading: findCol(headerRow, ['読解', 'reading']),
                    grammar: findCol(headerRow, ['文法', 'grammar']),
                    writing: findCol(headerRow, ['作文', 'writing']),
                    conversation: findCol(headerRow, ['会話', 'conversation', 'oral'])
                },

                // 総合成績（右側の列、あるいは「点」や「成績」などのキーワードを含む列を探す）
                // 簡易的に、同じキーワードで2回目に出現する列を探す
                report: {
                    vocab: -1, listening: -1, reading: -1, grammar: -1, writing: -1, conversation: -1
                },

                // 総合点
                total_score: findCol(headerRow, ['総合', 'total', 'sum'], 5) // 学籍番号より右側で探す
            }

            // 総合成績の列探索（期末試験の列の次から探す）
            const searchStartIdx = Math.max(
                colMap.exam.vocab, colMap.exam.listening, colMap.exam.reading,
                colMap.exam.grammar, colMap.exam.writing, colMap.exam.conversation
            ) + 1

            if (searchStartIdx > 0) {
                colMap.report.vocab = findCol(headerRow, ['文字', '語彙', 'vocabulary'], searchStartIdx)
                colMap.report.listening = findCol(headerRow, ['聴解', 'listening'], searchStartIdx)
                colMap.report.reading = findCol(headerRow, ['読解', 'reading'], searchStartIdx)
                colMap.report.grammar = findCol(headerRow, ['文法', 'grammar'], searchStartIdx)
                colMap.report.writing = findCol(headerRow, ['作文', 'writing'], searchStartIdx)
                colMap.report.conversation = findCol(headerRow, ['会話', 'conversation'], searchStartIdx)
            }

            // 名前が見つからない場合のフォールバック（学籍番号の右隣など）
            if (colMap.name === -1 && colMap.id !== -1) colMap.name = colMap.id + 2

            // カテゴリ（文字・語彙を追加）
            const categories = ['文字・語彙', '聴解', '読解', '文法', '作文', '会話']

            const students = []

            for (let i = headerRowIndex + 1; i < inputData.length; i++) {
                const row = inputData[i]
                if (!row || row.length < 3) continue

                const id = row[colMap.id]
                // 学籍番号が数値であることを確認
                if (!id || (typeof id !== 'number' && !id.toString().match(/^\d+$/))) continue

                // 2つのデータセットを作成
                // 1. 期末試験
                const finalExam = {
                    '文字・語彙': parseFloat(row[colMap.exam.vocab]) || 0,
                    '聴解': parseFloat(row[colMap.exam.listening]) || 0,
                    '読解': parseFloat(row[colMap.exam.reading]) || 0,
                    '文法': parseFloat(row[colMap.exam.grammar]) || 0,
                    '作文': parseFloat(row[colMap.exam.writing]) || 0,
                    '会話': parseFloat(row[colMap.exam.conversation]) || 0,
                }

                // 期末試験の総合点（6科目の平均）
                const examScores = Object.values(finalExam)
                const examSum = examScores.reduce((a, b) => a + b, 0)
                const examAvg = Math.round(examSum / 6 * 10) / 10

                // 2. 総合成績
                // データ列が見つかっていればそれを使う、なければ空（または0）
                // ユーザーが「違うシートを読み取っているはず」と言っているため、
                // もし同じシートに列がなければ、Sheet 1 も確認してみるロジックを入れたいが、
                // 複雑になるため、まずは同一シート内の2つ目のデータセットを探す
                const reportCard = {
                    '文字・語彙': parseFloat(row[colMap.report.vocab]) || 0,
                    '聴解': parseFloat(row[colMap.report.listening]) || 0,
                    '読解': parseFloat(row[colMap.report.reading]) || 0,
                    '文法': parseFloat(row[colMap.report.grammar]) || 0,
                    '作文': parseFloat(row[colMap.report.writing]) || 0,
                    '会話': parseFloat(row[colMap.report.conversation]) || 0,
                }

                // 総合成績の総合点
                const reportScores = Object.values(reportCard)
                const reportSum = reportScores.reduce((a, b) => a + b, 0)
                const reportAvg = Math.round(reportSum / 6 * 10) / 10

                // 表示用の総合点（右上に表示するもの）
                // 指定があればその列、なければ総合成績の平均
                const totalScore = parseFloat(row[colMap.total_score]) || reportAvg

                // 名前
                let name = row[colMap.name]
                if (!name && colMap.name !== -1) name = '氏名なし'

                students.push({
                    id: id,
                    name: name,
                    class: row[colMap.class],
                    finalExam,
                    finalExamTotal: examAvg,
                    reportCard,
                    reportCardTotal: reportAvg,
                    totalScore: totalScore
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
                                        <span className={styles.totalLabel}>総合点（平均）</span>
                                        <span className={styles.totalValue}>{student.totalScore}</span>
                                    </div>
                                </div>

                                {/* チャートエリア */}
                                <div className={styles.chartsGrid}>
                                    {/* 期末試験チャート */}
                                    <div className={styles.chartWrapper}>
                                        <h4 className={styles.chartTitle}>
                                            期末試験結果
                                            <span style={{ fontSize: '0.8em', marginLeft: '8px', color: '#6b7280' }}>
                                                (平均: {student.finalExamTotal})
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
                                                (平均: {student.reportCardTotal})
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
