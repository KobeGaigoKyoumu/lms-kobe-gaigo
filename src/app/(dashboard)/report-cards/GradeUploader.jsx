'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import styles from './page.module.css'
import RadarChart from './RadarChart'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { saveGradeRecords } from '@/app/actions/gradeRecords'

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

                    // 1. 期末試験データ (Raw values for calculation)
                    const rawExam = {
                        vocab: parseFloat(row[examColMap.vocab]) || 0,
                        listening: parseFloat(row[examColMap.listening]) || 0,
                        reading: parseFloat(row[examColMap.reading]) || 0,
                        grammar: parseFloat(row[examColMap.grammar]) || 0,
                        writing: parseFloat(row[examColMap.writing]) || 0,
                        conversation: parseFloat(row[examColMap.conversation]) || 0,
                    }

                    // Final Exam Data (For DB storage - modified as needed)
                    // Copy raw values initially
                    const finalExam = { ...rawExam }

                    // User Request: Multiplier for 2020-2023
                    // Conversation and Writing scores in FINAL EXAM DATA are multiplied by 4
                    if (selectedYear >= 2020 && selectedYear <= 2023) {
                        finalExam.writing = rawExam.writing * 4
                        finalExam.conversation = rawExam.conversation * 4
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

                            // IMPORTANT: Use RAW score for calculation to match raw MaxScores
                            // (Even if finalExam is multiplied, the curve calculation needs original scale)
                            const score = rawExam[subjectKey]
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

            // Prepare records for bulk save
            const recordsToSave = grades.map(student => ({
                student_id_text: String(student.id),
                student_name: student.name,
                class_name: student.class,
                year_term: yearTerm,
                final_exam_data: student.finalExam,
                report_card_data: student.reportDetails,
                final_exam_total: student.finalExamSum,
                report_card_total: student.reportCardTotal,
                updated_at: new Date().toISOString()
            }))

            const { success, errors } = await saveGradeRecords(recordsToSave, yearTerm)

            if (errors && errors.length > 0) {
                console.error('Some errors occurred:', errors)
                setSaveMessage(`一部のデータ保存に失敗しました (${errors.length}件のエラー)`)
            } else {
                setSaveMessage(`${success}件のデータを保存しました (学期: ${yearTerm})`)
            }

        } catch (err) {
            console.error(err)
            setSaveMessage('保存中にエラーが発生しました')
        } finally {
            setSaving(false)
        }
    }

    // ... (Existing variables)
    const [jlptFiles, setJlptFiles] = useState([])
    const [jlptData, setJlptData] = useState([])
    const [jlptLoading, setJlptLoading] = useState(false)
    const [jlptSaving, setJlptSaving] = useState(false)
    const [jlptSaveMessage, setJlptSaveMessage] = useState('')
    const jlptFileInputRef = useRef(null)

    // ... (Existing handlers)

    // ... (Lines 484-765 remain unchanged) ...
    // Note: I will replace only saveToDatabase and saveJlptToDatabase. 
    // Wait, the previous tool call viewed up to line 800, so I can see saveJlptToDatabase starts at 766.
    // I need to reuse handleJlptDrop etc which are in the middle.
    // I will replace saveToDatabase only first, then separate call for saveJlptToDatabase?
    // replace_file_content supports replacing a block.
    // I can replacing saveToDatabase block. And then saveJlptToDatabase block.
    // Actually, I can replace the whole chunk if contiguous. But the middle parts (handlers, parse) are huge.
    // I will replace saveToDatabase first.

    // START REPLACEMENT for saveToDatabase ONLY
    // But I will output only saveToDatabase content here? 
    // The instructions say "Update GradeUploader ... in saveToDatabase and saveJlptToDatabase". 
    // I'll do saveToDatabase first. Then saveJlptToDatabase in next tool call or same if I can target ranges.
    // replace_file_content works on a single contiguous block.

    // Let's do saveToDatabase (428-472)
    // AND then I need to do saveJlptToDatabase (766-819+)

    // Let's split into two calls.




    // ... (Existing handlers)

    const handleJlptDrop = (e) => {
        e.preventDefault()
        const droppedFiles = Array.from(e.dataTransfer.files)
        const validFiles = droppedFiles.filter(f => f.name.endsWith('.xlsx'))
        if (validFiles.length > 0) {
            setJlptFiles(prev => [...prev, ...validFiles])
            setError('')
        }
    }

    const handleJlptFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length > 0) {
            setJlptFiles(prev => [...prev, ...selectedFiles])
            setError('')
        }
    }

    const removeJlptFile = (index) => {
        setJlptFiles(prev => prev.filter((_, i) => i !== index))
    }

    const parseJlptExcel = async () => {
        if (jlptFiles.length === 0) return
        setJlptLoading(true)
        setError('')
        setJlptData([])

        let allResults = []
        let errors = []

        try {
            for (const file of jlptFiles) {
                const data = await file.arrayBuffer()
                const workbook = XLSX.read(data)

                // --- 1. 設定シートから使用教材名を読み取る ---
                let textbookName = ''
                const settingsSheet = workbook.Sheets['設定']
                if (settingsSheet) {
                    const settingsRows = XLSX.utils.sheet_to_json(settingsSheet, { header: 1 })
                    if (settingsRows.length >= 2 && settingsRows[1] && settingsRows[1][0]) {
                        textbookName = String(settingsRows[1][0]).trim()
                    }
                }

                // --- 2. レベル別情報シートから合格点・基準点を読み取る ---
                let levelInfo = {}
                const levelSheet = workbook.Sheets['レベル別情報']
                if (levelSheet) {
                    const levelRows = XLSX.utils.sheet_to_json(levelSheet, { header: 1 })
                    for (let i = 1; i < levelRows.length; i++) {
                        const row = levelRows[i]
                        if (!row || !row[0]) continue
                        levelInfo[String(row[0]).trim()] = {
                            level: String(row[0]).trim(),
                            criteria1Name: row[1] || '',
                            criteria1Score: parseFloat(row[2]) || 0,
                            criteria2Name: row[3] || '',
                            criteria2Score: parseFloat(row[4]) || 0,
                            criteria3Name: row[5] || '',
                            criteria3Score: parseFloat(row[6]) || 0,
                            passingScore: parseFloat(row[7]) || 0,
                        }
                    }
                }

                // --- 3. 集計シートからレベルとスコアを読み取る ---
                const summarySheet = workbook.Sheets['集計']
                if (!summarySheet) {
                    errors.push(`${file.name}: 集計シートが見つかりませんでした。`)
                    continue
                }
                const summaryRows = XLSX.utils.sheet_to_json(summarySheet, { header: 1 })

                let level = ''
                if (summaryRows[0] && summaryRows[0][1]) {
                    level = String(summaryRows[0][1]).trim()
                }

                // ヘッダーから動的に列を特定
                const headerRow = summaryRows[1] || []
                const findCol = (keywords) => {
                    for (let c = 0; c < headerRow.length; c++) {
                        const h = String(headerRow[c] || '')
                        if (keywords.every(kw => h.includes(kw))) return c
                    }
                    return -1
                }

                const vocabCorrectCol = findCol(['文字', '語彙', '正解'])
                const vocabScoreCol = vocabCorrectCol >= 0 ? vocabCorrectCol + 1 : findCol(['文字', '語彙'])
                const grammarCorrectCol = findCol(['文法', '正解'])
                const grammarScoreCol = grammarCorrectCol >= 0 ? grammarCorrectCol + 1 : -1
                const readingCorrectCol = findCol(['読解', '正解'])
                const readingScoreCol = readingCorrectCol >= 0 ? readingCorrectCol + 1 : -1
                const gramReadCorrectCol = findCol(['文法', '読解', '正解'])
                const gramReadScoreCol = gramReadCorrectCol >= 0 ? gramReadCorrectCol + 1 : -1
                const listeningCorrectCol = findCol(['聴解', '正解'])
                const listeningScoreCol = listeningCorrectCol >= 0 ? listeningCorrectCol + 1 : -1
                const totalCol = findCol(['合計'])
                const resultCol = findCol(['合否'])
                const rankCol = findCol(['順位'])
                const judgment1Col = findCol(['判定1'])
                const judgment2Col = findCol(['判定2'])
                const judgment3Col = findCol(['判定3'])

                // --- 4. 受験者シートから学生情報を読み取る ---
                const examineesSheet = workbook.Sheets['受験者']
                const examineesMap = new Map()
                if (examineesSheet) {
                    const examineesRows = XLSX.utils.sheet_to_json(examineesSheet, { header: 1 })
                    for (let i = 1; i < examineesRows.length; i++) {
                        const row = examineesRows[i]
                        if (!row || !row[0]) continue
                        const sid = String(row[0]).trim()
                        examineesMap.set(sid, {
                            student_id: sid,
                            class_name: row[1] ? String(row[1]).trim() : '',
                            attendance_no: row[2] ? String(row[2]).trim() : '',
                            name: row[3] ? String(row[3]).trim() : '',
                        })
                    }
                }

                // --- 5. 解答入力シートから問題別解答を読み取る ---
                const answerSheet = workbook.Sheets['解答入力']
                let answerDetails = []
                if (answerSheet) {
                    const answerRows = XLSX.utils.sheet_to_json(answerSheet, { header: 1 })
                    const row1 = answerRows[1] || []
                    let correctAnswerCol = -1
                    for (let c = 0; c < row1.length; c++) {
                        if (String(row1[c] || '') === '正答') {
                            correctAnswerCol = c
                            break
                        }
                    }

                    const studentColMap = new Map()
                    const examineesArr = Array.from(examineesMap.values())
                    for (let c = 0; c < row1.length; c++) {
                        const cellVal = String(row1[c] || '').trim()
                        if (!cellVal) continue
                        const matchStudent = examineesArr.find(s => s.name === cellVal)
                        if (matchStudent && !studentColMap.has(matchStudent.student_id)) {
                            studentColMap.set(matchStudent.student_id, c)
                        }
                    }

                    for (let i = 2; i < answerRows.length; i++) {
                        const row = answerRows[i]
                        if (!row || row.length < 2) continue
                        const subject = String(row[0] || '').trim()
                        const questionNo = row[1]
                        if (!subject || questionNo === undefined || questionNo === null || questionNo === '') continue

                        const correctAnswer = correctAnswerCol >= 0 ? row[correctAnswerCol] : null
                        const studentAnswers = {}
                        for (const [sid, col] of studentColMap.entries()) {
                            const selected = row[col]
                            const isCorrect = selected !== undefined && selected !== null && selected !== '' &&
                                correctAnswer !== undefined && correctAnswer !== null &&
                                String(selected) === String(correctAnswer)
                            studentAnswers[sid] = {
                                selected: selected !== undefined && selected !== null ? String(selected) : '',
                                isCorrect
                            }
                        }
                        answerDetails.push({
                            subject,
                            questionNo: String(questionNo),
                            correctAnswer: correctAnswer !== undefined && correctAnswer !== null ? String(correctAnswer) : '',
                            studentAnswers,
                        })
                    }
                }

                // --- 6. 集計シートのデータ行をパース ---
                const fileNameParts = file.name.split('_')
                const dateStr = fileNameParts[0]
                const examName = fileNameParts.length > 2 ? fileNameParts.slice(2).join('_').replace('.xlsx', '').replace('.xlsm', '') : 'JLPT Mock'
                const formattedDate = dateStr.length >= 8
                    ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
                    : dateStr

                const getSubjectCorrectCounts = (studentId) => {
                    const subjects = {}
                    for (const detail of answerDetails) {
                        const subName = detail.subject
                        if (!subjects[subName]) subjects[subName] = { correct: 0, total: 0 }
                        subjects[subName].total++
                        if (detail.studentAnswers[studentId]?.isCorrect) subjects[subName].correct++
                    }
                    return subjects
                }

                const currentLevelInfo = levelInfo[level] || null

                for (let i = 2; i < summaryRows.length; i++) {
                    const row = summaryRows[i]
                    if (!row || !row[0]) continue
                    const sid = String(row[0]).trim()
                    if (!sid || isNaN(parseInt(sid))) continue

                    const studentInfo = examineesMap.get(sid) || {}
                    const vocabScore = vocabScoreCol >= 0 ? (parseFloat(row[vocabScoreCol]) || 0) : 0
                    const grammarScore = grammarScoreCol >= 0 ? (parseFloat(row[grammarScoreCol]) || 0) : 0
                    const readingScore = readingScoreCol >= 0 ? (parseFloat(row[readingScoreCol]) || 0) : 0
                    const gramReadScore = gramReadScoreCol >= 0 ? (parseFloat(row[gramReadScoreCol]) || 0) : 0
                    const listeningScore = listeningScoreCol >= 0 ? (parseFloat(row[listeningScoreCol]) || 0) : 0
                    const totalScore = totalCol >= 0 ? (parseFloat(row[totalCol]) || 0) : 0
                    const resultVal = resultCol >= 0 ? (row[resultCol] || '-') : '-'
                    const rank = rankCol >= 0 ? (row[rankCol] || '-') : '-'
                    const j1 = judgment1Col >= 0 ? (row[judgment1Col] || '') : ''
                    const j2 = judgment2Col >= 0 ? (row[judgment2Col] || '') : ''
                    const j3 = judgment3Col >= 0 ? (row[judgment3Col] || '') : ''
                    const vocabCorrect = vocabCorrectCol >= 0 ? (parseFloat(row[vocabCorrectCol]) || 0) : 0
                    const grammarCorrect = grammarCorrectCol >= 0 ? (parseFloat(row[grammarCorrectCol]) || 0) : 0
                    const readingCorrect = readingCorrectCol >= 0 ? (parseFloat(row[readingCorrectCol]) || 0) : 0
                    const gramReadCorrect = gramReadCorrectCol >= 0 ? (parseFloat(row[gramReadCorrectCol]) || 0) : 0
                    const listeningCorrect = listeningCorrectCol >= 0 ? (parseFloat(row[listeningCorrectCol]) || 0) : 0
                    const subjectCorrectCounts = getSubjectCorrectCounts(sid)

                    const getEval = (score, maxScore) => {
                        if (!maxScore || maxScore <= 0) return '-'
                        const rate = score / maxScore
                        if (rate <= 1 / 3) return 'C'
                        if (rate <= 2 / 3) return 'B'
                        return 'A'
                    }

                    let vocabMax = 60, grammarMax = 60, readingMax = 60, listeningMax = 60
                    if (level === 'N4' || level === 'N5') {
                        vocabMax = 120; grammarMax = 0; readingMax = 0; listeningMax = 60
                    }

                    const studentAnswerDetails = answerDetails.map(d => ({
                        subject: d.subject, questionNo: d.questionNo, correctAnswer: d.correctAnswer,
                        selected: d.studentAnswers[sid]?.selected || '',
                        isCorrect: d.studentAnswers[sid]?.isCorrect || false,
                    }))

                    allResults.push({
                        student_id: sid,
                        name: studentInfo.name || row[3] || '',
                        class_name: studentInfo.class_name || row[1] || '',
                        attendance_no: studentInfo.attendance_no || row[2] || '',
                        exam_date: formattedDate, exam_name: examName, level, textbook: textbookName,
                        vocab: vocabScore, vocabCorrect,
                        grammar: grammarScore, grammarCorrect,
                        reading: readingScore, readingCorrect,
                        grammarReading: gramReadScore, grammarReadingCorrect: gramReadCorrect,
                        listening: listeningScore, listeningCorrect,
                        total: totalScore, result: resultVal, rank,
                        judgments: [j1, j2, j3], levelInfo: currentLevelInfo,
                        subjectCorrectCounts, answerDetails: studentAnswerDetails,
                        vocabEval: getEval(vocabScore, vocabMax),
                        grammarEval: getEval(grammarScore, grammarMax > 0 ? grammarMax : 60),
                        readingEval: getEval(readingScore, readingMax > 0 ? readingMax : 60),
                        grammarReadingEval: getEval(gramReadScore, level === 'N4' || level === 'N5' ? 120 : 60),
                        listeningEval: getEval(listeningScore, listeningMax),
                        filename: file.name
                    })
                }
            }

            if (allResults.length === 0) {
                setError('有効なデータが見つかりませんでした')
            } else {
                setJlptData(allResults)
            }
            if (errors.length > 0) setError(errors.join('\n'))

        } catch (err) {
            console.error(err)
            setError('解析エラー: ' + err.message)
        } finally {
            setJlptLoading(false)
        }
    }

    const saveJlptToDatabase = async () => {
        if (!jlptData || jlptData.length === 0) return
        setJlptSaving(true)
        setJlptSaveMessage('')

        try {
            // Prepare records for bulk save
            const recordsToSave = jlptData.map(record => {
                const termKey = `JLPT ${record.exam_date} ${record.exam_name}`

                const jlptScores = {
                    vocab: record.vocab, vocabCorrect: record.vocabCorrect, vocabEval: record.vocabEval,
                    grammar: record.grammar, grammarCorrect: record.grammarCorrect, grammarEval: record.grammarEval,
                    reading: record.reading, readingCorrect: record.readingCorrect, readingEval: record.readingEval,
                    grammarReading: record.grammarReading, grammarReadingCorrect: record.grammarReadingCorrect, grammarReadingEval: record.grammarReadingEval,
                    listening: record.listening, listeningCorrect: record.listeningCorrect, listeningEval: record.listeningEval,
                    total: record.total, result: record.result, rank: record.rank,
                    judgments: record.judgments, level: record.level, textbook: record.textbook,
                    levelInfo: record.levelInfo, type: 'JLPT'
                }

                const detailData = {
                    answerDetails: record.answerDetails,
                    subjectCorrectCounts: record.subjectCorrectCounts,
                }

                return {
                    student_id_text: record.student_id,
                    student_name: record.name,
                    class_name: record.class_name || 'JLPT',
                    year_term: termKey,
                    final_exam_data: jlptScores,
                    report_card_data: detailData,
                    final_exam_total: record.total,
                    report_card_total: 0,
                    updated_at: new Date().toISOString()
                }
            })

            const { success, errors } = await saveGradeRecords(recordsToSave, `JLPT Batch`)

            if (errors && errors.length > 0) {
                console.error('JLPT Save errors:', errors)
                setJlptSaveMessage(`一部のデータ保存に失敗しました`)
            } else {
                setJlptSaveMessage(`${success}件のJLPTデータを保存しました`)
            }

        } catch (err) {
            console.error(err)
            setJlptSaveMessage('保存エラー')
        } finally {
            setJlptSaving(false)
        }
    }

    return (
        <div>
            <div className={styles.uploadContainer}>
                {/* --- EXISTING GRADE UPLOAD SECTION --- */}
                <div className={styles.uploadSection}>
                    <h2>成績評価シートをアップロード</h2>
                    {/* ... existing code ... */}
                    {/* (Keep existing JSX for Grade Upload) */}
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
                                <option value="通算">通算</option>
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
                </div>

                {/* --- JLPT UPLOAD SECTION (NEW) --- */}
                <div className={styles.uploadSection}>
                    <h2>JLPT模擬試験スコアシートをアップロード</h2>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
                        ファイル名形式: YYYYMMDD_クラス_試験名.xlsx (例: 20250205_1-13_N4再々試験①.xlsx)
                    </p>

                    <div
                        className={`${styles.dropzone} ${jlptFiles.length > 0 ? styles.active : ''}`}
                        onDrop={handleJlptDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => jlptFileInputRef.current?.click()}
                        style={{ borderColor: '#10b981', backgroundColor: jlptFiles.length > 0 ? '#ecfdf5' : 'white' }}
                    >
                        <input
                            ref={jlptFileInputRef}
                            type="file"
                            accept=".xlsx"
                            multiple
                            onChange={handleJlptFileSelect}
                            style={{ display: 'none' }}
                        />
                        <svg className={styles.dropzoneIcon} viewBox="0 0 48 48" fill="none" stroke="#10b981" strokeWidth="1.5">
                            <path d="M14 24l10-10 10 10" />
                            <path d="M24 14v20" />
                            <path d="M8 40h32" />
                        </svg>
                        <p className={styles.dropzoneText}>
                            JLPTファイルをドラッグ＆ドロップ または クリック
                        </p>
                    </div>

                    {jlptFiles.length > 0 && (
                        <div className={styles.fileList} style={{ marginTop: '15px' }}>
                            {jlptFiles.map((f, i) => (
                                <div key={i} className={styles.fileName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: '#ecfdf5', marginBottom: '5px', borderRadius: '4px' }}>
                                    <span>{f.name}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeJlptFile(i); }}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={parseJlptExcel}
                        disabled={jlptFiles.length === 0 || jlptLoading}
                        className={styles.parseBtn}
                        style={{ backgroundColor: '#10b981' }}
                    >
                        {jlptLoading ? '解析中...' : 'JLPTデータを読み込む'}
                    </button>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* --- RESULTS SECTION (EXISTING) --- */}
            {grades.length > 0 && (
                <div className={styles.resultsSection}>
                    {/* ... (Existing Results UI) ... */}
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
                                <div className={styles.studentHeader} style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                    <div>
                                        <h3 className={styles.studentName}>
                                            {student.name}
                                            <span className={styles.studentId}>({student.id})</span>
                                        </h3>
                                        <p className={styles.className}>{student.class}</p>
                                    </div>
                                    {/* ... badge ... */}
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
                                {/* ... content (charts/tables) ... */}
                                <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', padding: '20px 0' }}>
                                    {/* CHART */}
                                    <div style={{ flex: '1', maxWidth: '500px' }}>
                                        {viewMode === 'exam' ? (
                                            <div className={styles.chartWrapper}>
                                                <h4 className={styles.chartTitle}>期末試験結果</h4>
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
                                                <h4 className={styles.chartTitle}>総合成績</h4>
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
                                                {/* ... exam table ... */}
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left', backgroundColor: '#f3f4f6' }}>
                                                        <th style={{ padding: '8px' }}>科目</th>
                                                        <th style={{ padding: '8px', textAlign: 'right' }}>点数 (100点満点)</th>
                                                        <th style={{ padding: '8px', textAlign: 'center' }}>判定</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {categories.map((cat, i) => {
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
                                                {/* ... report table ... */}
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

            {/* --- JLPT RESULTS (NEW/REWRITTEN) --- */}
            {jlptData.length > 0 && (
                <div className={styles.resultsSection}>
                    <div className={styles.resultsHeader}>
                        <h2>JLPT処理結果</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span className={styles.studentCount}>{jlptData.length}件</span>
                            <button
                                onClick={saveJlptToDatabase}
                                disabled={jlptSaving}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: jlptSaving ? '#ccc' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: jlptSaving ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {jlptSaving ? '保存中...' : 'JLPT成績を保存'}
                            </button>
                            {jlptSaveMessage && <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold' }}>{jlptSaveMessage}</span>}
                        </div>
                    </div>

                    {/* Common Info Bar */}
                    {jlptData[0] && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            marginBottom: '20px',
                            fontSize: '0.9rem',
                            color: '#475569'
                        }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                                {jlptData[0].level && <div><strong>レベル:</strong> {jlptData[0].level}</div>}
                                {jlptData[0].textbook && <div><strong>使用教材:</strong> {jlptData[0].textbook}</div>}
                                {jlptData[0].exam_date && <div><strong>試験日:</strong> {jlptData[0].exam_date}</div>}
                                {jlptData[0].levelInfo && (
                                    <>
                                        <div><strong>合格点:</strong> {jlptData[0].levelInfo.passingScore}点</div>
                                        <div>
                                            <strong>基準点:</strong> {jlptData[0].levelInfo.criteria1Name}({jlptData[0].levelInfo.criteria1Score})
                                            {jlptData[0].levelInfo.criteria2Name && ` / ${jlptData[0].levelInfo.criteria2Name}(${jlptData[0].levelInfo.criteria2Score})`}
                                            {jlptData[0].levelInfo.criteria3Name && ` / ${jlptData[0].levelInfo.criteria3Name}(${jlptData[0].levelInfo.criteria3Score})`}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={styles.studentList}>
                        {jlptData.map((result, i) => (
                            <div key={i} className={styles.studentRow} style={{ borderLeft: result.result === '○' ? '4px solid #10b981' : '4px solid #ef4444' }}>
                                <div className={styles.studentHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                                            {result.class_name} {result.attendance_no && `${result.attendance_no}番`}
                                        </div>
                                        <h3 className={styles.studentName}>
                                            {result.name}
                                            <span className={styles.studentId}>({result.student_id})</span>
                                        </h3>
                                        <p className={styles.className} style={{ fontSize: '0.85rem' }}>{result.exam_name} ({result.exam_date})</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: result.result === '○' ? '#10b981' : '#ef4444' }}>
                                            {result.result === '○' ? '合格' : result.result === '×' ? '不合格' : result.result}
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1f2937' }}>
                                            合計: {result.total}点
                                            {result.levelInfo && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}> / {result.levelInfo.passingScore}点</span>}
                                        </div>
                                        {result.rank && result.rank !== '-' && (
                                            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>順位: {result.rank}位</div>
                                        )}
                                    </div>
                                </div>

                                {/* Subject Scores Table */}
                                <table style={{ width: '100%', marginTop: '15px', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                                            <th style={{ padding: '8px', border: '1px solid #e5e7eb' }}>科目</th>
                                            <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>得点</th>
                                            <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>正答数</th>
                                            <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>判定</th>
                                            <th style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>評価</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.level === 'N4' || result.level === 'N5' ? (
                                            <>
                                                <tr>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>言語知識（文字・語彙・文法）・読解</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{result.grammarReading} / 120</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.grammarReadingCorrect || (result.vocabCorrect + result.grammarCorrect + result.readingCorrect)} / {result.subjectCorrectCounts?.['文字・語彙']?.total + result.subjectCorrectCounts?.['文法']?.total + result.subjectCorrectCounts?.['読解']?.total || 100}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.judgments?.[0] || result.judgments?.[1] || '-'}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                            backgroundColor: result.grammarReadingEval === 'A' ? '#dcfce7' : result.grammarReadingEval === 'B' ? '#fef9c3' : '#fee2e2',
                                                            color: result.grammarReadingEval === 'A' ? '#166534' : result.grammarReadingEval === 'B' ? '#854d0e' : '#991b1b'
                                                        }}>{result.grammarReadingEval}</span>
                                                    </td>
                                                </tr>
                                            </>
                                        ) : (
                                            <>
                                                <tr>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>言語知識（文字・語彙・文法）</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{result.vocab + result.grammar} / 60</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.vocabCorrect + result.grammarCorrect} / {result.subjectCorrectCounts?.['文字・語彙']?.total + result.subjectCorrectCounts?.['文法']?.total || 60}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.judgments?.[0] || '-'}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                            backgroundColor: result.vocabEval === 'A' ? '#dcfce7' : result.vocabEval === 'B' ? '#fef9c3' : '#fee2e2',
                                                            color: result.vocabEval === 'A' ? '#166534' : result.vocabEval === 'B' ? '#854d0e' : '#991b1b'
                                                        }}>{result.vocabEval}</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>読解</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{result.reading} / 60</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.readingCorrect} / {result.subjectCorrectCounts?.['読解']?.total || 25}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.judgments?.[1] || '-'}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                            backgroundColor: result.readingEval === 'A' ? '#dcfce7' : result.readingEval === 'B' ? '#fef9c3' : '#fee2e2',
                                                            color: result.readingEval === 'A' ? '#166534' : result.readingEval === 'B' ? '#854d0e' : '#991b1b'
                                                        }}>{result.readingEval}</span>
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                        <tr>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>聴解</td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{result.listening} / 60</td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.listeningCorrect} / {result.subjectCorrectCounts?.['聴解']?.total || 25}</td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.judgments?.[result.level === 'N4' || result.level === 'N5' ? 1 : 2] || '-'}</td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                                                    backgroundColor: result.listeningEval === 'A' ? '#dcfce7' : result.listeningEval === 'B' ? '#fef9c3' : '#fee2e2',
                                                    color: result.listeningEval === 'A' ? '#166534' : result.listeningEval === 'B' ? '#854d0e' : '#991b1b'
                                                }}>{result.listeningEval}</span>
                                            </td>
                                        </tr>
                                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>合計</td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'right' }}>{result.total} / 180</td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                {Object.values(result.subjectCorrectCounts || {}).reduce((acc, cur) => acc + cur.correct, 0)} / {Object.values(result.subjectCorrectCounts || {}).reduce((acc, cur) => acc + cur.total, 0)}
                                            </td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{result.result === '○' ? '合格' : '不合格'}</td>
                                            <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>-</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Answer Details Table */}
                                {result.answerDetails && result.answerDetails.length > 0 && (
                                    <details style={{ marginTop: '15px' }}>
                                        <summary style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold', fontSize: '0.9rem', padding: '8px 0' }}>
                                            解答詳細を表示
                                        </summary>
                                        <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                                {['文字・語彙', '文法', '読解', '聴解'].map(sub => {
                                                    const subDetails = result.answerDetails.filter(d => d.subject === sub)
                                                    if (subDetails.length === 0) return null
                                                    return (
                                                        <div key={sub} style={{ minWidth: '200px', flex: '1' }}>
                                                            <h4 style={{ fontSize: '0.85rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '8px' }}>
                                                                {sub} ({result.subjectCorrectCounts?.[sub]?.correct} / {result.subjectCorrectCounts?.[sub]?.total})
                                                            </h4>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '4px' }}>
                                                                {subDetails.map((d, idx) => (
                                                                    <div key={idx} style={{
                                                                        padding: '4px',
                                                                        fontSize: '0.7rem',
                                                                        border: '1px solid #e5e7eb',
                                                                        textAlign: 'center',
                                                                        backgroundColor: d.isCorrect ? '#dcfce7' : '#fee2e2',
                                                                        display: 'flex',
                                                                        flexDirection: 'column'
                                                                    }}>
                                                                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{d.questionNo}</div>
                                                                        <div>{d.selected || '-'}</div>
                                                                        <div style={{ fontSize: '0.6rem', color: '#666' }}>({d.correctAnswer})</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </details>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )

}
