'use client'

import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

/**
 * クラス成績一覧をExcelファイルとしてエクスポート
 * @param {Array} records - 成績レコードの配列
 * @param {string} className - クラス名
 * @param {string} yearTerm - 学期
 */
export function exportGradesToExcel(records, className, yearTerm) {
    if (!records || records.length === 0) {
        alert('エクスポートするデータがありません')
        return
    }

    // 評価計算関数
    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    // データを整形
    const data = records.map(record => ({
        '学籍番号': record.student_id_text,
        '氏名': record.student_name,
        'クラス': record.class_name,
        '期末試験(600点満点)': record.final_exam_total,
        '成績評価(100点満点)': record.report_card_total,
        '評価': calculateGrade(record.report_card_total),
        '登録日': new Date(record.created_at).toLocaleDateString('ja-JP')
    }))

    // ワークブック作成
    const wb = XLSX.utils.book_new()

    // シート1: 成績一覧
    const ws = XLSX.utils.json_to_sheet(data)

    // 列幅を設定
    ws['!cols'] = [
        { wch: 12 },  // 学籍番号
        { wch: 20 },  // 氏名
        { wch: 10 },  // クラス
        { wch: 18 },  // 期末試験
        { wch: 18 },  // 成績評価
        { wch: 6 },   // 評価
        { wch: 12 }   // 登録日
    ]

    XLSX.utils.book_append_sheet(wb, ws, '成績一覧')

    // ファイル名を生成
    const fileName = `成績一覧_${yearTerm}_${className}_${new Date().toISOString().split('T')[0]}.xlsx`

    // Excelファイルとして出力
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, fileName)
}
