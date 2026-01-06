'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * 個人成績証明書をPDF出力（日本語対応）
 * @param {Object} student - 学生データ
 * @param {string} yearTerm - 学期
 */
export function exportStudentGradeToPDF(student, yearTerm) {
    if (!student) {
        alert('エクスポートするデータがありません')
        return
    }

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

    // 科目名マッピング
    const subjectNames = {
        'vocab': '語彙',
        'grammar': '文法',
        'reading': '読解',
        'listening': '聴解',
        'writing': '作文',
        'conversation': '会話'
    }

    // 科目データを整形
    const subjectRows = student.report_card_data
        ? Object.entries(student.report_card_data)
            .filter(([key]) => subjectNames[key])
            .map(([key, data]) => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #d1d5db;">${subjectNames[key]}</td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${typeof data.base === 'number' ? data.base.toFixed(1) : '0'}</td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${typeof data.total === 'number' ? data.total.toFixed(1) : '0'}</td>
                </tr>
            `).join('')
        : ''

    // HTMLコンテンツを作成
    const htmlContent = `
        <div style="font-family: 'Meiryo', 'MS Gothic', sans-serif; padding: 40px; width: 600px; background: white;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 24px; margin: 0 0 5px 0;">成績証明書</h1>
                <div style="font-size: 14px; color: #6b7280;">神戸外語専門学校</div>
                <div style="font-size: 12px; color: #9ca3af; margin-top: 5px;">発行日: ${new Date().toLocaleDateString('ja-JP')}</div>
            </div>

            <div style="margin-bottom: 25px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                <h3 style="font-size: 14px; color: #374151; margin: 0 0 10px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">学生情報</h3>
                <table style="width: 100%; font-size: 13px;">
                    <tr><td style="padding: 3px 0; color: #6b7280;">学籍番号:</td><td>${student.student_id_text || '-'}</td></tr>
                    <tr><td style="padding: 3px 0; color: #6b7280;">氏名:</td><td>${student.student_name || '-'}</td></tr>
                    <tr><td style="padding: 3px 0; color: #6b7280;">クラス:</td><td>${student.class_name || '-'}</td></tr>
                    <tr><td style="padding: 3px 0; color: #6b7280;">学期:</td><td>${yearTerm || '-'}</td></tr>
                </table>
            </div>

            <div style="margin-bottom: 25px;">
                <h3 style="font-size: 14px; color: #374151; margin: 0 0 10px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">成績概要</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #3b82f6; color: white;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #3b82f6;">項目</th>
                            <th style="padding: 10px; text-align: center; border: 1px solid #3b82f6;">結果</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="padding: 8px; border: 1px solid #d1d5db;">期末試験</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${student.final_exam_total || 0} / 600</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #d1d5db;">成績評価</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${student.report_card_total || 0} / 100</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #d1d5db;">出席点</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${typeof attendanceScore === 'number' ? attendanceScore.toFixed(1) : attendanceScore}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #d1d5db;">参加点</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${typeof participationScore === 'number' ? participationScore.toFixed(1) : participationScore}</td></tr>
                        <tr style="background: #f0f9ff;"><td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">総合評価</td><td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold; font-size: 18px;">${calculateGrade(student.report_card_total)}</td></tr>
                    </tbody>
                </table>
            </div>

            ${subjectRows ? `
            <div style="margin-bottom: 25px;">
                <h3 style="font-size: 14px; color: #374151; margin: 0 0 10px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">科目別詳細</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: #3b82f6; color: white;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #3b82f6;">科目</th>
                            <th style="padding: 10px; text-align: center; border: 1px solid #3b82f6;">基礎点</th>
                            <th style="padding: 10px; text-align: center; border: 1px solid #3b82f6;">合計</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subjectRows}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <div>この書類は神戸外語LMSにより自動生成されました。</div>
                <div>正式な証明書が必要な場合は事務局にお問い合わせください。</div>
            </div>
        </div>
    `

    // 一時的なdivを作成
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '0'
    document.body.appendChild(tempDiv)

    // html2canvasでキャンバスに変換
    html2canvas(tempDiv.firstChild, {
        scale: 2,
        useCORS: true,
        logging: false
    }).then(canvas => {
        // PDFを作成
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgData = canvas.toDataURL('image/png')

        // A4サイズに合わせて画像を配置
        const pageWidth = 210
        const pageHeight = 297
        const imgWidth = pageWidth - 20
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)

        // ファイル名を生成
        const safeYearTerm = yearTerm ? yearTerm.replace(/\s/g, '_') : 'unknown'
        const fileName = `成績証明書_${student.student_id_text}_${safeYearTerm}.pdf`

        pdf.save(fileName)

        // 一時divを削除
        document.body.removeChild(tempDiv)
    }).catch(err => {
        console.error('PDF生成エラー:', err)
        alert('PDF生成に失敗しました')
        document.body.removeChild(tempDiv)
    })
}
