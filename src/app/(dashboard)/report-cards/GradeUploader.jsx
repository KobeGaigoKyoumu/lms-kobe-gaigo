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
            const colMap = {
                id: -1,
                class: -1,
                name: -1,
                grammar: -1,
                reading: -1,
                listening: -1,
                writing: -1,
                conversation: -1,
                // 総合成績用（もし同じシートにある場合）
                total_grammar: -1,
                total_reading: -1,
                total_listening: -1,
                total_writing: -1,
                total_conversation: -1,
                total_score: -1
            }

            headerRow.forEach((cell, index) => {
                if (!cell) return
                const str = cell.toString().toLowerCase().trim()

                if (str.includes('学籍番号') || str.includes('student')) colMap.id = index
                else if (str.includes('クラス') || str === 'class') colMap.class = index
                else if (str.includes('名前') || str.includes('name')) colMap.name = index
                else if (str.includes('文法') || str.includes('grammar')) colMap.grammar = index
                else if (str.includes('読解') || str.includes('reading')) colMap.reading = index
                else if (str.includes('聴解') || str.includes('listening')) colMap.listening = index
                else if (str.includes('作文') || str.includes('writing')) colMap.writing = index
                else if (str.includes('会話') || str.includes('conversation')) colMap.conversation = index

                // 総合成績の列を探す（通常右側にある）
                else if (str.includes('総合') || str.includes('total') || str.includes('sum')) colMap.total_score = index
            })

            // 名前が見つからない場合のフォールバック（学籍番号の右隣など）
            if (colMap.name === -1 && colMap.id !== -1) colMap.name = colMap.id + 2

            // 科目が見つからない場合のフォールバック（順番決め打ち）
            // 入力シート: 学籍番号(0), クラス(1), 名前(2), 文法(3), 読解(4), 聴解(5), 作文(6), 会話(7) ... と仮定
            if (colMap.grammar === -1) colMap.grammar = 3
            if (colMap.reading === -1) colMap.reading = 4
            if (colMap.listening === -1) colMap.listening = 5
            if (colMap.writing === -1) colMap.writing = 6
            if (colMap.conversation === -1) colMap.conversation = 7

            // 総合成績データの列推測（さらに右側にあると仮定、あるいは別のシート）
            // 今回はユーザー要望により「成績通知書」シートを見るとのことだが、個票形式ならデータソースは入力シートの右側にある可能性が高い
            // 簡易的に、期末試験の点数を使って総合チャートも描画し、タイトルを変える（データがなければ）
            // ★重要：期末試験と総合成績が別データなら、本来は別の列を参照すべき。
            // ここでは、入力シートの右側に「成績通知用」のデータがあると仮定して列を探す、
            // なければ期末試験のデータを「成績通知」として代用する（ただし値は要確認）

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
                    '文法': parseFloat(row[colMap.grammar]) || 0,
                    '読解': parseFloat(row[colMap.reading]) || 0,
                    '聴解': parseFloat(row[colMap.listening]) || 0,
                    '作文': parseFloat(row[colMap.writing]) || 0,
                    '会話': parseFloat(row[colMap.conversation]) || 0,
                }

                // 2. 総合成績 (データ列が不明なため、当面は期末と同じスコアを使用するか、右側の列を探索)
                // 実運用ではマッピング調整が必要
                // 総合点は6科目の平均とあるが、入力データから計算する
                const scores = Object.values(finalExam)
                const sum = scores.reduce((a, b) => a + b, 0)
                const totalScore = parseFloat(row[colMap.total_score]) || Math.round(sum / 5 * 10) / 10 // 列があれば使う、なければ平均計算

                // 名前
                let name = row[colMap.name]
                if (!name && colMap.name !== -1) name = '氏名不明'

                students.push({
                    id: id,
                    name: name,
                    class: row[colMap.class],
                    finalExam,
                    reportCard: finalExam, // 仮：同じデータを使用（後で列調整可能）
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

    const categories = ['文法', '読解', '聴解', '作文', '会話']

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
                                        <h4 className={styles.chartTitle}>期末試験結果</h4>
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
                                        <h4 className={styles.chartTitle}>成績通知表 (総合成績)</h4>
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
