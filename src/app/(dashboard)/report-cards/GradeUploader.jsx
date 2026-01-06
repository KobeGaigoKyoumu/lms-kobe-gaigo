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
    const [categories, setCategories] = useState([])
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

    const parseExcel = async () => {
        if (!file) return

        setLoading(true)
        setError('')

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)

            // 最初のシートを使用
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })

            // ヘッダー行を探す（学籍番号などのキーワードを含む行）
            let headerRowIndex = -1
            let dataStartIndex = -1

            for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                const row = jsonData[i]
                if (row && row.length > 0) {
                    const rowStr = row.join(',').toLowerCase()
                    if (rowStr.includes('学籍番号') || rowStr.includes('番号') || rowStr.includes('student')) {
                        headerRowIndex = i
                        dataStartIndex = i + 1
                        break
                    }
                }
            }

            // ヘッダーが見つからない場合、データの形式を推測
            if (headerRowIndex === -1) {
                // 数値データが始まる行を探す
                for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                    const row = jsonData[i]
                    if (row && row.length >= 5) {
                        // 最初の列が数値（学籍番号）かチェック
                        if (typeof row[0] === 'number' && row[0] > 1000000) {
                            dataStartIndex = i
                            // 一つ前の行をカテゴリとして使用
                            headerRowIndex = i - 1
                            break
                        }
                    }
                }
            }

            // サンプルデータの形式に基づく科目カテゴリ
            const defaultCategories = ['文法', '読解', '聴解', '作文', '会話', '総合']

            // データを解析
            const students = []
            for (let i = dataStartIndex; i < jsonData.length; i++) {
                const row = jsonData[i]
                if (!row || row.length < 5) continue

                // 学籍番号があるかチェック
                const studentId = row[0]
                if (!studentId || typeof studentId !== 'number' || studentId < 1000000) continue

                const className = row[1] || ''

                // 成績データを抽出（列3以降を想定）
                const scores = {}
                let total = 0
                let count = 0

                // 列インデックス3以降のデータを科目ごとに取得
                for (let j = 3; j < Math.min(row.length, 3 + defaultCategories.length); j++) {
                    const categoryIndex = j - 3
                    if (categoryIndex < defaultCategories.length) {
                        const score = parseFloat(row[j])
                        if (!isNaN(score)) {
                            scores[defaultCategories[categoryIndex]] = score
                            total += score
                            count++
                        }
                    }
                }

                if (count > 0) {
                    students.push({
                        id: studentId.toString(),
                        class: className,
                        scores,
                        average: Math.round(total / count)
                    })
                }
            }

            if (students.length === 0) {
                setError('成績データが見つかりませんでした。ファイル形式を確認してください。')
            } else {
                setCategories(defaultCategories)
                setGrades(students)
            }
        } catch (err) {
            console.error(err)
            setError('ファイルの解析に失敗しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const getScoreClass = (score) => {
        if (score >= 80) return styles.excellent
        if (score >= 65) return styles.good
        if (score >= 50) return styles.average
        return styles.poor
    }

    return (
        <div>
            {/* アップロードセクション */}
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

            {/* 結果セクション */}
            {grades.length > 0 && (
                <div className={styles.resultsSection}>
                    <div className={styles.resultsHeader}>
                        <h2>成績一覧</h2>
                        <span className={styles.studentCount}>{grades.length}名</span>
                    </div>

                    <div className={styles.studentGrid}>
                        {grades.map((student, index) => (
                            <div key={student.id || index} className={styles.studentCard}>
                                <div className={styles.studentInfo}>
                                    <div>
                                        <p className={styles.studentName}>学籍番号: {student.id}</p>
                                        <p className={styles.studentId}>{student.class}</p>
                                    </div>
                                    <div className={`${styles.totalScore} ${getScoreClass(student.average)}`}>
                                        平均: {student.average}点
                                    </div>
                                </div>

                                <div className={styles.chartContainer}>
                                    <RadarChart
                                        labels={categories}
                                        data={categories.map(cat => student.scores[cat] || 0)}
                                        studentId={student.id}
                                    />
                                </div>

                                <div className={styles.scoreDetails}>
                                    {categories.map(cat => (
                                        <div key={cat} className={styles.scoreItem}>
                                            <span className={styles.scoreLabel}>{cat}</span>
                                            <span className={styles.scoreValue}>
                                                {student.scores[cat] !== undefined ? student.scores[cat] : '-'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
