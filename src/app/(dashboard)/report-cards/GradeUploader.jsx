'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import styles from './page.module.css'
import RadarChart from './RadarChart'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function GradeUploader() {
    const [files, setFiles] = useState([])
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedTerm, setSelectedTerm] = useState(new Date().getMonth() + 1 >= 4 && new Date().getMonth() + 1 <= 9 ? '前期' : '後期')
    const [grades, setGrades] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [debugInfo, setDebugInfo] = useState(null)
    const fileInputRef = useRef(null)
    const supabase = createClient()
    // State for View Mode ('exam' | 'report')
    const [viewMode, setViewMode] = useState('report') // Default to report as it's the main detailed view
    const [saving, setSaving] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')

    const handleDrop = (e) => {
        e.preventDefault()
        const droppedFiles = Array.from(e.dataTransfer.files)
        const validFiles = droppedFiles.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xlsm') || f.name.endsWith('.xls'))

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles])
            setError('')
        } else {
            setError('Excelファイル（.xlsx, .xlsm, .xls）をアップロードしてください')
        }
    }

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length > 0) {
            setFiles(prev => [...prev, ...selectedFiles])
            setError('')
        }
    }

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
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
        if (files.length === 0) return

        setLoading(true)
        setError('')
        setGrades([])

        let allStudents = []
        let errors = []

        try {
            for (const file of files) {
                const data = await file.arrayBuffer()
                const workbook = XLSX.read(data)

                // Sheet 0: 期末試験データ
                const inputSheet = workbook.Sheets[workbook.SheetNames[0]]
                const inputData = XLSX.utils.sheet_to_json(inputSheet, { header: 1 })
                const headerRowIndex = findHeaderRow(inputData)

                if (headerRowIndex === -1) {
                    errors.push(`${file.name}: 期末試験シートのヘッダーが見つかりませんでした`)
                    continue
                }

                // Sheet 4: 総合成績評価データ（通常は左から4番目、Index 3）
                // "成績通知書" (Index 4) は印刷用レイアウトの可能性があるため、その手前のシートを探す
                let reportSheetIndex = 3

                // シート名で検索（"総合成績" または "評価" を含むシートを優先）
                const targetSheetIdx = workbook.SheetNames.findIndex(name => name.includes('総合成績') || (name.includes('評価') && !name.includes('シート')))
                if (targetSheetIdx !== -1) {
                    reportSheetIndex = targetSheetIdx
                }

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

                    // ヘッダーが見つからない場合のフォールバック（2行目と仮定）
                    // Excelの行番号は1始まり、ライブラリは0始まり。Row 2 -> Index 1
                    // データはRow 3 (Index 2) から始まる
                    if (reportHeaderRowIndex === -1) reportHeaderRowIndex = 1

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
                    console.warn(`${file.name}: 総合成績評価シート（5枚目）が見つかりませんでした`)
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
                const keyMap = ['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation']

                // Pre-calculate Max Scores for each category from Sheet 0
                const maxScores = {
                    vocab: 0, listening: 0, reading: 0, grammar: 0, writing: 0, conversation: 0
                }

                for (let i = headerRowIndex + 1; i < inputData.length; i++) {
                    const row = inputData[i]
                    if (!row || row.length < 3) continue
                    const id = row[examColMap.id]
                    if (!id) continue

                    keyMap.forEach(key => {
                        const val = parseFloat(row[examColMap[key]]) || 0
                        if (val > maxScores[key]) maxScores[key] = val
                    })
                }

                // Sheet 0 のデータを主としてループ
                for (let i = headerRowIndex + 1; i < inputData.length; i++) {
                    const row = inputData[i]
                    if (!row || row.length < 3) continue

                    const id = row[examColMap.id]
                    if (!id || (typeof id !== 'number' && !id.toString().match(/^\d+$/))) continue

                    // 重複チェック (既に読み込んだ学生を除外する場合)
                    // if (allStudents.some(s => s.id === id)) continue; 

                    // 1. 期末試験データ
                    const finalExam = {
                        vocab: parseFloat(row[examColMap.vocab]) || 0,
                        listening: parseFloat(row[examColMap.listening]) || 0,
                        reading: parseFloat(row[examColMap.reading]) || 0,
                        grammar: parseFloat(row[examColMap.grammar]) || 0,
                        writing: parseFloat(row[examColMap.writing]) || 0,
                        conversation: parseFloat(row[examColMap.conversation]) || 0,
                    }

                    // 期末試験の合計点 (600点満点)
                    const examScores = Object.values(finalExam)
                    const examSum = examScores.reduce((a, b) => a + b, 0)

                    // 2. 総合成績データ（Sheet 4から直接取得）
                    let reportCard = {
                        vocab: 0, listening: 0, reading: 0, grammar: 0, writing: 0, conversation: 0
                    }
                    let reportTotal = 0

                    // IDで行を特定
                    const reportRowIndex = reportDataMap.get(String(id).trim())


                    if (reportRowIndex !== undefined && reportSheet) {
                        const getVal = (colIdx) => {
                            // ターゲット列、その前後（-1, +1）をチェックして数値を探す（列ズレ対策）
                            const indicesToCheck = [colIdx, colIdx - 1, colIdx + 1]

                            for (const idx of indicesToCheck) {
                                const cell = reportSheet[XLSX.utils.encode_cell({ r: reportRowIndex, c: idx })]
                                if (!cell) continue
                                const val = cell.v !== undefined ? cell.v : cell.w

                                // 明示的に数値型であれば採用
                                if (typeof val === 'number') return val

                                // 文字列の場合、数値変換してチェック（"A"などはNaNになる）
                                const num = parseFloat(val)
                                // 0点もあり得るが、文字列"0"以外でパースして0になる（失敗）ケースを除外したい
                                // ここでは単純に !isNaN で判定
                                if (!isNaN(num)) return num
                            }
                            return 0
                        }

                        // レポートカード（総合成績）データの取得 - シートの列定義に基づく
                        // 12:出席, 13:平常, 14:語彙(基), 15:(合), 16:聴解...
                        const getReportVal = (c) => {
                            const cell = reportSheet[XLSX.utils.encode_cell({ r: reportRowIndex, c: c })]
                            if (!cell) return 0
                            return typeof cell.v === 'number' ? cell.v : (parseFloat(cell.v) || 0)
                        }

                        // Common values for all subjects
                        const attendanceScore = getReportVal(12)
                        const participationScore = getReportVal(13)

                        // Helper to build subject detail with calculation
                        const buildSubjectDetail = (subjectKey) => {
                            // User Request: Calculate Base Score using Curve Formula
                            // Formula: 0.5 * (sqrt(140*Y - Y^2) + Y)
                            // Where Y = 70 * (Score / MaxScore)

                            const score = finalExam[subjectKey]
                            const max = maxScores[subjectKey] || 100 // Avoid divide by zero

                            let base = 0
                            if (max > 0) {
                                const Y = 70 * (score / max)
                                // Apply formula: 0.5 * (sqrt(140Y - Y^2) + Y)
                                // Make sure term inside sqrt is non-negative. 140Y - Y^2 = Y(140-Y). Since Y <= 70, this is positive.
                                const insideSqrt = (140 * Y) - (Y * Y)
                                const term1 = Math.sqrt(Math.max(0, insideSqrt))
                                base = 0.5 * (term1 + Y)
                            }

                            // User Request: Calculate Total = Base + Attendance + Participation
                            const total = base + attendanceScore + participationScore
                            return { base, total }
                        }

                        const reportDetails = {
                            attendance: attendanceScore,
                            participation: participationScore,
                            vocab: buildSubjectDetail('vocab'),
                            listening: buildSubjectDetail('listening'),
                            reading: buildSubjectDetail('reading'),
                            grammar: buildSubjectDetail('grammar'),
                            writing: buildSubjectDetail('writing'),
                            conversation: buildSubjectDetail('conversation'),
                            overall: { total: getReportVal(26) } // Overall Total from Col 26
                        }


                        // Calculate Overall Base (Sum of subject bases)
                        reportDetails.overall.base =
                            reportDetails.vocab.base +
                            reportDetails.listening.base +
                            reportDetails.reading.base +
                            reportDetails.grammar.base +
                            reportDetails.writing.base +
                            reportDetails.conversation.base

                        // Populate reportCard object for chart (using Calculated Totals)
                        reportCard = {
                            vocab: reportDetails.vocab.total,
                            listening: reportDetails.listening.total,
                            reading: reportDetails.reading.total,
                            grammar: reportDetails.grammar.total,
                            writing: reportDetails.writing.total,
                            conversation: reportDetails.conversation.total,
                        }


                        // Report Total used for Chart can be the Overall Total or sum of Subject Totals / 6 ?
                        // Usually Report Total is the "Overall" score.
                        reportTotal = reportDetails.overall.total
                        if (reportTotal === 0) {
                            // Fallback: Average of the 6 calculated totals?
                            // Or sum? The overall is usually ~90, so likely average or 100-scale score.
                            // Let's rely on the Column 26 as primary. If 0, use average of calculated.
                            const sumTotals =
                                reportDetails.vocab.total +
                                reportDetails.listening.total +
                                reportDetails.reading.total +
                                reportDetails.grammar.total +
                                reportDetails.writing.total +
                                reportDetails.conversation.total
                            reportTotal = sumTotals / 6
                        }
                        // Determine grade for report (already used logic, keep consistent)

                        // 合計点が0の場合、または少数が多すぎる場合は再計算・整形
                        if (reportTotal === 0) {
                            const scores = Object.values(reportCard)
                            reportTotal = Math.round(scores.reduce((a, b) => a + b, 0) * 10) / 10
                        } else {
                            // 既に値がある場合も小数点第1位に丸める
                            reportTotal = Math.round(reportTotal * 10) / 10
                        }

                        // 名前
                        let name = row[examColMap.name]
                        if (!name && examColMap.name !== -1) name = '氏名なし'

                        allStudents.push({
                            id: id,
                            name: name,
                            class: row[examColMap.class],
                            finalExam,
                            finalExamSum: examSum,
                            reportCard, // Keep for chart
                            reportDetails, // NEW: Detailed data
                            reportCardTotal: reportTotal,
                            filename: file.name
                        })
                    }
                }
            }

            if (allStudents.length === 0) {
                if (errors.length > 0) {
                    setError('エラー: ' + errors.join('\n'))
                } else {
                    setError('有効な学生データが見つかりませんでした')
                }
            } else {
                setGrades(allStudents)
                if (errors.length > 0) {
                    setError(`注意: 一部のファイルでエラーが発生しました:\n${errors.join('\n')}`)
                }
            }
        } catch (err) {
            console.error(err)
            setError('解析エラー: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const categories = ['文字・語彙', '聴解', '読解', '文法', '作文', '会話']

    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    // 期末試験用の評価基準
    // A: 80%以上, B: 60%以上, C: 40%以上, D: 20%以上, F: 20%未満
    const calculateFinalExamGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    const saveToDatabase = async () => {
        if (!grades || grades.length === 0) return

        setSaving(true)
        setSaveMessage('')

        try {
            const academicYear = selectedYear
            const term = selectedTerm


            const yearTerm = `${academicYear}年度 ${term}`

            let successCount = 0

            for (const student of grades) {
                const { error } = await supabase
                    .from('grade_records')
                    .upsert({
                        student_id_text: String(student.id),
                        student_name: student.name,
                        class_name: student.class,
                        year_term: yearTerm,
                        final_exam_data: student.finalExam,
                        report_card_data: student.reportDetails, // 詳細データ保存
                        final_exam_total: student.finalExamSum,
                        report_card_total: student.reportCardTotal,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'student_id_text, year_term'
                    })

                if (error) {
                    console.error('Save error for:', student.id, error)
                } else {
                    successCount++
                }
            }

            setSaveMessage(`${successCount}件のデータを保存しました (学期: ${yearTerm})`)
        } catch (err) {
            console.error(err)
            setSaveMessage('保存中にエラーが発生しました')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <div className={styles.uploadSection}>
                <h2>成績評価シートをアップロード</h2>

                {/* Year and Term Selectors */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label style={{ fontSize: '0.9em', marginBottom: '5px', fontWeight: 'bold' }}>年度</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '100px' }}
                        >
                            {Array.from({ length: new Date().getFullYear() + 2 - 2020 + 1 }, (_, i) => 2020 + i).map(y => (
                                <option key={y} value={y}>{y}年度</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <label style={{ fontSize: '0.9em', marginBottom: '5px', fontWeight: 'bold' }}>学期</label>
                        <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '100px' }}
                        >
                            <option value="前期">前期</option>
                            <option value="後期">後期</option>
                        </select>
                    </div>
                </div>

                <div
                    className={`${styles.dropzone} ${files.length > 0 ? styles.active : ''}`}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xlsm,.xls"
                        multiple
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
                        対応形式: .xlsx, .xlsm, .xls (複数選択可)
                    </p>
                </div>

                {files.length > 0 && (
                    <div className={styles.fileList} style={{ marginTop: '15px' }}>
                        {files.map((f, i) => (
                            <div key={i} className={styles.fileName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: '#f9fafb', marginBottom: '5px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '8px' }}>
                                        <path d="M4 4a2 2 0 0 1 2-2h6l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
                                        <path d="M12 2v4h4" />
                                    </svg>
                                    {f.name}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2em', padding: '0 5px' }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={parseExcel}
                    disabled={files.length === 0 || loading}
                    className={styles.parseBtn}
                >
                    {loading ? '解析中...' : '成績データを読み込む'}
                </button>

                {error && <div className={styles.error}>{error}</div>}

                {/* Debug Info: 開発完了に伴い非表示化、必要なら復活させる */}
                {/* {debugInfo && ( ... )} */}

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link href="/report-cards/history" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        保存済みデータの履歴を見る
                    </Link>
                </div>
            </div>

            {grades.length > 0 && (
                <div className={styles.resultsSection}>
                    <div className={styles.resultsHeader}>
                        <h2>成績処理結果</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span className={styles.studentCount}>{grades.length}名</span>
                            <button
                                onClick={saveToDatabase}
                                disabled={saving}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: saving ? '#ccc' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {saving ? '保存中...' : 'DBに保存'}
                            </button>
                            {saveMessage && <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>{saveMessage}</span>}
                        </div>
                    </div>

                    {/* VIEW MODE TABS */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
                        <button
                            onClick={() => setViewMode('exam')}
                            style={{
                                padding: '10px 20px',
                                borderBottom: viewMode === 'exam' ? '2px solid #3b82f6' : 'none',
                                color: viewMode === 'exam' ? '#3b82f6' : '#6b7280',
                                fontWeight: viewMode === 'exam' ? 'bold' : 'normal',
                                background: 'none', border: 'none', cursor: 'pointer'
                            }}
                        >
                            期末試験結果
                        </button>
                        <button
                            onClick={() => setViewMode('report')}
                            style={{
                                padding: '10px 20px',
                                borderBottom: viewMode === 'report' ? '2px solid #10b981' : 'none',
                                color: viewMode === 'report' ? '#10b981' : '#6b7280',
                                fontWeight: viewMode === 'report' ? 'bold' : 'normal',
                                background: 'none', border: 'none', cursor: 'pointer'
                            }}
                        >
                            成績通知表 (総合成績)
                        </button>
                    </div>

                    <div className={styles.studentList}>
                        {grades.map((student, index) => (
                            <div key={index} className={styles.studentRow}>
                                {/* Header (Keep existing tweaked layout) */}
                                <div className={styles.studentHeader} style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                    <div>
                                        <h3 className={styles.studentName}>
                                            {student.name}
                                            <span className={styles.studentId}>({student.id})</span>
                                        </h3>
                                        <p className={styles.className}>{student.class}</p>
                                    </div>

                                    <div className={styles.totalScoreBadge} style={{ marginLeft: 'auto' }}>
                                        {viewMode === 'exam' ? (
                                            <>
                                                <span className={styles.totalLabel}>期末試験（合計）</span>
                                                <span className={styles.totalValue} style={{ color: '#3b82f6' }}>
                                                    {calculateFinalExamGrade(student.finalExamSum / 6)}
                                                    <span style={{ fontSize: '0.6em', marginLeft: '6px', opacity: 0.8, color: '#1f2937' }}>
                                                        ({student.finalExamSum})
                                                    </span>
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span className={styles.totalLabel}>総合成績（合計）</span>
                                                <span className={styles.totalValue} style={{ color: '#10b981' }}>
                                                    {calculateGrade(student.reportCardTotal)}
                                                    <span style={{ fontSize: '0.6em', marginLeft: '6px', opacity: 0.8, color: '#1f2937' }}>
                                                        ({student.reportCardTotal.toFixed(1)})
                                                    </span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* CONTENT AREA BASED ON TAB */}
                                <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', padding: '20px 0' }}>

                                    {/* CHART */}
                                    <div style={{ flex: '1', maxWidth: '500px' }}>
                                        {viewMode === 'exam' ? (
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
                                                        data={['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(k => student.finalExam[k])}
                                                        title="期末試験"
                                                        color="blue"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.chartWrapper}>
                                                <h4 className={styles.chartTitle}>
                                                    成績通知表 (総合成績)
                                                    <span style={{ fontSize: '0.8em', marginLeft: '8px', color: '#6b7280' }}>
                                                        (合計: {student.reportDetails.overall.total.toFixed(1)})
                                                    </span>
                                                </h4>
                                                <div className={styles.chartContainer}>
                                                    <RadarChart
                                                        labels={categories}
                                                        data={['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation'].map(k => student.reportDetails[k].total)}
                                                        title="総合成績"
                                                        color="green"
                                                        min={50}
                                                        stepSize={10}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* TABLE */}
                                    <div style={{ flex: '1', paddingTop: '40px' }}>
                                        {viewMode === 'exam' ? (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', backgroundColor: '#f3f4f6' }}>
                                                        <th style={{ padding: '8px' }}>科目</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>点数 (100点満点)</th>
                                                        <th style={{ padding: '8px', textAlign: 'center' }}>判定</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {categories.map((cat, i) => {
                                                        // Map category name to key
                                                        const keyMap = ['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation']
                                                        const val = student.finalExam[keyMap[i]] || 0
                                                        return (
                                                            <tr key={cat} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                <td style={{ padding: '8px' }}>{cat}</td>
                                                                <td style={{ padding: '8px', textAlign: 'right' }}>{val}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{calculateFinalExamGrade(val)}</td>
                                                            </tr>
                                                        )
                                                    })}
                                                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #e5e7eb', backgroundColor: '#eff6ff' }}>
                                                        <td style={{ padding: '12px 8px' }}>合計</td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>{student.finalExamSum} / 600</td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{calculateFinalExamGrade(student.finalExamSum / 6)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        ) : (
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'center', backgroundColor: '#f3f4f6' }}>
                                                        <th style={{ padding: '8px', textAlign: 'left' }}>科目</th>
                                                        <th style={{ padding: '8px' }}>基礎点(70)</th>
                                                        <th style={{ padding: '8px' }}>出席点(15)</th>
                                                        <th style={{ padding: '8px' }}>平常点(15)</th>
                                                        <th style={{ padding: '8px', fontWeight: 'bold' }}>合計(100)</th>
                                                        <th style={{ padding: '8px' }}>判定</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Subjects */}
                                                    {categories.map((cat, i) => {
                                                        const keyMap = ['vocab', 'listening', 'reading', 'grammar', 'writing', 'conversation']
                                                        const details = student.reportDetails[keyMap[i]]
                                                        return (
                                                            <tr key={cat} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                                <td style={{ padding: '8px' }}>{cat}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center' }}>{details.base?.toFixed(1)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center' }}>{student.reportDetails.attendance?.toFixed(1)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center' }}>{student.reportDetails.participation?.toFixed(1)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{details.total?.toFixed(1)}</td>
                                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{calculateGrade(details.total)}</td>
                                                            </tr>
                                                        )
                                                    })}

                                                    {/* Total */}
                                                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid #e5e7eb', backgroundColor: '#f0fdf4' }}>
                                                        <td style={{ padding: '12px 8px' }}>総合</td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}></td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{student.reportDetails.overall.total.toFixed(1)} / 100</td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>{calculateGrade(student.reportDetails.overall.total)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        )}
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
