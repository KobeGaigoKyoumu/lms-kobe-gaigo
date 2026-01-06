'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import RadarChart from './RadarChart'

export default function GradeHistoryBoard() {
    const supabase = createClient()
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [yearTerms, setYearTerms] = useState([])
    const [classes, setClasses] = useState([])

    // Filters
    const [selectedTerm, setSelectedTerm] = useState('')
    const [selectedClass, setSelectedClass] = useState('')

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

    // Class Averages Calculation
    const calculateAverages = () => {
        if (filteredRecords.length === 0) return null

        const sums = {
            vocab: 0, listening: 0, reading: 0, grammar: 0, writing: 0, conversation: 0, total: 0
        }

        filteredRecords.forEach(r => {
            // report_card_data might be stored slightly differently if saved earlier, ensure fallback
            const data = r.report_card_data || {}
            // report_card_data structure: { vocab: { base, total }, listening: { ... }, ... }
            // We need the TOTAL score for each category
            sums.vocab += data.vocab?.total || 0
            sums.listening += data.listening?.total || 0
            sums.reading += data.reading?.total || 0
            sums.grammar += data.grammar?.total || 0
            sums.writing += data.writing?.total || 0
            sums.conversation += data.conversation?.total || 0
            sums.total += r.report_card_total || 0
        })

        const count = filteredRecords.length
        return {
            vocab: sums.vocab / count,
            listening: sums.listening / count,
            reading: sums.reading / count,
            grammar: sums.grammar / count,
            writing: sums.writing / count,
            conversation: sums.conversation / count,
            total: sums.total / count
        }
    }

    const averages = calculateAverages()

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>成績履歴ボード</h1>
                <Link href="/report-cards" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 'bold' }}>
                    ← アップロード画面に戻る
                </Link>
            </div>

            {/* Filters */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', display: 'flex', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: '#4b5563' }}>学期 (Year-Term)</label>
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', minWidth: '150px' }}
                    >
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

            {/* Class Average Section (Chart & Table) */}
            {averages && (
                <div style={{
                    display: 'flex',
                    gap: '40px',
                    backgroundColor: '#fff',
                    padding: '30px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    marginBottom: '30px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {/* Radar Chart */}
                    <div style={{ width: '300px', height: '300px' }}>
                        <RadarChart
                            labels={['文字・語彙', '聴解', '読解', '文法', '作文', '会話']}
                            data={[averages.vocab, averages.listening, averages.reading, averages.grammar, averages.writing, averages.conversation]}
                            title="クラス平均成績"
                            color="blue"
                            min={50}
                            stepSize={10}
                        />
                    </div>

                    {/* Average Table */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '15px', color: '#374151' }}>
                            クラス平均点 ({filteredRecords.length}名)
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>科目</th>
                                    <th style={{ padding: '10px', textAlign: 'center' }}>平均点</th>
                                    <th style={{ padding: '10px', textAlign: 'center' }}>満点</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: '文字・語彙', key: 'vocab', max: 100 },
                                    { label: '聴解', key: 'listening', max: 100 },
                                    { label: '読解', key: 'reading', max: 100 },
                                    { label: '文法', key: 'grammar', max: 100 },
                                    { label: '作文', key: 'writing', max: 100 },
                                    { label: '会話', key: 'conversation', max: 100 },
                                ].map((item) => (
                                    <tr key={item.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '10px' }}>{item.label}</td>
                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{averages[item.key]?.toFixed(1)}</td>
                                        <td style={{ padding: '10px', textAlign: 'center', color: '#6b7280' }}>{item.max}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#eff6ff', fontWeight: 'bold' }}>
                                    <td style={{ padding: '12px 10px' }}>総合平均</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', color: '#10b981', fontSize: '1.1rem' }}>
                                        {averages.total?.toFixed(1)} <span style={{ fontSize: '0.8rem', color: '#374151' }}>/ 100</span>
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>読み込み中...</div>
                ) : filteredRecords.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>データが見つかりません</div>
                ) : (
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '0.8rem', color: '#9ca3af' }}>
                合計 {filteredRecords.length} 件表示中
            </div>
        </div>
    )
}
