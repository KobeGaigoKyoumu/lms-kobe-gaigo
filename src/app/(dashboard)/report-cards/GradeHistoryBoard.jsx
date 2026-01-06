'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import StudentGradeDetail from './StudentGradeDetail'

export default function GradeHistoryBoard() {
    const supabase = createClient()
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [yearTerms, setYearTerms] = useState([])
    const [classes, setClasses] = useState([])

    // Filters
    const [selectedTerm, setSelectedTerm] = useState('')
    const [selectedClass, setSelectedClass] = useState('')

    // View Mode for History Page (Tabs)
    const [historyViewMode, setHistoryViewMode] = useState('list') // 'list' | 'details'

    // Sub View Mode for Details (Exam vs Report - passed to detail component)
    const [detailSubMode, setDetailSubMode] = useState('report') // 'exam' | 'report'

    useEffect(() => {
        fetchRecords()
    }, [])

    const fetchRecords = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('grade_records')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setRecords(data || [])

            // Extract unique terms and classes for filters
            const terms = [...new Set(data.map(r => r.year_term))].sort().reverse()
            const cls = [...new Set(data.map(r => r.class_name))].sort()

            setYearTerms(terms)
            setClasses(cls)

            // Set defaults
            if (terms.length > 0) setSelectedTerm(terms[0])
            if (cls.length > 0) setSelectedClass('ALL')

        } catch (err) {
            console.error('Error fetching history:', err)
        } finally {
            setLoading(false)
        }
    }

    const deleteRecord = async (id) => {
        if (!confirm('このデータを削除してもよろしいですか？')) return

        try {
            const { error } = await supabase
                .from('grade_records')
                .delete()
                .eq('id', id)

            if (error) throw error

            // Update local state
            setRecords(records.filter(r => r.id !== id))
            alert('削除しました')
        } catch (err) {
            console.error('Error deleting record:', err)
            alert('削除に失敗しました')
        }
    }

    const filteredRecords = records.filter(r => {
        const matchTerm = selectedTerm ? r.year_term === selectedTerm : true
        const matchClass = selectedClass && selectedClass !== 'ALL' ? r.class_name === selectedClass : true
        return matchTerm && matchClass
    })

    // Calculate Grade (A-F) helper
    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    // Convert record to student object format expected by StudentGradeDetail
    const recordToStudent = (r) => ({
        id: r.student_id_text,
        name: r.student_name,
        class: r.class_name,
        finalExam: r.final_exam_data,
        reportDetails: r.report_card_data,
        reportCard: { // Reconstruct reportCard summary for chart if needed, or use report_card_data structure if it matches
            vocab: r.report_card_data?.vocab?.total || 0,
            listening: r.report_card_data?.listening?.total || 0,
            reading: r.report_card_data?.reading?.total || 0,
            grammar: r.report_card_data?.grammar?.total || 0,
            writing: r.report_card_data?.writing?.total || 0,
            conversation: r.report_card_data?.conversation?.total || 0,
        },
        finalExamSum: r.final_exam_total,
        reportCardTotal: r.report_card_total
    })

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>成績履歴ボード</h1>
                <Link href="/report-cards" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 'bold' }}>
                    ← アップロード画面に戻る
                </Link>
            </div>

            {/* Filters */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: '#4b5563' }}>学期 (Year-Term)</label>
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', minWidth: '150px' }}
                    >
                        {yearTerms.length === 0 && <option>データなし</option>}
                        {yearTerms.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: '#4b5563' }}>クラス</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', minWidth: '150px' }}
                    >
                        <option value="ALL">全クラス</option>
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* PRIMARY TABS: List vs Details */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '20px' }}>
                <button
                    onClick={() => setHistoryViewMode('list')}
                    style={{
                        padding: '10px 20px',
                        borderBottom: historyViewMode === 'list' ? '2px solid #3b82f6' : 'none',
                        color: historyViewMode === 'list' ? '#3b82f6' : '#6b7280',
                        fontWeight: historyViewMode === 'list' ? 'bold' : 'normal',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem'
                    }}
                >
                    一覧表示 (リスト)
                </button>
                <button
                    onClick={() => setHistoryViewMode('details')}
                    style={{
                        padding: '10px 20px',
                        borderBottom: historyViewMode === 'details' ? '2px solid #3b82f6' : 'none',
                        color: historyViewMode === 'details' ? '#3b82f6' : '#6b7280',
                        fontWeight: historyViewMode === 'details' ? 'bold' : 'normal',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem'
                    }}
                >
                    詳細表示 (カード)
                </button>
            </div>

            {/* SECONDARY TABS: (Only visible in Details mode) - Exam vs Report */}
            {historyViewMode === 'details' && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setDetailSubMode('exam')}
                        style={{
                            padding: '6px 14px',
                            backgroundColor: detailSubMode === 'exam' ? '#eff6ff' : '#f3f4f6',
                            color: detailSubMode === 'exam' ? '#1d4ed8' : '#4b5563',
                            borderRadius: '20px', border: '1px solid',
                            borderColor: detailSubMode === 'exam' ? '#bfdbfe' : '#e5e7eb',
                            cursor: 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        期末試験結果を表示
                    </button>
                    <button
                        onClick={() => setDetailSubMode('report')}
                        style={{
                            padding: '6px 14px',
                            backgroundColor: detailSubMode === 'report' ? '#ecfdf5' : '#f3f4f6',
                            color: detailSubMode === 'report' ? '#047857' : '#4b5563',
                            borderRadius: '20px', border: '1px solid',
                            borderColor: detailSubMode === 'report' ? '#a7f3d0' : '#e5e7eb',
                            cursor: 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        成績通知表を表示
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: historyViewMode === 'details' ? '20px' : '0' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>読み込み中...</div>
                ) : filteredRecords.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>データが見つかりません</div>
                ) : (
                    <>
                        {historyViewMode === 'list' ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>学籍番号</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>氏名</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>クラス</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'right' }}>期末試験(600)</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'right' }}>成績評価(100)</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>評価</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>保存日時</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody style={{ divideY: '1px solid #e5e7eb' }}>
                                    {filteredRecords.map((record) => (
                                        <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: '500' }}>{record.student_id_text}</td>
                                            <td style={{ padding: '12px 16px' }}>{record.student_name}</td>
                                            <td style={{ padding: '12px 16px' }}>{record.class_name}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6' }}>{record.final_exam_total}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>{record.report_card_total}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    width: '24px',
                                                    height: '24px',
                                                    lineHeight: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: record.report_card_total >= 60 ? '#dcfce7' : '#fee2e2',
                                                    color: record.report_card_total >= 60 ? '#166534' : '#991b1b',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {calculateGrade(record.report_card_total)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.875rem' }}>
                                                {new Date(record.created_at).toLocaleString('ja-JP')}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => deleteRecord(record.id)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        backgroundColor: '#fee2e2',
                                                        color: '#991b1b',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    削除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                {filteredRecords.map(r => (
                                    <StudentGradeDetail
                                        key={r.id}
                                        student={recordToStudent(r)}
                                        viewMode={detailSubMode}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '0.8rem', color: '#9ca3af' }}>
                合計 {filteredRecords.length} 件表示中
            </div>
        </div>
    )
}
