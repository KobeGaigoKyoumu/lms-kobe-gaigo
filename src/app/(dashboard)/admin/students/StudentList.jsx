'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import styles from './page.module.css'

export default function StudentList({ students: initialStudents, classes }) {
    const router = useRouter()
    const fileInputRef = useRef(null)
    const [students, setStudents] = useState(initialStudents)
    const [filter, setFilter] = useState('all')
    const [classFilter, setClassFilter] = useState('')
    const [search, setSearch] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState(null)

    const supabase = createClient()

    const filteredStudents = students.filter(student => {
        const matchesStatus = filter === 'all' || student.status === filter
        const matchesClass = !classFilter || student.class_name === classFilter
        const matchesSearch =
            student.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            student.student_id_text?.includes(search) ||
            student.email?.toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesClass && matchesSearch
    })

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadResult(null)

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data, { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

            // ヘッダー行をスキップ
            const dataRows = rows.slice(1).filter(row => row[0])

            const studentsToInsert = dataRows.map(row => ({
                student_id_text: String(row[0]).trim(),
                full_name: String(row[1] || '').trim(),
                email: String(row[2] || '').trim() || null,
                class_name: String(row[3] || '').trim() || null,
                academic_year: parseInt(row[4]) || new Date().getFullYear(),
                status: 'active'
            }))

            if (studentsToInsert.length === 0) {
                setUploadResult({ success: false, message: 'データが見つかりません' })
                setUploading(false)
                return
            }

            // Upsert (学籍番号で重複時は更新)
            const { error, count } = await supabase
                .from('students')
                .upsert(studentsToInsert, {
                    onConflict: 'student_id_text',
                    count: 'exact'
                })

            if (error) throw error

            setUploadResult({
                success: true,
                message: `${studentsToInsert.length}件のデータを登録/更新しました`
            })

            router.refresh()
        } catch (err) {
            console.error('Upload error:', err)
            setUploadResult({
                success: false,
                message: `エラー: ${err.message}`
            })
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const downloadTemplate = () => {
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet([
            ['学籍番号', '氏名', 'メール', 'クラス', '年度'],
            ['2404001', '山田太郎', 'yamada@example.com', '2-1', new Date().getFullYear()],
            ['2404002', '鈴木花子', 'suzuki@example.com', '2-1', new Date().getFullYear()]
        ])
        XLSX.utils.book_append_sheet(wb, ws, '学生マスター')
        XLSX.writeFile(wb, '学生マスター_テンプレート.xlsx')
    }

    const handleStatusChange = async (studentId, newStatus) => {
        const { error } = await supabase
            .from('students')
            .update({ status: newStatus })
            .eq('student_id_text', studentId)

        if (!error) {
            setStudents(prev => prev.map(s =>
                s.student_id_text === studentId ? { ...s, status: newStatus } : s
            ))
        } else {
            alert('ステータスの更新に失敗しました')
        }
    }

    const handleDelete = async (studentId) => {
        if (!confirm(`学籍番号 ${studentId} を削除しますか？`)) return

        const { error } = await supabase
            .from('students')
            .delete()
            .eq('student_id_text', studentId)

        if (!error) {
            setStudents(prev => prev.filter(s => s.student_id_text !== studentId))
        } else {
            alert('削除に失敗しました')
        }
    }

    return (
        <div className={styles.content}>
            {/* アップロードセクション */}
            <div className={styles.uploadSection}>
                <div className={styles.uploadActions}>
                    <button onClick={downloadTemplate} className={styles.templateBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        テンプレートDL
                    </button>
                    <label className={styles.uploadBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {uploading ? 'アップロード中...' : 'Excelアップロード'}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            hidden
                        />
                    </label>
                </div>
                {uploadResult && (
                    <div className={`${styles.uploadResult} ${uploadResult.success ? styles.success : styles.error}`}>
                        {uploadResult.message}
                    </div>
                )}
            </div>

            {/* フィルターとサーチ */}
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">すべてのステータス</option>
                        <option value="active">在籍中</option>
                        <option value="graduated">卒業</option>
                        <option value="inactive">休学</option>
                    </select>
                    <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">すべてのクラス</option>
                        {classes.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <input
                    type="text"
                    placeholder="学籍番号、名前、メールで検索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* 学生テーブル */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>学籍番号</th>
                            <th>氏名</th>
                            <th>メール</th>
                            <th>クラス</th>
                            <th>年度</th>
                            <th>ステータス</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(student => (
                            <tr key={student.student_id_text}>
                                <td className={styles.idCell}>{student.student_id_text}</td>
                                <td>{student.full_name}</td>
                                <td>{student.email || '-'}</td>
                                <td>{student.class_name || '-'}</td>
                                <td>{student.academic_year}</td>
                                <td>
                                    <select
                                        value={student.status}
                                        onChange={(e) => handleStatusChange(student.student_id_text, e.target.value)}
                                        className={`${styles.statusSelect} ${styles[student.status]}`}
                                    >
                                        <option value="active">在籍中</option>
                                        <option value="graduated">卒業</option>
                                        <option value="inactive">休学</option>
                                    </select>
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleDelete(student.student_id_text)}
                                        className={styles.deleteBtn}
                                    >
                                        削除
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredStudents.length === 0 && (
                    <div className={styles.empty}>
                        該当する学生がいません
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                表示中: {filteredStudents.length} / {students.length} 件
            </div>
        </div>
    )
}
