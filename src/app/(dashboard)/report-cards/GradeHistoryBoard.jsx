'use client'

import { useState, useEffect } from 'react'
import { fetchGradeFilters, fetchTermGradeRecords, deleteGradeRecords } from '@/app/actions/gradeRecords'
import Link from 'next/link'
import StudentGradeDetail from './StudentGradeDetail'
import { exportGradesToExcel } from '@/lib/export/excelExport'
import PizZip from 'pizzip'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateGradePDFClient, generateCertificatePDFClient } from '@/lib/export/clientPdfGenerator'
// import { loadCertificateTemplate, generateClientCertificateBlob } from '@/lib/export/clientWordGenerator' // Removed unused client generator

export default function GradeHistoryBoard() {
    // const supabase = createClient() // Removed
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

    // Selection State
    const [selectedIds, setSelectedIds] = useState([])
    const [generating, setGenerating] = useState(false)

    // Selection Handlers
    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) return prev.filter(p => p !== id)
            return [...prev, id]
        })
    }

    // State for class deletion
    const [selectedClassesForDeletion, setSelectedClassesForDeletion] = useState([])

    const deleteSelectedClasses = async () => {
        if (!confirm(`${selectedClassesForDeletion.length}クラス分のデータを削除しますか？\nこの操作は取り消せません。`)) return

        setLoading(true)
        try {
            await deleteGradeRecords(selectedTerm, selectedClassesForDeletion)

            alert('削除しました')
            setSelectedClassesForDeletion([])

            // Refresh logic
            // Invalidate triggers server revalidation, but we need to re-fetch client side state
            // Re-fetching filter & term data
            await refreshData()

        } catch (err) {
            console.error('Delete error:', err)
            alert('削除に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const refreshData = async () => {
        // Refresh filters and current term data
        const { yearTerms: terms, classes: cls } = await fetchGradeFilters()

        // Update filters if needed (e.g. if a term was deleted entirely? Unlikely from class delete)
        if (terms) {
            // Need to filter out JLPT if logic requires, but action already does it?
            // Action does: .filter(t => !/JLPT \d{4}年第\d回/.test(t))
            setYearTerms(terms)
            setClasses(cls)
        }

        if (selectedTerm) {
            await fetchTermData(selectedTerm)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredRecords.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredRecords.map(r => r.student_id_text))
        }
    }

    // Certificate Export Handler (Server-Side Generation)
    const handleCertificateExport = async (format) => {
        if (selectedIds.length === 0) return

        setGenerating(true)
        try {
            if (format === 'docx') {
                // Word is still server-side for now (complex docx templates)
                const response = await fetch('/api/certificates/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        studentIds: selectedIds,
                        format: 'docx',
                        issueDate: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
                    })
                })
                if (!response.ok) throw new Error('Word生成に失敗しました');
                const blob = await response.blob()
                saveAs(blob, selectedIds.length > 1 ? 'certificates.zip' : `certificate.docx`)
            } else {
                // PDF is now client-side
                // 1. Fetch data only
                const dataRes = await fetch('/api/certificates/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentIds: selectedIds, mode: 'data' })
                })
                if (!dataRes.ok) throw new Error('データ取得に失敗しました');
                const { data: certificateDataList } = await dataRes.json();

                const zip = new JSZip();
                const issueDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

                for (const certData of certificateDataList) {
                    try {
                        const blob = await generateCertificatePDFClient(certData, issueDate);
                        if (blob) {
                            const filename = `${certData.studentId}_${certData.name.replace(/\s+/g, '_')}_成績証明書.pdf`;
                            if (selectedIds.length > 1) {
                                zip.file(filename, blob);
                            } else {
                                saveAs(blob, filename);
                            }
                        }
                    } catch (e) {
                        console.error(`Error generating certificate for ${certData.studentId}`, e);
                    }
                }

                if (selectedIds.length > 1) {
                    const content = await zip.generateAsync({ type: 'blob' });
                    saveAs(content, 'certificates_pdf.zip');
                }
            }
        } catch (err) {
            console.error(err)
            alert('証明書の発行に失敗しました: ' + err.message)
        } finally {
            setGenerating(false)
        }
    }

    // Batch PDF Export Handler for Exam/Report (New)
    const handleBatchPdfExport = async (type, targetIds = null) => {
        // If it's a JLPT term, always use 'final_exam' type to trigger the JLPT template
        const exportType = selectedTerm?.startsWith('JLPT') ? 'final_exam' : type;

        // Filter records: defaults to all filteredRecords, or subset if targetIds provided
        let targetRecords = filteredRecords;
        if (targetIds && targetIds.length > 0) {
            targetRecords = filteredRecords.filter(r => targetIds.includes(r.student_id_text));
        }

        if (targetRecords.length === 0) return

        // Prepare payload for target students
        const studentsPayload = targetRecords.map(r => {
            const s = recordToStudent(r);
            if (exportType === 'final_exam') {
                return {
                    student_id_text: s.id,
                    student_name: s.name,
                    class_name: s.class,
                    final_exam_total: s.finalExamSum,
                    final_exam_data: s.finalExam,
                    report_card_data: s.reportDetails, // Include report_card_data for JLPT answer details
                    yearTerm: s.yearTerm
                }
            } else {
                return {
                    student_id_text: s.id,
                    student_name: s.name,
                    class_name: s.class,
                    final_exam_total: s.finalExamSum,
                    report_card_total: s.reportCardTotal,
                    report_card_data: s.reportDetails,
                    yearTerm: s.yearTerm
                }
            }
        });

        setGenerating(true)
        try {
            const zip = new JSZip()
            const folder = zip.folder(exportType === 'final_exam' ? (selectedTerm?.startsWith('JLPT') ? 'JLPT模擬試験結果' : '期末試験結果') : '成績通知表')

            for (const payload of studentsPayload) {
                try {
                    const blob = await generateGradePDFClient({
                        student: payload,
                        type: exportType,
                        yearTerm: payload.yearTerm || selectedTerm
                    })

                    if (blob) {
                        const filename = exportType === 'final_exam' ? (selectedTerm?.startsWith('JLPT') ? `JLPT模試${payload.final_exam_data?.level || ''}結果_${payload.student_name}.pdf` : `期末試験結果_${payload.student_name}.pdf`) : `成績通知表_${payload.student_name}.pdf`;
                        folder.file(filename, blob)
                    }
                } catch (e) {
                    console.error(`Error generating PDF for ${payload.student_name}`, e)
                }
            }

            const content = await zip.generateAsync({ type: 'blob' })
            saveAs(content, exportType === 'final_exam' ? (selectedTerm?.startsWith('JLPT') ? 'JLPT模擬試験結果_一括.zip' : '期末試験結果_一括.zip') : '成績通知表_一括.zip')
        } catch (err) {
            console.error(err)
            alert('PDFの一括出力に失敗しました: ' + err.message)
        } finally {
            setGenerating(false)
        }
    }

    // Individual PDF Export Handler
    const handleSinglePdfExport = async (record, type) => {
        const exportType = record.year_term?.startsWith('JLPT') ? 'final_exam' : type;
        const student = recordToStudent(record);

        setGenerating(true);
        try {
            const blob = await generateGradePDFClient({
                yearTerm: student.yearTerm || '',
                type: exportType,
                student: {
                    student_id_text: student.id,
                    student_name: student.name,
                    class_name: student.class,
                    final_exam_total: student.finalExamSum,
                    final_exam_data: student.finalExam,
                    report_card_total: student.reportCardTotal,
                    report_card_data: student.reportDetails
                }
            });

            if (!blob) throw new Error('PDF生成に失敗しました');

            const filename = exportType === 'final_exam' ? (record.year_term?.startsWith('JLPT') ? `JLPT模試${record.final_exam_data?.level || ''}結果_${student.name}.pdf` : `期末試験結果_${student.name}.pdf`) : `成績通知表_${student.name}.pdf`;
            saveAs(blob, filename);
        } catch (err) {
            console.error(err);
            alert('PDFの出力中にエラーが発生しました');
        } finally {
            setGenerating(false);
        }
    }

    // State for initial filter loading
    const [filtersLoaded, setFiltersLoaded] = useState(false)

    useEffect(() => {
        const initialize = async () => {
            setLoading(true)
            await fetchFilters()
            // filtering done inside fetchFilters -> fetchTermData chain
        }
        initialize()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Trigger fetch when selectedTerm changes (but only after initial load)
    useEffect(() => {
        if (filtersLoaded && selectedTerm) {
            fetchTermData(selectedTerm)
        }
    }, [selectedTerm, filtersLoaded])

    // 1. Fetch lightweight metadata for filters (Server Action)
    const fetchFilters = async () => {
        try {
            const { yearTerms: terms, classes: cls } = await fetchGradeFilters()

            setYearTerms(terms)
            setClasses(cls)

            // Set default term if available
            if (terms.length > 0) {
                const latest = terms[0]
                setSelectedTerm(latest)
                // Initial data fetch for the latest term
                await fetchTermData(latest)
            } else {
                setLoading(false) // No data to load
            }
            setFiltersLoaded(true)

        } catch (err) {
            console.error('Error fetching filters:', err)
            setLoading(false)
        }
    }

    // 2. Fetch heavy data ONLY for the selected term (Server Action)
    const fetchTermData = async (term) => {
        if (!term) return

        setLoading(true)
        try {
            // Priority 0: Cloudflare Snapshot (Instant Term Switching)
            const workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
            if (workerUrl) {
                let targetUrl = workerUrl.startsWith('http') ? workerUrl : `https://${workerUrl}`;
                const safeTermKey = term.replace(/[^a-z0-9]/gi, '_');
                const cfRes = await fetch(`${targetUrl}?action=get-analytics&type=grades_term_${safeTermKey}`);
                if (cfRes.ok) {
                    const cfData = await cfRes.json();
                    if (cfData && Array.isArray(cfData)) {
                        setRecords(cfData);
                        setLoading(false);
                        return; // Win
                    }
                }
            }

            // Priority 1: Vercel Server Action
            const data = await fetchTermGradeRecords(term)
            setRecords(data || [])

        } catch (err) {
            console.error('Error fetching term data:', err)
            alert('データの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    // Client-side filter (Class only now, Term is already filtered by server)
    const filteredRecords = records.filter(r => {
        if (!selectedClass || selectedClass === 'ALL') return true
        return r.class_name === selectedClass
    })

    // Calculate Grade (A-F) helper
    const calculateGrade = (score) => {
        if (score >= 80) return 'A'
        if (score >= 60) return 'B'
        if (score >= 40) return 'C'
        if (score >= 20) return 'D'
        return 'F'
    }

    // Helper for Final Exam Grade (Score / 6)
    const calculateFinalExamGrade = (score) => {
        const normalized = score / 6
        return calculateGrade(normalized)
    }

    // Convert record to student object format expected by StudentGradeDetail
    const recordToStudent = (r) => {
        const isJlpt = r.final_exam_data?.type === 'JLPT';

        return {
            id: r.student_id_text,
            name: r.student_name,
            class: r.class_name,
            yearTerm: r.year_term,
            finalExam: r.final_exam_data,
            reportDetails: r.report_card_data,
            reportCard: isJlpt ? {} : {
                vocab: r.report_card_data?.vocab?.total || 0,
                listening: r.report_card_data?.listening?.total || 0,
                reading: r.report_card_data?.reading?.total || 0,
                grammar: r.report_card_data?.grammar?.total || 0,
                writing: r.report_card_data?.writing?.total || 0,
                conversation: r.report_card_data?.conversation?.total || 0,
            },
            finalExamSum: r.final_exam_total,
            reportCardTotal: r.report_card_total,
            isJlpt: isJlpt
        }
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>成績履歴ボード</h1>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.875rem', color: '#4b5563' }}>期末試験 /JLPT校内模試</label>
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
                            <option value="">クラスを選択してください</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Excel Export Button */}
                    {selectedClass && filteredRecords.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => exportGradesToExcel(filteredRecords, selectedClass, selectedTerm)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Excel出力
                            </button>
                        </div>
                    )}
                </div>

                {/* Certificate Buttons */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {selectedIds.length > 0 && (
                        <>
                            <span style={{ fontSize: '0.9rem', color: '#4b5563', marginRight: '5px' }}>
                                {selectedIds.length}件選択中
                            </span>
                            <button
                                onClick={() => handleBatchPdfExport('report_card', selectedIds)}
                                disabled={generating}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: generating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: generating ? 0.7 : 1
                                }}
                            >
                                {generating ? '生成中...' : 'PDF出力'}
                            </button>
                            <button
                                onClick={() => handleCertificateExport('docx')}
                                disabled={generating}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    cursor: generating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    opacity: generating ? 0.7 : 1
                                }}
                            >
                                {generating ? '生成中...' : '証明書 (Word)'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Class Management Section */}
            {selectedTerm && (
                <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#374151', margin: 0 }}>
                                {selectedTerm} のクラス管理
                            </h3>
                            {(() => {
                                const classesInTerm = [...new Set(records.filter(r => r.year_term === selectedTerm).map(r => r.class_name))];
                                const isAllSelected = classesInTerm.length > 0 && selectedClassesForDeletion.length === classesInTerm.length;

                                return (
                                    <button
                                        onClick={() => {
                                            if (isAllSelected) {
                                                setSelectedClassesForDeletion([]);
                                            } else {
                                                setSelectedClassesForDeletion(classesInTerm);
                                            }
                                        }}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '0.85rem',
                                            backgroundColor: '#fff',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: '#4b5563'
                                        }}
                                    >
                                        {isAllSelected ? '全解除' : '全選択'}
                                    </button>
                                );
                            })()}
                        </div>
                        <button
                            onClick={deleteSelectedClasses}
                            disabled={selectedClassesForDeletion.length === 0 || loading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: selectedClassesForDeletion.length === 0 ? '#f3f4f6' : '#fee2e2',
                                color: selectedClassesForDeletion.length === 0 ? '#9ca3af' : '#b91c1c',
                                border: '1px solid',
                                borderColor: selectedClassesForDeletion.length === 0 ? '#e5e7eb' : '#fca5a5',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: selectedClassesForDeletion.length === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                            選択したクラス ({selectedClassesForDeletion.length}件) を削除
                        </button>
                    </div>

                    {(() => {
                        const classesInTerm = [...new Set(records.filter(r => r.year_term === selectedTerm).map(r => r.class_name))].sort();

                        if (classesInTerm.length === 0) {
                            return <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>この学期にはクラスデータがありません。</div>;
                        }

                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                {classesInTerm.map(cls => {
                                    const count = records.filter(r => r.year_term === selectedTerm && r.class_name === cls).length;
                                    const isSelected = selectedClassesForDeletion.includes(cls);

                                    return (
                                        <div
                                            key={cls}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '10px',
                                                backgroundColor: selectedClass === cls ? '#eff6ff' : '#fff',
                                                border: selectedClass === cls ? '2px solid #3b82f6' : (isSelected ? '1px solid #ef4444' : '1px solid #d1d5db'),
                                                borderRadius: '6px',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                position: 'relative'
                                            }}
                                        >
                                            {/* Checkbox for Deletion */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedClassesForDeletion(prev =>
                                                        prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
                                                    );
                                                }}
                                                style={{
                                                    padding: '5px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginRight: '8px'
                                                }}
                                                title="削除対象として選択"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }} // Handled by div click
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }}
                                                />
                                            </div>

                                            {/* Main Area for Viewing Details */}
                                            <div
                                                onClick={() => setSelectedClass(cls)}
                                                style={{
                                                    flex: 1,
                                                    cursor: 'pointer',
                                                }}
                                                title="このクラスの成績を表示"
                                            >
                                                <div style={{ fontWeight: 'bold', color: selectedClass === cls ? '#1d4ed8' : '#1f2937' }}>{cls}</div>
                                                <div style={{ fontSize: '0.8rem', color: selectedClass === cls ? '#60a5fa' : '#6b7280' }}>
                                                    {count}名のデータ
                                                    {selectedClass === cls && <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>● 表示中</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

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
            {
                historyViewMode === 'details' && (
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {selectedTerm?.startsWith('JLPT') ? (
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
                                    JLPT模擬試験結果詳細を表示
                                </button>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>

                        {/* Batch Export Button */}
                        <button
                            onClick={() => handleBatchPdfExport(detailSubMode === 'exam' ? 'final_exam' : 'report_card')}
                            disabled={generating}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: detailSubMode === 'exam' ? '#3b82f6' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: generating ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                opacity: generating ? 0.7 : 1,
                                fontSize: '0.85rem'
                            }}
                        >
                            {generating ? '生成中...' : (
                                selectedTerm?.startsWith('JLPT')
                                    ? '一括PDF出力 (JLPT)'
                                    : (detailSubMode === 'exam' ? '一括PDF出力 (期末試験)' : '一括PDF出力 (通知表)')
                            )}
                        </button>
                    </div>
                )
            }

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
                                        {/* Checkbox Header */}
                                        <th style={{ padding: '12px 16px', width: '40px' }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>学籍番号</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>氏名</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>クラス</th>
                                        {selectedTerm?.startsWith('JLPT') ? (
                                            <>
                                                <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'right' }}>合計点(180)</th>
                                                <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>評価</th>
                                                <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>合格判定</th>
                                            </>
                                        ) : (
                                            <>
                                                <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'right' }}>期末試験(600)</th>
                                                <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>期末評価</th>
                                                <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'right' }}>成績評価(100)</th>
                                                <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>評価</th>
                                            </>
                                        )}
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280' }}>保存日時</th>
                                        <th style={{ padding: '12px 16px', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody style={{ divideY: '1px solid #e5e7eb' }}>
                                    {filteredRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            style={{
                                                borderBottom: '1px solid #e5e7eb',
                                                backgroundColor: selectedIds.includes(record.student_id_text) ? '#f0f9ff' : 'transparent'
                                            }}
                                        >
                                            <td style={{ padding: '12px 16px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(record.student_id_text)}
                                                    onChange={() => toggleSelect(record.student_id_text)}
                                                />
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: '500' }}>{record.student_id_text}</td>
                                            <td style={{ padding: '12px 16px' }}>{record.student_name}</td>
                                            <td style={{ padding: '12px 16px' }}>{record.class_name}</td>
                                            {selectedTerm?.startsWith('JLPT') ? (
                                                <>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6', fontWeight: 'bold' }}>{record.final_exam_total}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '24px',
                                                            height: '24px',
                                                            lineHeight: '24px',
                                                            borderRadius: '50%',
                                                            backgroundColor: '#eff6ff',
                                                            color: '#1d4ed8',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {(() => {
                                                                const score = record.final_exam_total;
                                                                if (score > 120) return 'A';
                                                                if (score > 60) return 'B';
                                                                return 'C';
                                                            })()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            backgroundColor: (record.final_exam_data?.result === '合' || record.final_exam_data?.result === '○') ? '#dcfce7' : '#fee2e2',
                                                            color: (record.final_exam_data?.result === '合' || record.final_exam_data?.result === '○') ? '#166534' : '#991b1b'
                                                        }}>
                                                            {(record.final_exam_data?.result === '合' || record.final_exam_data?.result === '○') ? '合格' : '不合格'}
                                                        </span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#3b82f6' }}>{record.final_exam_total}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '24px',
                                                            height: '24px',
                                                            lineHeight: '24px',
                                                            borderRadius: '50%',
                                                            backgroundColor: '#eff6ff',
                                                            color: '#1d4ed8',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {calculateFinalExamGrade(record.final_exam_total)}
                                                        </span>
                                                    </td>
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
                                                </>
                                            )}
                                            <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '0.875rem' }}>
                                                {new Date(record.created_at).toLocaleString('ja-JP')}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleSinglePdfExport(record, 'final_exam')}
                                                    disabled={generating}
                                                    style={{
                                                        padding: '4px 10px',
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 'bold',
                                                        cursor: generating ? 'not-allowed' : 'pointer',
                                                        opacity: generating ? 0.7 : 1
                                                    }}
                                                >
                                                    PDF
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
        </div >
    )
}
