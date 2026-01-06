'use client'

/**
 * 個人成績証明書をPDF出力（サーバーサイド生成）
 * @param {Object} student - 学生データ
 * @param {string} yearTerm - 学期
 */
export async function exportStudentGradeToPDF(student, yearTerm) {
    if (!student) {
        alert('エクスポートするデータがありません')
        return
    }

    try {
        // サーバーサイドでPDF生成
        const response = await fetch('/api/export/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ student, yearTerm }),
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'PDF生成に失敗しました')
        }

        // PDFをダウンロード
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        // ファイル名を取得
        const contentDisposition = response.headers.get('Content-Disposition')
        let fileName = 'grade_report.pdf'
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="(.+)"/)
            if (match) fileName = match[1]
        }

        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

    } catch (error) {
        console.error('PDF export error:', error)
        alert('PDFの生成に失敗しました: ' + error.message)
    }
}
