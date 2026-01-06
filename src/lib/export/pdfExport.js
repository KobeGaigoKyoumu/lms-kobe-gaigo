'use client'

import { generate } from '@pdfme/generator'

// 日本語対応PDFテンプレート
const createTemplate = (student, yearTerm, attendanceScore, participationScore, calculateGrade, subjectData) => ({
    basePdf: { width: 210, height: 297, padding: [20, 20, 20, 20] },
    schemas: [
        [
            // タイトル
            { name: 'title', type: 'text', position: { x: 75, y: 15 }, width: 60, height: 10, fontSize: 18, fontColor: '#000000', alignment: 'center', fontName: 'NotoSansJP' },
            { name: 'school', type: 'text', position: { x: 60, y: 27 }, width: 90, height: 8, fontSize: 11, fontColor: '#666666', alignment: 'center', fontName: 'NotoSansJP' },
            { name: 'date', type: 'text', position: { x: 60, y: 35 }, width: 90, height: 6, fontSize: 9, fontColor: '#999999', alignment: 'center', fontName: 'NotoSansJP' },

            // 学生情報ヘッダー
            { name: 'infoHeader', type: 'text', position: { x: 20, y: 50 }, width: 50, height: 8, fontSize: 12, fontColor: '#333333', fontName: 'NotoSansJP' },

            // 学生情報
            { name: 'studentId', type: 'text', position: { x: 20, y: 60 }, width: 80, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },
            { name: 'studentName', type: 'text', position: { x: 20, y: 68 }, width: 80, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },
            { name: 'className', type: 'text', position: { x: 20, y: 76 }, width: 80, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },
            { name: 'termInfo', type: 'text', position: { x: 20, y: 84 }, width: 80, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },

            // 成績概要ヘッダー
            { name: 'gradeHeader', type: 'text', position: { x: 20, y: 100 }, width: 50, height: 8, fontSize: 12, fontColor: '#333333', fontName: 'NotoSansJP' },

            // 成績データ
            { name: 'finalExam', type: 'text', position: { x: 20, y: 110 }, width: 170, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },
            { name: 'reportCard', type: 'text', position: { x: 20, y: 118 }, width: 170, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },
            { name: 'attendanceInfo', type: 'text', position: { x: 20, y: 126 }, width: 170, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },
            { name: 'participationInfo', type: 'text', position: { x: 20, y: 134 }, width: 170, height: 6, fontSize: 10, fontColor: '#000000', fontName: 'NotoSansJP' },
            { name: 'overallGrade', type: 'text', position: { x: 20, y: 142 }, width: 170, height: 8, fontSize: 12, fontColor: '#3b82f6', fontName: 'NotoSansJP' },

            // フッター
            { name: 'footer', type: 'text', position: { x: 30, y: 270 }, width: 150, height: 6, fontSize: 8, fontColor: '#999999', alignment: 'center', fontName: 'NotoSansJP' },
        ]
    ]
})

/**
 * 個人成績証明書をPDF出力（日本語対応）
 * @param {Object} student - 学生データ
 * @param {string} yearTerm - 学期
 */
export async function exportStudentGradeToPDF(student, yearTerm) {
    if (!student) {
        alert('エクスポートするデータがありません')
        return
    }

    try {
        // 評価計算
        const calculateGrade = (score) => {
            if (score >= 80) return 'A'
            if (score >= 60) return 'B'
            if (score >= 40) return 'C'
            if (score >= 20) return 'D'
            return 'F'
        }

        // 出席点・参加点を取得
        const attendanceScore = student.report_card_data?.attendance || 0
        const participationScore = student.report_card_data?.participation || 0

        // テンプレートを作成
        const template = createTemplate(student, yearTerm, attendanceScore, participationScore, calculateGrade, null)

        // 入力データ
        const inputs = [{
            title: '成績証明書',
            school: '神戸外語専門学校',
            date: `発行日: ${new Date().toLocaleDateString('ja-JP')}`,
            infoHeader: '■ 学生情報',
            studentId: `学籍番号: ${student.student_id_text || '-'}`,
            studentName: `氏名: ${student.student_name || '-'}`,
            className: `クラス: ${student.class_name || '-'}`,
            termInfo: `学期: ${yearTerm || '-'}`,
            gradeHeader: '■ 成績概要',
            finalExam: `期末試験: ${student.final_exam_total || 0} / 600`,
            reportCard: `成績評価: ${student.report_card_total || 0} / 100`,
            attendanceInfo: `出席点: ${typeof attendanceScore === 'number' ? attendanceScore.toFixed(1) : attendanceScore}`,
            participationInfo: `参加点: ${typeof participationScore === 'number' ? participationScore.toFixed(1) : participationScore}`,
            overallGrade: `総合評価: ${calculateGrade(student.report_card_total)}`,
            footer: 'この書類は神戸外語LMSにより自動生成されました。'
        }]

        // PDF生成
        const pdf = await generate({ template, inputs })

        // ダウンロード
        const blob = new Blob([pdf.buffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const safeYearTerm = yearTerm ? yearTerm.replace(/\s/g, '_') : 'unknown'
        link.download = `成績証明書_${student.student_id_text}_${safeYearTerm}.pdf`
        link.click()
        URL.revokeObjectURL(url)

    } catch (error) {
        console.error('PDF generation error:', error)
        alert('PDFの生成に失敗しました: ' + error.message)
    }
}
