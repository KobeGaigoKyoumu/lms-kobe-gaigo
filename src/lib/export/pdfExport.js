'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * 個人成績証明書をPDFとしてエクスポート
 * @param {Object} student - 学生データ
 * @param {string} yearTerm - 学期
 */
export function exportStudentGradeToPDF(student, yearTerm) {
    if (!student) {
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

    // PDFドキュメント作成（A4サイズ）
    const doc = new jsPDF('p', 'mm', 'a4')

    // フォント設定（日本語対応のため標準フォントを使用）
    doc.setFont('helvetica')

    // ヘッダー
    doc.setFontSize(18)
    doc.text('Grade Report / 成績通知書', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.text(`Issue Date: ${new Date().toLocaleDateString('ja-JP')}`, 105, 28, { align: 'center' })

    // 学生情報
    doc.setFontSize(12)
    doc.text(`Student ID / 学籍番号: ${student.student_id_text || '-'}`, 20, 45)
    doc.text(`Name / 氏名: ${student.student_name || '-'}`, 20, 52)
    doc.text(`Class / クラス: ${student.class_name || '-'}`, 20, 59)
    doc.text(`Term / 学期: ${yearTerm || '-'}`, 20, 66)

    // 成績サマリー
    doc.setFontSize(14)
    doc.text('Grade Summary / 成績概要', 20, 80)

    const summaryData = [
        ['Final Exam / 期末試験', `${student.final_exam_total || 0} / 600`],
        ['Report Card / 成績評価', `${student.report_card_total || 0} / 100`],
        ['Grade / 評価', calculateGrade(student.report_card_total)]
    ]

    autoTable(doc, {
        startY: 85,
        head: [['項目 / Item', '結果 / Result']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 }
    })

    // 科目別詳細（データがある場合）
    if (student.report_card_data) {
        const subjectNames = {
            'vocab': 'Vocabulary / 語彙',
            'grammar': 'Grammar / 文法',
            'reading': 'Reading / 読解',
            'listening': 'Listening / 聴解',
            'writing': 'Writing / 作文',
            'conversation': 'Conversation / 会話'
        }

        const subjectData = Object.entries(student.report_card_data)
            .filter(([key]) => subjectNames[key])
            .map(([key, data]) => [
                subjectNames[key] || key,
                data.base?.toFixed(1) || '0',
                data.attendance || '0',
                data.participation || '0',
                data.total?.toFixed(1) || '0'
            ])

        if (subjectData.length > 0) {
            doc.setFontSize(14)
            doc.text('Subject Details / 科目別詳細', 20, doc.lastAutoTable.finalY + 15)

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 20,
                head: [['科目 / Subject', '基礎点', '出席', '参加', '合計']],
                body: subjectData,
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                margin: { left: 20, right: 20 }
            })
        }
    }

    // フッター
    const pageHeight = doc.internal.pageSize.height
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text('This document is automatically generated. / この書類は自動生成されたものです。', 105, pageHeight - 15, { align: 'center' })
    doc.text('Kobe Gaigo LMS', 105, pageHeight - 10, { align: 'center' })

    // ファイル名を生成
    const fileName = `成績証明書_${student.student_id_text}_${yearTerm}.pdf`

    // PDFを保存
    doc.save(fileName)
}
