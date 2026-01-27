'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import styles from './page.module.css'
import StudentDetailModal from './StudentDetailModal'
import { parseStudentId } from '@/lib/utils/studentId'

export default function StudentList({ students: initialStudents, classes }) {
    const router = useRouter()
    const fileInputRef = useRef(null)
    const [students, setStudents] = useState(initialStudents)
    const [filter, setFilter] = useState('all')
    const [gradeFilter, setGradeFilter] = useState('')
    const [classFilter, setClassFilter] = useState('')
    const [search, setSearch] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState(null)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())

    const supabase = createClient()

    // Sync state with props when router refreshes
    useEffect(() => {
        console.log('useEffect: initialStudents updated', initialStudents.slice(0, 3).map(s => ({ id: s.student_id_text, year: s.academic_year })))
        setStudents(initialStudents)
    }, [initialStudents])

    const filteredStudents = students.filter(student => {
        const studentInfo = parseStudentId(student.student_id_text, new Date(), student.academic_year) // Pass academic_year for accurate grade calc

        const matchesStatus = filter === 'all' || student.status === filter
        const matchesGrade = !gradeFilter || String(studentInfo.grade) === gradeFilter
        const matchesClass = !classFilter || student.class_name === classFilter

        // Advanced Search Logic
        if (!search) return matchesStatus && matchesGrade && matchesClass

        const searchTerms = search.toLowerCase().replace(/　/g, ' ').split(' ').filter(t => t)

        // Fields to search (include all detail fields)
        const searchableText = [
            student.student_id_text,
            student.full_name,
            student.name_kana,
            student.name_romaji,
            student.email,
            student.nationality,
            student.address,
            student.phone,
            student.visa_status,
            student.passport_number,
            student.residence_card_number,
            student.course,
            student.destination,
            student.class_name
        ].filter(Boolean).join(' ').toLowerCase()

        // AND logic: all terms must be present in the searchable text
        const matchesSearch = searchTerms.every(term => searchableText.includes(term))

        return matchesStatus && matchesGrade && matchesClass && matchesSearch
    })

    // Debug loop inside render (simplified)
    if (selectedIds.size === 0 && students.length > 0) {
        const target = students.find(s => s.student_id_text === '2307077')
        if (target) {
            const info = parseStudentId(target.student_id_text, new Date(), target.academic_year)
            console.log(`Render 2307077: AY=${target.academic_year} Grade=${info.grade}`)
        }
    }

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredStudents.map(s => s.student_id_text)
            setSelectedIds(new Set(allIds))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    // Handler for Grade Change
    const handleGradeChange = async (studentId, newGrade) => {
        console.log(`handleGradeChange: ID=${studentId}, NewGrade=${newGrade}`)

        // Calculate new academic year based on desired grade
        // Grade 1 = Current Year
        // Grade 2 = Current Year - 1
        const currentYear = new Date().getFullYear()
        // Determine current academic year (April start)
        const today = new Date()
        const isBeforeApril = today.getMonth() < 3
        const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear

        console.log(`Year Base: ${academicYearBase}`)

        let newAcademicYear

        if (newGrade === '1') {
            newAcademicYear = academicYearBase
        } else if (newGrade === '2') {
            newAcademicYear = academicYearBase - 1
        } else if (newGrade === '0') {
            // Set to 2 years ago (making them 3rd year+, i.e., graduated/non-enrolled)
            newAcademicYear = academicYearBase - 2
        } else {
            console.log('Unknown grade selected')
            return
        }

        console.log(`Updating academic_year to: ${newAcademicYear}`)

        const { error } = await supabase
            .from('students')
            .update({ academic_year: newAcademicYear })
            .eq('student_id_text', studentId)

        if (!error) {
            console.log('Update successful, updating local state')
            setStudents(prev => prev.map(s =>
                s.student_id_text === studentId ? { ...s, academic_year: newAcademicYear } : s
            ))
            router.refresh()
        } else {
            console.error('Grade update error:', error)
            alert('学年の更新に失敗しました')
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`${selectedIds.size}件の学生データを削除しますか？`)) return

        const { error } = await supabase
            .from('students')
            .delete()
            .in('student_id_text', Array.from(selectedIds))

        if (!error) {
            setStudents(prev => prev.filter(s => !selectedIds.has(s.student_id_text)))
            setSelectedIds(new Set())
        } else {
            alert('一括削除に失敗しました')
        }
    }

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

            // 拡張カラムは常に保存を試みる（存在しないカラムは無視される）
            const hasExtendedColumns = true
            console.log('isZaisekiFormat:', isZaisekiFormat, 'hasExtendedColumns:', hasExtendedColumns)

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

                // 拡張カラムのデータを読み込む（在籍者.xlsx形式）
                // カラム位置（在籍者.xlsx）:
                // 4:カタカナ, 5:ローマ字, 6:国籍, 7:性別, 8:生年月日
                // 9:在留資格, 10:入国日, 11:在留期限, 12:パスポート番号
                // 13:在留カード番号, 14:住所, 15:連絡方法, 16:期
                // 18:入学年月日, 19:卒業年月, 20:コース
                if (row[4]) studentData.name_kana = String(row[4]).trim()
                if (row[5]) studentData.name_romaji = String(row[5]).trim()
                if (row[6]) studentData.nationality = String(row[6]).trim()
                if (row[7]) studentData.gender = String(row[7]).trim()
                if (row[8]) studentData.birth_date = excelDateToIso(row[8])
                if (row[9]) studentData.visa_status = String(row[9]).trim()
                if (row[10]) studentData.entry_date = excelDateToIso(row[10])
                if (row[11]) studentData.visa_expiry = excelDateToIso(row[11])
                if (row[12]) studentData.passport_number = String(row[12]).trim()
                if (row[13]) studentData.residence_card_number = String(row[13]).trim()
                if (row[14]) studentData.address = String(row[14]).trim()
                if (row[15]) studentData.phone = String(row[15]).trim()
                if (row[16]) studentData.enrollment_period = String(row[16]).trim()
                if (row[18]) studentData.enrollment_date = excelDateToIso(row[18])
                if (row[19]) studentData.graduation_date = excelDateToIso(row[19])
                if (row[20]) studentData.course = String(row[20]).trim()

                return studentData
            }).filter(s => s.student_id_text)

            // 重複学籍番号を除去（同じ学籍番号の場合、最後の行を採用）
            const uniqueStudents = []
            const seenIds = new Set()
            for (let i = studentsToInsert.length - 1; i >= 0; i--) {
                const student = studentsToInsert[i]
                if (!seenIds.has(student.student_id_text)) {
                    seenIds.add(student.student_id_text)
                    uniqueStudents.unshift(student)
                }
            }
            console.log(`Unique students: ${uniqueStudents.length} (removed ${studentsToInsert.length - uniqueStudents.length} duplicates)`)

            if (uniqueStudents.length === 0) {
                setUploadResult({ success: false, message: 'データが見つかりません' })
                setUploading(false)
                return
            }

            // Upsert (学籍番号で重複時は更新)
            const { error, count } = await supabase
                .from('students')
                .upsert(uniqueStudents, {
                    onConflict: 'student_id_text',
                    count: 'exact'
                })

            if (error) throw error

            // ===== クラスメンバー自動登録 =====
            // 既存のクラス一覧を取得（新規作成分も含む）
            const { data: allClasses } = await supabase
                .from('classes')
                .select('id, name')

            const classMap = new Map((allClasses || []).map(c => [c.name, c.id]))

            // 一括でprofilesを取得（student_idで照合）
            const studentIds = uniqueStudents
                .filter(s => s.class_name && classMap.has(s.class_name))
                .map(s => s.student_id_text)

            let membersRegistered = 0

            if (studentIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, student_id')
                    .in('student_id', studentIds)

                if (profiles && profiles.length > 0) {
                    const profileMap = new Map(profiles.map(p => [p.student_id, p.id]))

                    // class_membersに登録するデータを作成
                    const membersToInsert = uniqueStudents
                        .filter(s => s.class_name && profileMap.has(s.student_id_text))
                        .map(s => ({
                            class_id: classMap.get(s.class_name),
                            user_id: profileMap.get(s.student_id_text)
                        }))
                        .filter(m => m.class_id && m.user_id)

                    if (membersToInsert.length > 0) {
                        const { error: memberError } = await supabase
                            .from('class_members')
                            .upsert(membersToInsert, { onConflict: 'class_id,user_id' })

                        if (!memberError) {
                            membersRegistered = membersToInsert.length
                        }
                    }
                }
            }
            // ===== クラスメンバー自動登録 終了 =====

            let message = `${uniqueStudents.length}件の学生データを登録/更新しました`
            if (classesCreated > 0) {
                message += `。${classesCreated}個のクラスを新規作成しました`
            }
            if (membersRegistered > 0) {
                message += `。${membersRegistered}名をクラスに登録しました`
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

            {/* 一括操作ツールバー */}
            {selectedIds.size > 0 && (
                <div className={styles.bulkActions}>
                    <span className={styles.selectedCount}>{selectedIds.size}件選択中</span>
                    <button onClick={handleBulkDelete} className={styles.bulkDeleteBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        選択した学生を一括削除
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className={styles.cancelSelectionBtn}>
                        選択解除
                    </button>
                </div>
            )}

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
                        <option value="completed">修了</option>
                        <option value="inactive">休学</option>
                        <option value="withdrawn">退学</option>
                    </select>
                    <select
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">すべての学年</option>
                        <option value="1">1年生</option>
                        <option value="2">2年生</option>
                        <option value="0">非在籍者</option>
                    </select>
                    <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">すべてのクラス</option>
                        {classes
                            .filter(c => !['TestClass', 'ベトナム人新入生クラス', '中国人新入生クラス', '現 クラス'].includes(c))
                            .map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))
                        }
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
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={filteredStudents.length > 0 && selectedIds.size === filteredStudents.length}
                                />
                            </th>
                            <th>学籍番号</th>
                            <th>氏名</th>
                            <th>学年</th>
                            <th>クラス</th>
                            <th>ステータス</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(student => {
                            const studentInfo = parseStudentId(student.student_id_text, new Date(), student.academic_year)
                            const isSelected = selectedIds.has(student.student_id_text)

                            if (student.student_id_text === '2307077') {
                                console.log(`Rendering 2307077: AY=${student.academic_year} Grade=${studentInfo.grade}`)
                            }

                            return (
                                <tr key={student.student_id_text} className={isSelected ? styles.selectedRow : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelect(student.student_id_text)}
                                        />
                                    </td>
                                    <td className={styles.idCell}>{student.student_id_text}</td>
                                    <td>{student.full_name}</td>
                                    <td>
                                        <select
                                            value={String(studentInfo.grade || '')}
                                            onChange={(e) => handleGradeChange(student.student_id_text, e.target.value)}
                                            className={`${styles.gradeSelect} ${String(studentInfo.grade) === '1' ? styles.grade1 :
                                                String(studentInfo.grade) === '2' ? styles.grade2 :
                                                    String(studentInfo.grade) === '0' ? styles.grade0 :
                                                        styles.gradeOther
                                                }`}
                                        >
                                            <option value="1">1年生</option>
                                            <option value="2">2年生</option>
                                            <option value="0">非在籍</option>
                                            {!['1', '2', '0'].includes(String(studentInfo.grade)) && <option value={String(studentInfo.grade)}>その他</option>}
                                        </select>
                                    </td>
                                    <td>{student.class_name || '-'}</td>
                                    <td>
                                        <select
                                            value={student.status}
                                            onChange={(e) => handleStatusChange(student.student_id_text, e.target.value)}
                                            className={`${styles.statusSelect} ${styles[student.status]}`}
                                        >
                                            <option value="active">在籍中</option>
                                            <option value="graduated">卒業</option>
                                            <option value="completed">修了</option>
                                            <option value="inactive">休学</option>
                                            <option value="withdrawn">退学</option>
                                        </select>
                                    </td>
                                    <td className={styles.actionCell}>
                                        <button
                                            onClick={() => setSelectedStudent(student)}
                                            className={styles.detailBtn}
                                        >
                                            詳細
                                        </button>
                                        <button
                                            onClick={() => handleDelete(student.student_id_text)}
                                            className={styles.deleteBtn}
                                        >
                                            削除
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
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

            {/* 学生詳細モーダル */}
            {selectedStudent && (
                <StudentDetailModal
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    )
}
