import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { student, yearTerm } = await request.json()

        if (!student) {
            return NextResponse.json({ error: 'データがありません' }, { status: 400 })
        }

        // 動的にpdfmakeをインポート
        const pdfMakePrinter = (await import('pdfmake/build/pdfmake')).default
        const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default

        pdfMakePrinter.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs

        // 評価計算
        const calculateGrade = (score) => {
            if (score >= 80) return 'A'
            if (score >= 60) return 'B'
            if (score >= 40) return 'C'
            if (score >= 20) return 'D'
            return 'F'
        }

        // 学期フォーマット
        const formatTerm = (term) => {
            if (!term) return '-'
            const match = term.match(/(\d{4})/)
            if (match) {
                const year = match[1]
                if (term.includes('前期')) return `${year} Spring Semester`
                if (term.includes('後期')) return `${year} Fall Semester`
                return year
            }
            return term
        }

        const attendanceScore = student.report_card_data?.attendance || 0
        const participationScore = student.report_card_data?.participation || 0

        // 科目データ
        const subjectNames = {
            'vocab': 'Vocabulary',
            'grammar': 'Grammar',
            'reading': 'Reading',
            'listening': 'Listening',
            'writing': 'Writing',
            'conversation': 'Conversation'
        }

        const subjectRows = student.report_card_data
            ? Object.entries(student.report_card_data)
                .filter(([key]) => subjectNames[key])
                .map(([key, data]) => [
                    subjectNames[key],
                    typeof data.base === 'number' ? data.base.toFixed(1) : '0',
                    typeof data.total === 'number' ? data.total.toFixed(1) : '0'
                ])
            : []

        // PDFドキュメント定義
        const docDefinition = {
            content: [
                { text: 'GRADE REPORT', style: 'header', alignment: 'center' },
                { text: 'Kobe Gaigo Language School', style: 'subheader', alignment: 'center' },
                { text: `Issue Date: ${new Date().toLocaleDateString('en-US')}`, style: 'date', alignment: 'center', margin: [0, 0, 0, 20] },

                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#cccccc' }], margin: [0, 0, 0, 15] },

                { text: 'STUDENT INFORMATION', style: 'sectionHeader' },
                {
                    columns: [
                        { width: 100, text: 'Student ID:', style: 'label' },
                        { width: '*', text: student.student_id_text || '-' }
                    ],
                    margin: [0, 5, 0, 0]
                },
                {
                    columns: [
                        { width: 100, text: 'Name:', style: 'label' },
                        { width: '*', text: student.student_name || '-' }
                    ],
                    margin: [0, 3, 0, 0]
                },
                {
                    columns: [
                        { width: 100, text: 'Class:', style: 'label' },
                        { width: '*', text: student.class_name || '-' }
                    ],
                    margin: [0, 3, 0, 0]
                },
                {
                    columns: [
                        { width: 100, text: 'Term:', style: 'label' },
                        { width: '*', text: formatTerm(yearTerm) }
                    ],
                    margin: [0, 3, 0, 20]
                },

                { text: 'GRADE SUMMARY', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['*', 150],
                        body: [
                            [{ text: 'Category', style: 'tableHeader' }, { text: 'Result', style: 'tableHeader' }],
                            ['Final Exam Score', `${student.final_exam_total || 0} / 600`],
                            ['Report Card Score', `${student.report_card_total || 0} / 100`],
                            ['Attendance Score', typeof attendanceScore === 'number' ? attendanceScore.toFixed(1) : String(attendanceScore)],
                            ['Participation Score', typeof participationScore === 'number' ? participationScore.toFixed(1) : String(participationScore)],
                            [{ text: 'Overall Grade', bold: true }, { text: calculateGrade(student.report_card_total), bold: true, fontSize: 14 }]
                        ]
                    },
                    margin: [0, 10, 0, 20]
                },

                ...(subjectRows.length > 0 ? [
                    { text: 'SUBJECT DETAILS', style: 'sectionHeader' },
                    {
                        table: {
                            widths: ['*', 80, 80],
                            body: [
                                [{ text: 'Subject', style: 'tableHeader' }, { text: 'Base Score', style: 'tableHeader' }, { text: 'Total', style: 'tableHeader' }],
                                ...subjectRows
                            ]
                        },
                        margin: [0, 10, 0, 0]
                    }
                ] : [])
            ],
            footer: {
                text: 'This document is automatically generated by Kobe Gaigo LMS.',
                alignment: 'center',
                fontSize: 8,
                color: '#999999',
                margin: [0, 10, 0, 0]
            },
            styles: {
                header: { fontSize: 22, bold: true, margin: [0, 0, 0, 5] },
                subheader: { fontSize: 12, color: '#666666', margin: [0, 0, 0, 5] },
                date: { fontSize: 10, color: '#999999' },
                sectionHeader: { fontSize: 13, bold: true, color: '#333333', margin: [0, 10, 0, 5] },
                label: { color: '#666666' },
                tableHeader: { fillColor: '#3b82f6', color: '#ffffff', bold: true }
            },
            defaultStyle: {
                fontSize: 11
            }
        }

        // PDF生成
        return new Promise((resolve, reject) => {
            const pdfDocGenerator = pdfMakePrinter.createPdf(docDefinition)

            pdfDocGenerator.getBuffer((buffer) => {
                const fileName = `Grade_Report_${student.student_id_text}_${formatTerm(yearTerm).replace(/\s/g, '_')}.pdf`

                resolve(new NextResponse(buffer, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${fileName}"`
                    }
                }))
            })
        })

    } catch (error) {
        console.error('PDF generation error:', error)
        return NextResponse.json({ error: 'PDF生成に失敗しました: ' + error.message }, { status: 500 })
    }
}
