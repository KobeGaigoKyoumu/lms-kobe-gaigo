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

            // 在籍者.xlsxのカラム構造:
            // 列2: 学籍番号, 列3: 氏名, 列17: 現クラス, 列20: コース
            // 既存テンプレートのカラム構造:
            // 列0: 学籍番号, 列1: 氏名, 列2: メール, 列3: クラス, 列4: 年度

            // カラム位置を自動検出（ヘッダーから判定）
            const headers = rows[0] || []
            console.log('Excel headers:', headers)

            let colStudentId = headers.findIndex(h => h && String(h).includes('学籍番号'))
            let colName = headers.findIndex(h => h && String(h).includes('氏名'))
            let colClass = headers.findIndex(h => h && (String(h).includes('クラス') || String(h).replace(/\r?\n/g, '').includes('現')))
            let colEmail = headers.findIndex(h => h && String(h).includes('メール'))
            let colYear = headers.findIndex(h => h && (String(h).includes('年度') || String(h).includes('コース')))

            // デフォルト値（在籍者.xlsx形式）
            if (colStudentId === -1) colStudentId = 2
            if (colName === -1) colName = 3
            if (colClass === -1) colClass = 17
            if (colYear === -1) colYear = 20

            // フォールバック（テンプレート形式）
            const isTemplateFormat = headers[0] && String(headers[0]).includes('学籍番号')
            if (isTemplateFormat) {
                colStudentId = 0
                colName = 1
                colEmail = 2
                colClass = 3
                colYear = 4
            }

            console.log('Column positions:', { colStudentId, colName, colClass, colEmail, colYear })

            // ヘッダー行をスキップ、学籍番号カラムにデータがある行のみ
            const dataRows = rows.slice(1).filter(row => row[colStudentId])
            console.log('Data rows count:', dataRows.length)
            if (dataRows.length > 0) {
                console.log('First data row:', dataRows[0])
            }

            // ユニークなクラス名を抽出
            const uniqueClasses = [...new Set(
                dataRows
                    .map(row => String(row[colClass] || '').trim())
                    .filter(cls => cls && /^\d+-\d+$/.test(cls)) // "1-1", "2-11" 形式のみ
            )]

            // 既存のクラスを取得
            const { data: existingClasses } = await supabase
                .from('classes')
                .select('name')

            const existingClassNames = new Set((existingClasses || []).map(c => c.name))

            // 新規クラスを作成
            const newClasses = uniqueClasses.filter(cls => !existingClassNames.has(cls))
            let classesCreated = 0

            if (newClasses.length > 0) {
                const classesToInsert = newClasses.map(className => {
                    const gradeLevel = className.startsWith('1-') ? '1年' : className.startsWith('2-') ? '2年' : null
                    return {
                        name: className,
                        grade_level: gradeLevel,
                        academic_year: new Date().getFullYear(),
                        description: `${className}クラス`
                    }
                })

                const { error: classError, count } = await supabase
                    .from('classes')
                    .insert(classesToInsert)

                if (!classError) {
                    classesCreated = newClasses.length
                } else {
                    console.error('Class creation error:', classError)
                }
            }

            // Excel日付シリアル値をISO日付文字列に変換するヘルパー
            const excelDateToIso = (serial) => {
                if (!serial || typeof serial !== 'number') return null
                // Excelの日付シリアル（1900年1月1日を1とする）
                const date = new Date((serial - 25569) * 86400 * 1000)
                return date.toISOString().split('T')[0]
            }

            // 在籍者.xlsx形式かどうかを判定
            const isZaisekiFormat = headers.some(h => h && String(h).includes('カタカナ'))

            // 拡張カラムがデータベースに存在するかチェック
            let hasExtendedColumns = false
            try {
                const { data: testData, error: testError } = await supabase
                    .from('students')
                    .select('name_kana')
                    .limit(1)
                if (!testError) {
                    hasExtendedColumns = true
                }
            } catch (e) {
                // カラムが存在しない場合はfalseのまま
            }

            // 学生データを作成（在籍者.xlsxの全カラムに対応）
            const studentsToInsert = dataRows.map(row => {
                const studentData = {
                    student_id_text: String(row[colStudentId]).trim(),
                    full_name: String(row[colName] || '').trim(),
                    email: colEmail >= 0 && row[colEmail] ? String(row[colEmail]).trim() : null,
                    class_name: String(row[colClass] || '').trim() || null,
                    academic_year: parseInt(row[colYear]) || new Date().getFullYear(),
                    status: 'active'
                }

                // 在籍者.xlsx形式で拡張カラムがDBに存在する場合、追加の個人データを読み取る
                if (isZaisekiFormat && hasExtendedColumns) {
                    // カラム位置（在籍者.xlsx）:
                    // 4:カタカナ, 5:ローマ字, 6:国籍, 7:性別, 8:生年月日
                    // 9:在留資格, 10:入国日, 11:在留期限, 12:パスポート番号
                    // 13:在留カード番号, 14:住所, 15:連絡方法, 16:期
                    // 18:入学年月日, 19:卒業年月, 20:コース
                    studentData.name_kana = row[4] ? String(row[4]).trim() : null
                    studentData.name_romaji = row[5] ? String(row[5]).trim() : null
                    studentData.nationality = row[6] ? String(row[6]).trim() : null
                    studentData.gender = row[7] ? String(row[7]).trim() : null
                    studentData.birth_date = excelDateToIso(row[8])
                    studentData.visa_status = row[9] ? String(row[9]).trim() : null
                    studentData.entry_date = excelDateToIso(row[10])
                    studentData.visa_expiry = excelDateToIso(row[11])
                    studentData.passport_number = row[12] ? String(row[12]).trim() : null
                    studentData.residence_card_number = row[13] ? String(row[13]).trim() : null
                    studentData.address = row[14] ? String(row[14]).trim() : null
                    studentData.phone = row[15] ? String(row[15]).trim() : null
                    studentData.enrollment_period = row[16] ? String(row[16]).trim() : null
                    studentData.enrollment_date = excelDateToIso(row[18])
                    studentData.graduation_date = excelDateToIso(row[19])
                    studentData.course = row[20] ? String(row[20]).trim() : null
                }

                return studentData
            }).filter(s => s.student_id_text)

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

            let message = `${studentsToInsert.length}件の学生データを登録/更新しました`
            if (classesCreated > 0) {
                message += `。${classesCreated}個のクラスを新規作成しました`
            }

            setUploadResult({
                success: true,
                message
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
