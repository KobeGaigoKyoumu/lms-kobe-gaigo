'use client'

import { useState } from 'react'
import { getStudentsCareerList, getStudentsExamSchedulesList, getStudentsExamSurveysList, saveStudentCareerInfoByAdmin, saveStudentExamSchedules, saveStudentExamSurvey, deleteStudentExamSurvey } from '@/app/actions/career'
import { 
    BookOpen, Clipboard, Calendar, HelpCircle, ChevronRight, ChevronLeft, 
    Save, Edit3, Lock, X, Search, FileText, CheckCircle, AlertCircle, Trash2, Plus
} from 'lucide-react'
import styles from './page.module.css'
import SchoolAutocomplete from '@/components/SchoolAutocomplete'

// 日本語表記（例: 2月10日、2026/02/10、2026-02-10）を YYYY-MM-DD にパースする
const parseToDateInput = (str) => {
    if (!str) return ''
    // 年月日形式 (例: 2026年2月10日, 2026/2/10, 2026-2-10)
    let match = str.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/)
    if (match) {
        return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
    }
    // 年なし形式 (例: 2月10日, 2/10) -> 現在の年を補完
    match = str.match(/(\d{1,2})[月\/\-](\d{1,2})日?/)
    if (match) {
        const y = new Date().getFullYear()
        return `${y}-${String(match[1]).padStart(2, '0')}-${String(match[2]).padStart(2, '0')}`
    }
    const parsed = Date.parse(str)
    if (!isNaN(parsed)) {
        return new Date(parsed).toISOString().split('T')[0]
    }
    return ''
}

// カレンダー入力値を保存用に YYYY/MM/DD にフォーマットする
const formatToSave = (dateVal) => {
    if (!dateVal) return ''
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return dateVal
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export default function CareerManagementClient({
    adminMember,
    classes,
    myClasses,
    hasHomeroom,
    isAdmin,
    initialClass,
    initialStudents,
    initialStudentsExamSchedules,
    initialStudentsExamSurveys
}) {
    const [activeTab, setActiveTab] = useState('career') // 初期表示は「進路」タブ
    const [selectedClass, setSelectedClass] = useState(initialClass)
    const [students, setStudents] = useState(initialStudents)
    const [careerPage, setCareerPage] = useState(1)
    const [examPage, setExamPage] = useState(1)
    const [surveyPage, setSurveyPage] = useState(1)
    const ITEMS_PER_PAGE = 50
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    
    // モーダル関連の状態
    const [selectedStudent, setSelectedStudent] = useState(null) // 現在選択中の学生情報
    const [modalMode, setModalMode] = useState('view') // 'view' or 'edit'
    const [modalStep, setModalStep] = useState(1)
    const [modalForm, setModalForm] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [successMsg, setSuccessMsg] = useState(null)

    // 入試予定関連の状態
    const [studentsExamSchedules, setStudentsExamSchedules] = useState(initialStudentsExamSchedules || [])
    const [selectedStudentForExam, setSelectedStudentForExam] = useState(null)
    const [examModalMode, setExamModalMode] = useState('view')
    const [examFormList, setExamFormList] = useState([])
    const [savingExam, setSavingExam] = useState(false)
    const [examError, setExamError] = useState(null)
    const [examSuccessMsg, setExamSuccessMsg] = useState(null)

    // 入試アンケート関連の状態
    const [studentsExamSurveys, setStudentsExamSurveys] = useState(initialStudentsExamSurveys || [])
    const [selectedStudentForSurvey, setSelectedStudentForSurvey] = useState(null)
    const [surveyModalMode, setSurveyModalMode] = useState('list') // 'list', 'view', 'edit'
    const [surveyStep, setSurveyStep] = useState(1)
    const [surveyForm, setSurveyForm] = useState({})
    const [selectedSurveyId, setSelectedSurveyId] = useState(null)
    const [savingSurvey, setSavingSurvey] = useState(false)
    const [surveyError, setSurveyError] = useState(null)
    const [surveySuccessMsg, setSurveySuccessMsg] = useState(null)

    const initialSurveyForm = {
        class_name: '',
        student_name: '',
        school_type: '大学',
        school_name: '',
        exam_date: '',
        department_name: '',
        exam_type: '一般入試',
        essay_exists: 'なし',
        essay_time: '',
        essay_theme: '',
        japanese_exists: 'なし',
        japanese_time: '',
        japanese_level: 'N2',
        japanese_content: [],
        interview_exists: 'なし',
        interview_time: '',
        interview_teachers: '',
        interview_students: '',
        interview_question_1: '',
        interview_question_2: '',
        interview_question_3: '',
        interview_question_4: '',
        interview_question_5: '',
        other_exam_exists: 'なし',
        other_exam_content: '',
        other_exam_time: '',
        advice: ''
    }

    // クラス切り替えハンドラー
    const handleClassChange = async (className) => {
        setSelectedClass(className)
        setLoading(true)
        setError(null)
        setCareerPage(1)
        setExamPage(1)
        setSurveyPage(1)
        try {
            const [careerData, examData, surveyData] = await Promise.all([
                getStudentsCareerList(className),
                getStudentsExamSchedulesList(className),
                getStudentsExamSurveysList(className)
            ])
            setStudents(careerData)
            setStudentsExamSchedules(examData)
            setStudentsExamSurveys(surveyData)
        } catch (err) {
            console.error('Failed to load class data:', err)
            setError('データの取得に失敗しました。')
        } finally {
            setLoading(false)
        }
    }

    // 検索語に基づくフィルタリング (入試予定タブ用)
    const filteredExamStudents = studentsExamSchedules.filter(s => {
        const term = searchTerm.toLowerCase().trim()
        if (!term) return true
        return (
            s.full_name?.toLowerCase().includes(term) ||
            s.student_id_text?.toLowerCase().includes(term)
        )
    })

    // ページネーション適用 (入試予定)
    const examStartIndex = (examPage - 1) * ITEMS_PER_PAGE
    const paginatedExamStudents = filteredExamStudents.slice(examStartIndex, examStartIndex + ITEMS_PER_PAGE)
    const examTotalPages = Math.ceil(filteredExamStudents.length / ITEMS_PER_PAGE)

    // 検索語に基づくフィルタリング (入試アンケートタブ用)
    const filteredSurveyStudents = studentsExamSurveys.filter(s => {
        const term = searchTerm.toLowerCase().trim()
        if (!term) return true
        return (
            s.full_name?.toLowerCase().includes(term) ||
            s.student_id_text?.toLowerCase().includes(term)
        )
    })

    // ページネーション適用 (入試アンケート)
    const surveyStartIndex = (surveyPage - 1) * ITEMS_PER_PAGE
    const paginatedSurveyStudents = filteredSurveyStudents.slice(surveyStartIndex, surveyStartIndex + ITEMS_PER_PAGE)
    const surveyTotalPages = Math.ceil(filteredSurveyStudents.length / ITEMS_PER_PAGE)

    const openSurveyModal = (student) => {
        setSelectedStudentForSurvey(student)
        setSurveyModalMode('list')
        setSurveyError(null)
        setSurveySuccessMsg(null)
    }

    const startViewingStudentSurvey = (survey) => {
        let parsedContent = []
        if (survey.japanese_content) {
            try {
                parsedContent = JSON.parse(survey.japanese_content)
            } catch (e) {
                parsedContent = Array.isArray(survey.japanese_content) ? survey.japanese_content : []
            }
        }
        setSurveyForm({
            ...survey,
            japanese_content: parsedContent
        })
        setSurveyModalMode('view')
        setSurveyError(null)
        setSurveySuccessMsg(null)
    }

    const startEditingStudentSurvey = (survey) => {
        let parsedContent = []
        if (survey.japanese_content) {
            try {
                parsedContent = JSON.parse(survey.japanese_content)
            } catch (e) {
                parsedContent = Array.isArray(survey.japanese_content) ? survey.japanese_content : []
            }
        }
        setSurveyForm({
            ...survey,
            japanese_content: parsedContent
        })
        setSelectedSurveyId(survey.id)
        setSurveyStep(1)
        setSurveyModalMode('edit')
        setSurveyError(null)
        setSurveySuccessMsg(null)
    }

    const handleSurveyFieldChange = (field, value) => {
        setSurveyForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSurveyCheckboxChange = (value, checked) => {
        setSurveyForm(prev => {
            const current = prev.japanese_content || []
            if (checked) {
                return { ...prev, japanese_content: [...current, value] }
            } else {
                return { ...prev, japanese_content: current.filter(x => x !== value) }
            }
        })
    }

    const handleSaveStudentSurvey = async (e) => {
        e.preventDefault()
        
        if (surveyStep < 5) {
            setSurveyStep(prev => prev + 1)
            return
        }

        if (!surveyForm.school_name.trim()) {
            setSurveyError('学校名を入力してください。')
            return
        }

        setSavingSurvey(true)
        setSurveyError(null)
        try {
            const payload = {
                ...surveyForm,
                id: selectedSurveyId,
                student_id: selectedStudentForSurvey.student_id_text,
                japanese_content: JSON.stringify(surveyForm.japanese_content || [])
            }

            const res = await saveStudentExamSurvey(payload)
            if (res.success) {
                const updatedSurveys = selectedStudentForSurvey.exam_surveys.map(s => {
                    if (s.id === selectedSurveyId) {
                        return {
                            ...s,
                            ...payload,
                            updated_at: new Date().toISOString()
                        }
                    }
                    return s
                })

                const updatedList = studentsExamSurveys.map(s => {
                    if (s.student_id_text === selectedStudentForSurvey.student_id_text) {
                        return { ...s, exam_surveys: updatedSurveys }
                    }
                    return s
                })
                setStudentsExamSurveys(updatedList)

                setSelectedStudentForSurvey(prev => ({
                    ...prev,
                    exam_surveys: updatedSurveys
                }))

                setSurveySuccessMsg('アンケート回答を保存しました。')
                setSurveyModalMode('list')
            } else {
                setSurveyError(res.error || '保存に失敗しました。')
            }
        } catch (err) {
            console.error('Error saving survey:', err)
            setSurveyError('通信エラーが発生しました。')
        } finally {
            setSavingSurvey(false)
        }
    }

    const handleDeleteStudentSurvey = async (surveyId, schoolName) => {
        const isConfirmed = window.confirm(`この「${schoolName}」の入試アンケート回答を削除してもよろしいですか？\n削除すると元に戻せません。`)
        if (!isConfirmed) return

        setSavingSurvey(true)
        setSurveyError(null)
        setSurveySuccessMsg(null)
        try {
            const res = await deleteStudentExamSurvey(surveyId)
            if (res.success) {
                const updatedSurveys = selectedStudentForSurvey.exam_surveys.filter(s => s.id !== surveyId)

                const updatedList = studentsExamSurveys.map(s => {
                    if (s.student_id_text === selectedStudentForSurvey.student_id_text) {
                        return { ...s, exam_surveys: updatedSurveys }
                    }
                    return s
                })
                setStudentsExamSurveys(updatedList)

                setSelectedStudentForSurvey(prev => ({
                    ...prev,
                    exam_surveys: updatedSurveys
                }))

                setSurveySuccessMsg('アンケート回答を削除しました。')
            } else {
                setSurveyError(res.error || '削除に失敗しました。')
            }
        } catch (err) {
            console.error('Error deleting survey:', err)
            setSurveyError('通信エラーが発生しました。')
        } finally {
            setSavingSurvey(false)
        }
    }

    const openExamModal = (student) => {
        setSelectedStudentForExam(student)
        setExamModalMode('view')
        setExamError(null)
        setExamSuccessMsg(null)
    }

    const startEditingStudentExams = () => {
        const schedules = selectedStudentForExam.exam_schedules || []
        if (schedules.length === 0) {
            setExamFormList([{ 
                school_name: '', 
                department_name: '', 
                _app_period_start: '',
                _app_period_end: '',
                exam_date: '', 
                results_date: '', 
                status: '結果待ち' 
            }])
        } else {
            setExamFormList(schedules.map(s => {
                let start = ''
                let end = ''
                if (s.application_period) {
                    const parts = s.application_period.split(' 〜 ')
                    if (parts.length === 2) {
                        start = parseToDateInput(parts[0])
                        end = parseToDateInput(parts[1])
                    } else {
                        const partsAlt = s.application_period.split('~')
                        if (partsAlt.length === 2) {
                            start = parseToDateInput(partsAlt[0])
                            end = parseToDateInput(partsAlt[1])
                        }
                    }
                }
                return { 
                    ...s, 
                    _app_period_start: start,
                    _app_period_end: end,
                    exam_date: parseToDateInput(s.exam_date),
                    results_date: parseToDateInput(s.results_date)
                }
            }))
        }
        setExamModalMode('edit')
    }

    const addExamRow = () => {
        setExamFormList(prev => [...prev, { 
            school_name: '', 
            department_name: '', 
            _app_period_start: '',
            _app_period_end: '',
            exam_date: '', 
            results_date: '', 
            status: '結果待ち' 
        }])
    }

    const removeExamRow = (index) => {
        setExamFormList(prev => prev.filter((_, i) => i !== index))
    }

    const handleExamFieldChange = (index, field, value) => {
        setExamFormList(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
    }

    const handleSaveStudentExams = async (e) => {
        e.preventDefault()
        
        // 学校名が入力されている行について、学部・学科・コースも入力されているかチェック
        const hasEmptyField = examFormList.some(s => 
            (s.school_name.trim() !== '' && (!s.department_name || s.department_name.trim() === ''))
        )
        if (hasEmptyField) {
            setExamError('受験予定校と学部・学科・コースは両方入力してください。')
            return
        }

        const validSchedules = examFormList
            .filter(s => s.school_name.trim() !== '')
            .map(s => {
                let appPeriod = ''
                if (s._app_period_start && s._app_period_end) {
                    appPeriod = `${formatToSave(s._app_period_start)} 〜 ${formatToSave(s._app_period_end)}`
                } else if (s._app_period_start) {
                    appPeriod = formatToSave(s._app_period_start)
                } else if (s._app_period_end) {
                    appPeriod = formatToSave(s._app_period_end)
                }

                return {
                    school_name: s.school_name,
                    department_name: s.department_name,
                    application_period: appPeriod,
                    exam_date: formatToSave(s.exam_date),
                    results_date: formatToSave(s.results_date),
                    status: s.status
                }
            })

        if (validSchedules.length === 0 && examFormList.length > 0) {
            setExamError('受験予定校を入力してください。不要な行は削除してください。')
            return
        }

        setSavingExam(true)
        setExamError(null)
        try {
            const res = await saveStudentExamSchedules(selectedStudentForExam.student_id_text, validSchedules)
            if (res.success) {
                const updatedList = studentsExamSchedules.map(s => {
                    if (s.student_id_text === selectedStudentForExam.student_id_text) {
                        return { ...s, exam_schedules: validSchedules }
                    }
                    return s
                })
                setStudentsExamSchedules(updatedList)

                setSelectedStudentForExam(prev => ({
                    ...prev,
                    exam_schedules: validSchedules
                }))

                setExamSuccessMsg('入試予定を保存しました。')
                setExamModalMode('view')
            } else {
                setExamError(res.error || '保存に失敗しました。')
            }
        } catch (err) {
            console.error('Error saving exams:', err)
            setExamError('通信エラーが発生しました。')
        } finally {
            setSavingExam(false)
        }
    }

    const handleDeleteExam = async (index) => {
        const scheduleToDelete = selectedStudentForExam.exam_schedules[index]
        if (!scheduleToDelete) return

        const isConfirmed = window.confirm(`この入試予定（${scheduleToDelete.school_name}）を削除してもよろしいですか？`)
        if (!isConfirmed) return

        const updatedSchedules = selectedStudentForExam.exam_schedules.filter((_, i) => i !== index)

        setSavingExam(true)
        setExamError(null)
        setExamSuccessMsg(null)
        try {
            const res = await saveStudentExamSchedules(selectedStudentForExam.student_id_text, updatedSchedules)
            if (res.success) {
                const updatedList = studentsExamSchedules.map(s => {
                    if (s.student_id_text === selectedStudentForExam.student_id_text) {
                        return { ...s, exam_schedules: updatedSchedules }
                    }
                    return s
                })
                setStudentsExamSchedules(updatedList)

                setSelectedStudentForExam(prev => ({
                    ...prev,
                    exam_schedules: updatedSchedules
                }))

                setExamSuccessMsg('入試予定を削除しました。')
            } else {
                setExamError(res.error || '削除に失敗しました。')
            }
        } catch (err) {
            console.error('Error deleting exam:', err)
            setExamError('通信エラーが発生しました。')
        } finally {
            setSavingExam(false)
        }
    }

    // 検索語に基づくフィルタリング
    const filteredStudents = students.filter(s => {
        const term = searchTerm.toLowerCase().trim()
        if (!term) return true
        return (
            s.full_name?.toLowerCase().includes(term) ||
            s.student_id_text?.toLowerCase().includes(term)
        )
    })

    // ページネーション適用 (進路)
    const careerStartIndex = (careerPage - 1) * ITEMS_PER_PAGE
    const paginatedCareerStudents = filteredStudents.slice(careerStartIndex, careerStartIndex + ITEMS_PER_PAGE)
    const careerTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)

    // クラス名昇順ソート用
    const sortedClasses = [...classes].sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true })
    )
    const sortedMyClasses = [...myClasses].sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true })
    )

    // 選択可能なクラスのリスト
    const availableClassesForSelect = isAdmin || !hasHomeroom ? sortedClasses : sortedMyClasses

    // 日付フォーマット
    const formatDate = (isoString) => {
        if (!isoString) return '-'
        const date = new Date(isoString)
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    // 回答詳細モーダルを開く (Viewモード)
    const openViewModal = (student) => {
        setSelectedStudent(student)
        setModalMode('view')
        setError(null)
        setSuccessMsg(null)
    }

    // 編集モードの開始
    const startEditing = () => {
        const info = selectedStudent.career_info
        setModalForm({
            class_name: selectedStudent.class_name || '',
            student_name: selectedStudent.full_name || '',
            path_type: info?.path_type || '進学',
            first_choice_school: info?.first_choice_school || '',
            first_choice_reason: info?.first_choice_reason || '',
            first_choice_department: info?.first_choice_department || '',
            second_choice_school: info?.second_choice_school || '',
            second_choice_reason: info?.second_choice_reason || '',
            second_choice_department: info?.second_choice_department || '',
            third_choice_school: info?.third_choice_school || '',
            third_choice_reason: info?.third_choice_reason || '',
            third_choice_department: info?.third_choice_department || '',
            preferred_field: info?.preferred_field || '',
            preferred_region: info?.preferred_region || '',
            can_move: info?.can_move || '可',
            tuition_budget: info?.tuition_budget || '',
            parent_support: info?.parent_support || '可',
            parent_support_amount: info?.parent_support_amount || '',
            passbook_updated: info?.passbook_updated || 'している',
            pay_slips_available: info?.pay_slips_available || '有',
            exam_schedule: info?.exam_schedule || '',
            post_grad_plans: info?.post_grad_plans || '',
            teacher_questions: info?.teacher_questions || ''
        })
        setModalStep(1)
        setModalMode('edit')
    }

    // 編集フィールド変更
    const handleFieldChange = (field, value) => {
        setModalForm(prev => ({ ...prev, [field]: value }))
    }

    // ステップ進行
    const nextStep = () => {
        if (modalStep === 1 && modalForm.path_type !== '進学') {
            setModalStep(3)
        } else {
            setModalStep(prev => prev + 1)
        }
    }

    // ステップ戻る
    const prevStep = () => {
        if (modalStep === 3 && modalForm.path_type !== '進学') {
            setModalStep(1)
        } else {
            setModalStep(prev => prev - 1)
        }
    }

    // 保存処理
    const handleSave = async (e) => {
        e.preventDefault()
        if (modalStep < 4) {
            nextStep()
            return
        }

        setSaving(true)
        setError(null)
        
        try {
            const res = await saveStudentCareerInfoByAdmin(selectedStudent.student_id_text, modalForm)
            if (res.success) {
                // ローカルの学生リスト状態を更新
                const updatedStudents = students.map(s => {
                    if (s.student_id_text === selectedStudent.student_id_text) {
                        const updatedInfo = {
                            ...s.career_info,
                            ...modalForm,
                            updated_at: new Date().toISOString()
                        }
                        return { ...s, career_info: updatedInfo }
                    }
                    return s
                })
                setStudents(updatedStudents)

                // モーダル表示用データの更新
                setSelectedStudent(prev => ({
                    ...prev,
                    career_info: {
                        ...prev.career_info,
                        ...modalForm,
                        updated_at: new Date().toISOString()
                    }
                }))

                setSuccessMsg('進路希望情報を保存しました。')
                setModalMode('view')
            } else {
                setError(res.error || '保存に失敗しました。')
            }
        } catch (err) {
            console.error('Error saving career info:', err)
            setError('通信エラーが発生しました。')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>面談・進路管理</h1>
                <p className={styles.subtitle}>
                    学生の進路希望状況の確認・修正、面談の管理を行います。
                </p>
            </header>

            {/* タブバー */}
            <div className={styles.tabContainer}>
                <button
                    onClick={() => setActiveTab('interview')}
                    className={`${styles.tabButton} ${activeTab === 'interview' ? styles.tabButtonActive : ''}`}
                >
                    面談
                </button>
                <button
                    onClick={() => setActiveTab('career')}
                    className={`${styles.tabButton} ${activeTab === 'career' ? styles.tabButtonActive : ''}`}
                >
                    進路
                </button>
                <button
                    onClick={() => setActiveTab('exam')}
                    className={`${styles.tabButton} ${activeTab === 'exam' ? styles.tabButtonActive : ''}`}
                >
                    入試予定
                </button>
                <button
                    onClick={() => setActiveTab('survey')}
                    className={`${styles.tabButton} ${activeTab === 'survey' ? styles.tabButtonActive : ''}`}
                >
                    入試アンケート
                </button>
            </div>

            {/* ====================================================
                面談タブ (準備中)
               ==================================================== */}
            {activeTab === 'interview' && (
                <div className={styles.tabContent}>
                    <div className={styles.noticeCard}>
                        <div className={styles.noticeIcon}>
                            <Calendar size={48} color="var(--primary-600)" />
                        </div>
                        <h2>面談管理機能について</h2>
                        <p className={styles.noticeText}>
                            現在、個別面談の調整および面談履歴の記録機能は準備中です。
                        </p>
                        <p className={styles.noticeSubText}>
                            今後のシステムアップデートをお待ちください。
                        </p>
                    </div>
                </div>
            )}

            {/* ====================================================
                進路タブ (回答一覧 ＆ 修正)
               ==================================================== */}
            {activeTab === 'career' && (
                <div className={styles.tabContent}>
                    
                    {/* クラス非担当教員への案内 */}
                    {!isAdmin && !hasHomeroom && (
                        <div className={styles.infoBanner}>
                            <AlertCircle size={18} />
                            <span>担任クラスが登録されていないため、全クラスの学生を表示しています。</span>
                        </div>
                    )}

                    {/* コントロールエリア (クラス選択 & 検索) */}
                    <div className={styles.controls}>
                        <div className={styles.filterGroup}>
                            <label className={styles.controlLabel}>クラス:</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => handleClassChange(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">すべてのクラス</option>
                                {availableClassesForSelect.map(c => (
                                    <option key={c.id} value={c.name}>
                                        {c.name} {c.homeroom_teacher_name ? `(${c.homeroom_teacher_name}先生)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.searchGroup}>
                            <div className={styles.searchWrapper}>
                                <Search size={16} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="名前または学籍番号で検索..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setCareerPage(1)
                                        setExamPage(1)
                                        setSurveyPage(1)
                                    }}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 学生一覧テーブル */}
                    <div className={styles.tableCard}>
                        {loading ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinner}></div>
                                <p>データを読み込んでいます...</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FileText size={48} color="var(--text-tertiary)" />
                                <p>該当する学生が見つかりません。</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>クラス</th>
                                                <th>学籍番号</th>
                                                <th>氏名</th>
                                                <th>進路希望区分</th>
                                                <th>第一志望校 / 志望分野</th>
                                                <th>自己予算 / 仕送り</th>
                                                <th>回答ステータス</th>
                                                <th>最終更新日時</th>
                                                <th className={styles.textCenter}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedCareerStudents.map(student => {
                                                const info = student.career_info
                                                const hasFilled = !!info

                                                return (
                                                    <tr key={student.student_id_text}>
                                                        <td data-label="クラス">{student.class_name || '-'}</td>
                                                        <td data-label="学籍番号">{student.student_id_text}</td>
                                                        <td data-label="氏名" className={styles.fontWeightMedium}>{student.full_name}</td>
                                                        <td data-label="進路希望区分">
                                                            {hasFilled ? (
                                                                <span className={`${styles.badge} ${styles.badgePrimary}`}>
                                                                    {info.path_type}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td data-label="第一志望校 / 志望分野">
                                                            {hasFilled ? (
                                                                info.path_type === '進学' ? (
                                                                    <span className={styles.truncateText}>
                                                                        {info.first_choice_school || '未記入'} 
                                                                        {info.first_choice_department ? ` (${info.first_choice_department})` : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span className={styles.truncateText}>
                                                                        {info.preferred_field || '未記入'}
                                                                    </span>
                                                                )
                                                            ) : '-'}
                                                        </td>
                                                        <td data-label="自己予算 / 仕送り">
                                                            {hasFilled ? (
                                                                <span className={styles.fontSizeSmall}>
                                                                    予算: {info.tuition_budget ? `${info.tuition_budget}万` : '未'} / 
                                                                    支援: {info.parent_support === '可' ? (info.parent_support_amount ? `${info.parent_support_amount}万` : '可') : '不可'}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td data-label="回答ステータス">
                                                            {hasFilled ? (
                                                                <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                                    回答済み
                                                                </span>
                                                            ) : (
                                                                <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                                                                    未登録
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td data-label="最終更新日時" className={styles.fontSizeSmall}>
                                                            {hasFilled ? formatDate(info.updated_at || info.created_at) : '-'}
                                                        </td>
                                                        <td data-label="操作" className={styles.textCenter}>
                                                            <button
                                                                onClick={() => openViewModal(student)}
                                                                className={styles.actionButton}
                                                            >
                                                                確認・修正
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {careerTotalPages > 1 && (
                                    <div className={styles.paginationSection}>
                                        <div className={styles.paginationInfo}>
                                            全 {filteredStudents.length} 人中 {careerStartIndex + 1}〜{Math.min(careerStartIndex + ITEMS_PER_PAGE, filteredStudents.length)} 人を表示
                                        </div>
                                        <div className={styles.paginationControls}>
                                            <button 
                                                onClick={() => setCareerPage(prev => Math.max(prev - 1, 1))}
                                                disabled={careerPage === 1}
                                                className={styles.pageBtn}
                                            >
                                                前へ
                                            </button>
                                            <span className={styles.pageIndicator}>
                                                {careerPage} / {careerTotalPages}
                                            </span>
                                            <button 
                                                onClick={() => setCareerPage(prev => Math.min(prev + 1, careerTotalPages))}
                                                disabled={careerPage === careerTotalPages}
                                                className={styles.pageBtn}
                                            >
                                                次へ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ====================================================
                入試予定タブ (受験予定校・出願期間・入試日・合否状況)
               ==================================================== */}
            {activeTab === 'exam' && (
                <div className={styles.tabContent}>
                    {/* クラス非担当教員への案内 */}
                    {!isAdmin && !hasHomeroom && (
                        <div className={styles.infoBanner}>
                            <AlertCircle size={18} />
                            <span>担任クラスが登録されていないため、全クラスの学生を表示しています。</span>
                        </div>
                    )}

                    {/* コントロールエリア (クラス選択 & 検索) */}
                    <div className={styles.controls}>
                        <div className={styles.filterGroup}>
                            <label className={styles.controlLabel}>クラス:</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => handleClassChange(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">すべてのクラス</option>
                                {availableClassesForSelect.map(c => (
                                    <option key={c.id} value={c.name}>
                                        {c.name} {c.homeroom_teacher_name ? `(${c.homeroom_teacher_name}先生)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.searchGroup}>
                            <div className={styles.searchWrapper}>
                                <Search size={16} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="名前または学籍番号で検索..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setCareerPage(1)
                                        setExamPage(1)
                                        setSurveyPage(1)
                                    }}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 学生一覧テーブル */}
                    <div className={styles.tableCard}>
                        {loading ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinner}></div>
                                <p>データを読み込んでいます...</p>
                            </div>
                        ) : filteredExamStudents.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FileText size={48} color="var(--text-tertiary)" />
                                <p>該当する学生が見つかりません。</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>クラス</th>
                                                <th>学籍番号</th>
                                                <th>氏名</th>
                                                <th>受験予定校一覧 (学部・学科・コース)</th>
                                                <th className={styles.textCenter}>受験校数</th>
                                                <th className={styles.textCenter}>合格数</th>
                                                <th className={styles.textCenter}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedExamStudents.map(student => {
                                                const list = student.exam_schedules || []
                                                const totalExams = list.length
                                                const passCount = list.filter(s => s.status === '合格').length

                                                return (
                                                    <tr key={student.student_id_text}>
                                                        <td data-label="クラス">{student.class_name || '-'}</td>
                                                        <td data-label="学籍番号">{student.student_id_text}</td>
                                                        <td data-label="氏名" className={styles.fontWeightMedium}>{student.full_name}</td>
                                                        <td data-label="受験予定校一覧 (学部・学科・コース)">
                                                            <span className={styles.truncateText} style={{ maxWidth: '350px' }}>
                                                                {list.length > 0 ? (
                                                                    list.map((s, idx) => (
                                                                        `${s.school_name}${s.department_name ? ` (${s.department_name})` : ''}`
                                                                    )).join(', ')
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-tertiary)' }}>未登録</span>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td data-label="受験校数" className={styles.textCenter}>{totalExams}</td>
                                                        <td data-label="合格数" className={styles.textCenter} style={{ fontWeight: passCount > 0 ? '700' : 'normal', color: passCount > 0 ? 'var(--success-700)' : 'inherit' }}>
                                                            {passCount}
                                                        </td>
                                                        <td data-label="操作" className={styles.textCenter}>
                                                            <button
                                                                onClick={() => openExamModal(student)}
                                                                className={styles.actionButton}
                                                            >
                                                                確認・修正
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {examTotalPages > 1 && (
                                    <div className={styles.paginationSection}>
                                        <div className={styles.paginationInfo}>
                                            全 {filteredExamStudents.length} 人中 {examStartIndex + 1}〜{Math.min(examStartIndex + ITEMS_PER_PAGE, filteredExamStudents.length)} 人を表示
                                        </div>
                                        <div className={styles.paginationControls}>
                                            <button 
                                                onClick={() => setExamPage(prev => Math.max(prev - 1, 1))}
                                                disabled={examPage === 1}
                                                className={styles.pageBtn}
                                            >
                                                前へ
                                            </button>
                                            <span className={styles.pageIndicator}>
                                                {examPage} / {examTotalPages}
                                            </span>
                                            <button 
                                                onClick={() => setExamPage(prev => Math.min(prev + 1, examTotalPages))}
                                                disabled={examPage === examTotalPages}
                                                className={styles.pageBtn}
                                            >
                                                次へ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ====================================================
                回答確認・修正用モーダル
               ==================================================== */}
            {selectedStudent && (
                <div className={styles.modalOverlay} onClick={() => modalMode === 'view' && setSelectedStudent(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        
                        {/* モーダルヘッダー */}
                        <div className={styles.modalHeader}>
                            <h2>
                                {modalMode === 'view' 
                                    ? `進路回答の確認 (${selectedStudent.full_name} さん)` 
                                    : `回答の修正 (${selectedStudent.full_name} さん)`
                                }
                            </h2>
                            <button 
                                onClick={() => setSelectedStudent(null)} 
                                className={styles.closeModalBtn}
                                disabled={saving}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* モーダルボディ */}
                        <div className={styles.modalBody}>
                            {successMsg && (
                                <div className={styles.successAlert}>
                                    <CheckCircle size={16} />
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            {error && (
                                <div className={styles.errorAlert}>
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* ==========================================
                                VIEW MODE: 進路希望の確認
                               ========================================== */}
                            {modalMode === 'view' && (
                                <div>
                                    {!selectedStudent.career_info ? (
                                        <div className={styles.noDataState}>
                                            <AlertCircle size={36} color="var(--text-tertiary)" />
                                            <p>この学生はまだ進路希望情報を登録していません。</p>
                                            <button onClick={startEditing} className={styles.editButton}>
                                                <Edit3 size={16} />
                                                新規登録する
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.detailContainer}>
                                            <div className={styles.detailHeaderActions}>
                                                <button onClick={startEditing} className={styles.editButton}>
                                                    <Edit3 size={16} />
                                                    内容を修正する
                                                </button>
                                            </div>
                                            
                                            <div className={styles.detailInstruction}>
                                                現在の状況をわかる範囲で記入。分からない所は空欄でもOK。情報に変更があり次第、即座に変更した情報を記入。
                                            </div>

                                            <div className={styles.detailGrid}>
                                                {/* セクション: 基本情報 */}
                                                <div className={styles.detailCard}>
                                                    <h3>基本情報</h3>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>クラス:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.class_name || '未設定'}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>氏名:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.full_name}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>希望進路:</span>
                                                        <span className={`${styles.detailValue} ${styles.badge} ${styles.badgePrimary}`}>
                                                            {selectedStudent.career_info.path_type}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* セクション: 志望校 (進学の場合のみ) */}
                                                {selectedStudent.career_info.path_type === '進学' && (
                                                    <div className={styles.detailCard}>
                                                        <h3>志望校希望</h3>
                                                        {selectedStudent.career_info.first_choice_school && (
                                                            <div className={styles.choiceGroup}>
                                                                <div className={styles.choiceHeader}>第一志望</div>
                                                                <div className={styles.detailRow}>
                                                                    <span className={styles.detailLabel}>学校名:</span>
                                                                    <span className={styles.detailValue}>
                                                                        {selectedStudent.career_info.first_choice_school}
                                                                        {selectedStudent.career_info.first_choice_department ? ` (${selectedStudent.career_info.first_choice_department})` : ''}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.detailRow}>
                                                                    <span className={styles.detailLabel}>志望理由:</span>
                                                                    <span className={styles.detailValueBlock}>{selectedStudent.career_info.first_choice_reason || '未記入'}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedStudent.career_info.second_choice_school && (
                                                            <div className={styles.choiceGroup}>
                                                                <div className={styles.choiceHeader}>第二志望</div>
                                                                <div className={styles.detailRow}>
                                                                    <span className={styles.detailLabel}>学校名:</span>
                                                                    <span className={styles.detailValue}>
                                                                        {selectedStudent.career_info.second_choice_school}
                                                                        {selectedStudent.career_info.second_choice_department ? ` (${selectedStudent.career_info.second_choice_department})` : ''}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.detailRow}>
                                                                    <span className={styles.detailLabel}>志望理由:</span>
                                                                    <span className={styles.detailValueBlock}>{selectedStudent.career_info.second_choice_reason || '未記入'}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedStudent.career_info.third_choice_school && (
                                                            <div className={styles.choiceGroup}>
                                                                <div className={styles.choiceHeader}>第三志望</div>
                                                                <div className={styles.detailRow}>
                                                                    <span className={styles.detailLabel}>学校名:</span>
                                                                    <span className={styles.detailValue}>
                                                                        {selectedStudent.career_info.third_choice_school}
                                                                        {selectedStudent.career_info.third_choice_department ? ` (${selectedStudent.career_info.third_choice_department})` : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* セクション: 希望条件 ＆ 確認事項 */}
                                                <div className={styles.detailCard}>
                                                    <h3>希望条件 & 確認事項</h3>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>希望分野:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.career_info.preferred_field || '未記入'}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>希望地域:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.career_info.preferred_region || '未記入'}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>引っ越し可否:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.career_info.can_move}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>学費予算(年間):</span>
                                                        <span className={styles.detailValue}>
                                                            {selectedStudent.career_info.tuition_budget ? `${selectedStudent.career_info.tuition_budget}万円` : '未記入'}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>両親の支援:</span>
                                                        <span className={styles.detailValue}>
                                                            {selectedStudent.career_info.parent_support}
                                                            {selectedStudent.career_info.parent_support === '可' && selectedStudent.career_info.parent_support_amount ? ` (年額: ${selectedStudent.career_info.parent_support_amount}万円)` : ''}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>通帳の定期記帳:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.career_info.passbook_updated}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>給与明細保管:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.career_info.pay_slips_available}</span>
                                                    </div>
                                                </div>

                                                {/* セクション: スケジュール ＆ 担任への質問 */}
                                                <div className={styles.detailCard}>
                                                    <h3>今後のスケジュール & 相談</h3>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>受験予定時期:</span>
                                                        <span className={styles.detailValue}>{selectedStudent.career_info.exam_schedule || '未記入'}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>卒業後の予定:</span>
                                                        <span className={styles.detailValueBlock}>{selectedStudent.career_info.post_grad_plans || '未記入'}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>担任への相談:</span>
                                                        <span className={styles.detailValueBlock}>{selectedStudent.career_info.teacher_questions || '特になし'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ==========================================
                                EDIT MODE: 4ステップ ウィザード入力
                               ========================================== */}
                            {modalMode === 'edit' && (
                                <div className={styles.wizardContainer}>
                                    <div className={styles.wizardHeader}>
                                        <div className={styles.stepProgress}>
                                            <div className={styles.progressBar}>
                                                <div 
                                                    className={styles.progressInner} 
                                                    style={{ width: `${(modalStep / 4) * 100}%` }}
                                                />
                                            </div>
                                            <span className={styles.stepText}>ステップ {modalStep} / 4</span>
                                        </div>
                                    </div>
                                    <p className={styles.wizardInstruction}>
                                        現在の状況をわかる範囲で記入。分からない所は空欄でもOK。情報に変更があり次第、即座に変更した情報を記入。
                                    </p>

                                    <form onSubmit={handleSave} className={styles.wizardForm}>
                                        {/* STEP 1: Basic Info */}
                                        {modalStep === 1 && (
                                            <div className={styles.formStep}>
                                                <h3>1. 基本情報の登録</h3>
                                                <div className={styles.inputGroup}>
                                                    <label>クラス</label>
                                                    <input 
                                                        type="text" 
                                                        value={modalForm.class_name} 
                                                        disabled 
                                                        className={styles.disabledInput}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>氏名</label>
                                                    <input 
                                                        type="text" 
                                                        value={modalForm.student_name} 
                                                        disabled 
                                                        className={styles.disabledInput}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>希望する進路区分</label>
                                                    <select 
                                                        value={modalForm.path_type}
                                                        onChange={(e) => handleFieldChange('path_type', e.target.value)}
                                                        className={styles.selectInput}
                                                    >
                                                        <option value="進学">進学</option>
                                                        <option value="就職">就職</option>
                                                        <option value="帰国">帰国</option>
                                                        <option value="そのほか">そのほか</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 2: School Choice (進学のみ) */}
                                        {modalStep === 2 && modalForm.path_type === '進学' && (
                                            <div className={styles.formStep}>
                                                <h3>2. 志望校の希望</h3>
                                                
                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 第一志望</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>志望校名</label>
                                                            <SchoolAutocomplete 
                                                                value={modalForm.first_choice_school}
                                                                onChange={(val) => handleFieldChange('first_choice_school', val)}
                                                                placeholder="例: 神戸国際大学"
                                                                required
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コース</label>
                                                            <input 
                                                                type="text" 
                                                                value={modalForm.first_choice_department}
                                                                onChange={(e) => handleFieldChange('first_choice_department', e.target.value)}
                                                                placeholder="例: 経済学部"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>志望理由</label>
                                                        <textarea 
                                                            value={modalForm.first_choice_reason}
                                                            onChange={(e) => handleFieldChange('first_choice_reason', e.target.value)}
                                                            placeholder="志望理由を記入してください。"
                                                            rows={3}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 第二志望</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>志望校名</label>
                                                            <SchoolAutocomplete 
                                                                value={modalForm.second_choice_school}
                                                                onChange={(val) => handleFieldChange('second_choice_school', val)}
                                                                placeholder="第二志望校名を入力（任意）"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コース</label>
                                                            <input 
                                                                type="text" 
                                                                value={modalForm.second_choice_department}
                                                                onChange={(e) => handleFieldChange('second_choice_department', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>志望理由</label>
                                                        <textarea 
                                                            value={modalForm.second_choice_reason}
                                                            onChange={(e) => handleFieldChange('second_choice_reason', e.target.value)}
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 第三志望</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>志望校名</label>
                                                            <SchoolAutocomplete 
                                                                value={modalForm.third_choice_school}
                                                                onChange={(val) => handleFieldChange('third_choice_school', val)}
                                                                placeholder="第三志望校名を入力（任意）"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コース</label>
                                                            <input 
                                                                type="text" 
                                                                value={modalForm.third_choice_department}
                                                                onChange={(e) => handleFieldChange('third_choice_department', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 3: Conditions & Money */}
                                        {modalStep === 3 && (
                                            <div className={styles.formStep}>
                                                <h3>3. 希望条件と確認事項</h3>
                                                
                                                <div className={styles.formRow2Col}>
                                                    <div className={styles.inputGroup}>
                                                        <label>希望分野</label>
                                                        <input 
                                                            type="text" 
                                                            value={modalForm.preferred_field}
                                                            onChange={(e) => handleFieldChange('preferred_field', e.target.value)}
                                                            placeholder="例: IT、ビジネス"
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>希望地域</label>
                                                        <input 
                                                            type="text" 
                                                            value={modalForm.preferred_region}
                                                            onChange={(e) => handleFieldChange('preferred_region', e.target.value)}
                                                            placeholder="例: 関西、東京"
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.radioGroup}>
                                                    <label>進路決定に伴う引っ越しの可否</label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.can_move === '可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('can_move', '可')}
                                                        >可</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.can_move === '不可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('can_move', '不可')}
                                                        >不可</button>
                                                    </div>
                                                </div>

                                                <h4 className={styles.subStepTitle}>■ 留学維持・進学資金確認</h4>

                                                <div className={styles.inputGroup}>
                                                    <label>自己準備可能な学費予算額 (年間)</label>
                                                    <input 
                                                        type="number" 
                                                        value={modalForm.tuition_budget}
                                                        onChange={(e) => handleFieldChange('tuition_budget', e.target.value)}
                                                        placeholder="例: 80"
                                                        style={{ width: '200px', display: 'inline-block', marginRight: '8px' }}
                                                    />
                                                    <span>万円</span>
                                                </div>

                                                <div className={styles.radioGroup}>
                                                    <label>両親による学費の支援</label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.parent_support === '可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('parent_support', '可')}
                                                        >可</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.parent_support === '不可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('parent_support', '不可')}
                                                        >不可</button>
                                                    </div>
                                                    {modalForm.parent_support === '可' && (
                                                        <div className={styles.inputGroup} style={{ marginTop: 'var(--spacing-3)' }}>
                                                            <label>仕送り支援額 (年額)</label>
                                                            <input 
                                                                type="number" 
                                                                value={modalForm.parent_support_amount}
                                                                onChange={(e) => handleFieldChange('parent_support_amount', e.target.value)}
                                                                placeholder="例: 60"
                                                                style={{ width: '200px', display: 'inline-block', marginRight: '8px' }}
                                                            />
                                                            <span>万円</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={styles.radioGroup}>
                                                    <label>銀行預金通帳の定期的な記帳</label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.passbook_updated === 'している' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('passbook_updated', 'している')}
                                                        >している</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.passbook_updated === 'していない' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('passbook_updated', 'していない')}
                                                        >していない</button>
                                                    </div>
                                                </div>

                                                <div className={styles.radioGroup}>
                                                    <label>全アルバイト履歴の給与明細書の保管</label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.pay_slips_available === '有' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('pay_slips_available', '有')}
                                                        >有</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${modalForm.pay_slips_available === '無' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('pay_slips_available', '無')}
                                                        >無</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 4: Schedule & Others */}
                                        {modalStep === 4 && (
                                            <div className={styles.formStep}>
                                                <h3>4. 受験予定・卒業後の予定</h3>

                                                <div className={styles.inputGroup}>
                                                    <label>受験予定時期</label>
                                                    <input 
                                                        type="text" 
                                                        value={modalForm.exam_schedule}
                                                        onChange={(e) => handleFieldChange('exam_schedule', e.target.value)}
                                                        placeholder="例: 2026年10月頃"
                                                    />
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label>進学先（就職先）卒業後の将来の予定</label>
                                                    <textarea 
                                                        value={modalForm.post_grad_plans}
                                                        onChange={(e) => handleFieldChange('post_grad_plans', e.target.value)}
                                                        placeholder="将来の予定を記入してください。"
                                                        rows={3}
                                                    />
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label>担任に聞きたいこと・心配事</label>
                                                    <textarea 
                                                        value={modalForm.teacher_questions}
                                                        onChange={(e) => handleFieldChange('teacher_questions', e.target.value)}
                                                        placeholder="担任教員に相談したいことがあれば記入してください。"
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* 編集ナビゲーション */}
                                        <div className={styles.formNavigation}>
                                            {modalStep > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={prevStep}
                                                    className={styles.prevBtn}
                                                    disabled={saving}
                                                >
                                                    <ChevronLeft size={16} />
                                                    前へ
                                                </button>
                                            )}
                                            
                                            {modalStep === 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setModalMode('view')}
                                                    className={styles.cancelBtn}
                                                    disabled={saving}
                                                >
                                                    キャンセル
                                                </button>
                                            )}

                                            {modalStep < 4 ? (
                                                <button 
                                                    key="next-btn"
                                                    type="button" 
                                                    onClick={nextStep}
                                                    className={styles.nextBtn}
                                                >
                                                    次へ
                                                    <ChevronRight size={16} />
                                                </button>
                                            ) : (
                                                <button 
                                                    key="submit-btn"
                                                    type="submit" 
                                                    disabled={saving}
                                                    className={styles.submitBtn}
                                                >
                                                    <Save size={16} />
                                                    {saving ? '保存中...' : '登録する'}
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ====================================================
                教員側・学生入試予定確認・修正用モーダル
               ==================================================== */}
            {selectedStudentForExam && (
                <div className={styles.modalOverlay} onClick={() => examModalMode === 'view' && setSelectedStudentForExam(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        
                        {/* モーダルヘッダー */}
                        <div className={styles.modalHeader}>
                            <h2>
                                {examModalMode === 'view' 
                                    ? `入試予定の確認 (${selectedStudentForExam.full_name} さん)` 
                                    : `入試予定の修正 (${selectedStudentForExam.full_name} さん)`
                                }
                            </h2>
                            <button 
                                onClick={() => setSelectedStudentForExam(null)} 
                                className={styles.closeModalBtn}
                                disabled={savingExam}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* モーダルボディ */}
                        <div className={styles.modalBody}>
                            {examSuccessMsg && (
                                <div className={styles.successAlert}>
                                    <CheckCircle size={16} />
                                    <span>{examSuccessMsg}</span>
                                </div>
                            )}

                            {examError && (
                                <div className={styles.errorAlert}>
                                    <AlertCircle size={16} />
                                    <span>{examError}</span>
                                </div>
                            )}

                            {/* VIEW MODE */}
                            {examModalMode === 'view' && (
                                <div>
                                    {(!selectedStudentForExam.exam_schedules || selectedStudentForExam.exam_schedules.length === 0) ? (
                                        <div className={styles.noDataState}>
                                            <AlertCircle size={36} color="var(--text-tertiary)" />
                                            <p>入試予定情報が登録されていません。</p>
                                            <button onClick={startEditingStudentExams} className={styles.editButton}>
                                                <Edit3 size={16} />
                                                新規追加する
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.detailContainer}>
                                            <div className={styles.detailHeaderActions}>
                                                <button onClick={startEditingStudentExams} className={styles.editButton}>
                                                    <Edit3 size={16} />
                                                    入試予定を修正する
                                                </button>
                                            </div>
                                            
                                            <div className={styles.tableCard} style={{ marginTop: 'var(--spacing-4)' }}>
                                                <div className={styles.tableWrapper}>
                                                    <table className={styles.table}>
                                                        <thead>
                                                            <tr>
                                                                <th>受験予定校 (学部・学科・コース)</th>
                                                                <th>出願期間</th>
                                                                <th>入試日</th>
                                                                <th>合否発表日</th>
                                                                <th className={styles.textCenter}>合否</th>
                                                                <th className={styles.textCenter}>操作</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedStudentForExam.exam_schedules.map((schedule, idx) => (
                                                                <tr key={schedule.id || idx}>
                                                                    <td className={styles.fontWeightMedium}>
                                                                        <div>{schedule.school_name}</div>
                                                                        {schedule.department_name && (
                                                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                                {schedule.department_name}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ whiteSpace: 'nowrap' }}>{schedule.application_period || '-'}</td>
                                                                    <td style={{ whiteSpace: 'nowrap' }}>{schedule.exam_date || '-'}</td>
                                                                    <td style={{ whiteSpace: 'nowrap' }}>{schedule.results_date || '-'}</td>
                                                                    <td className={styles.textCenter}>
                                                                        <span className={`${styles.badge} ${
                                                                            schedule.status === '合格' ? styles.badgeSuccess :
                                                                            schedule.status === '不合格' ? styles.badgeDanger :
                                                                            schedule.status === '結果待ち' ? styles.badgeWarning :
                                                                            styles.badgeSecondary
                                                                        }`}>
                                                                            {schedule.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className={styles.textCenter}>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => handleDeleteExam(idx)} 
                                                                            className={styles.deleteRowBtn}
                                                                            disabled={savingExam}
                                                                            title="削除"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                            削除
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {/* スマホ用カードビュー */}
                                                <div className={styles.examCardList}>
                                                    {selectedStudentForExam.exam_schedules.map((schedule, idx) => (
                                                         <div key={schedule.id || idx} className={styles.examCard} style={{ position: 'relative' }}>
                                                             <button 
                                                                 type="button"
                                                                 onClick={() => handleDeleteExam(idx)} 
                                                                 className={styles.deleteRowBtn}
                                                                 disabled={savingExam}
                                                                 style={{
                                                                     position: 'absolute',
                                                                     top: 'var(--spacing-3)',
                                                                     right: 'var(--spacing-3)'
                                                                 }}
                                                                 title="削除"
                                                             >
                                                                 <Trash2 size={16} />
                                                             </button>
                                                            <div className={styles.examCardSchool} style={{ paddingRight: '28px' }}>{schedule.school_name}</div>
                                                            {schedule.department_name && (
                                                                <div className={styles.examCardDept}>{schedule.department_name}</div>
                                                            )}
                                                            <div className={styles.examCardRow}>
                                                                <span className={styles.examCardLabel}>出願期間</span>
                                                                <span className={styles.examCardValue}>{schedule.application_period || '-'}</span>
                                                            </div>
                                                            <div className={styles.examCardRow}>
                                                                <span className={styles.examCardLabel}>入試日</span>
                                                                <span className={styles.examCardValue}>{schedule.exam_date || '-'}</span>
                                                            </div>
                                                            <div className={styles.examCardRow}>
                                                                <span className={styles.examCardLabel}>合否発表日</span>
                                                                <span className={styles.examCardValue}>{schedule.results_date || '-'}</span>
                                                            </div>
                                                            <div className={styles.examCardRow}>
                                                                <span className={styles.examCardLabel}>合否</span>
                                                                <span className={`${styles.badge} ${
                                                                    schedule.status === '合格' ? styles.badgeSuccess :
                                                                    schedule.status === '不合格' ? styles.badgeDanger :
                                                                    schedule.status === '結果待ち' ? styles.badgeWarning :
                                                                    styles.badgeSecondary
                                                                }`}>
                                                                    {schedule.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* EDIT MODE */}
                            {examModalMode === 'edit' && (
                                <div className={styles.wizardContainer}>
                                    <p className={styles.wizardInstruction}>
                                        受験予定の学校について入力・修正してください。不要な行は削除してください。
                                    </p>

                                    <form onSubmit={handleSaveStudentExams} className={styles.wizardForm}>
                                        <div className={styles.examFormRows}>
                                            {examFormList.map((item, index) => (
                                                <div key={index} className={styles.examFormRowCard}>
                                                    <div className={styles.examFormRowHeader}>
                                                        <span>予定 #{index + 1}</span>
                                                        {examFormList.length > 1 && (
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeExamRow(index)}
                                                                className={styles.deleteRowBtn}
                                                            >
                                                                <Trash2 size={16} />
                                                                削除
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>受験予定校 <span style={{ color: 'red' }}>*</span></label>
                                                            <SchoolAutocomplete 
                                                                value={item.school_name}
                                                                onChange={(newVal) => handleExamFieldChange(index, 'school_name', newVal)}
                                                                placeholder="例: 神戸国際大学"
                                                                required
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コース <span style={{ color: 'red' }}>*</span></label>
                                                            <input 
                                                                type="text"
                                                                value={item.department_name}
                                                                onChange={(e) => handleExamFieldChange(index, 'department_name', e.target.value)}
                                                                placeholder="例: 経済学部 国際学科"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className={styles.formRow4Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>出願期間</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                                                                <input 
                                                                    type="date"
                                                                    value={item._app_period_start || ''}
                                                                    onChange={(e) => handleExamFieldChange(index, '_app_period_start', e.target.value)}
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <span>〜</span>
                                                                <input 
                                                                    type="date"
                                                                    value={item._app_period_end || ''}
                                                                    onChange={(e) => handleExamFieldChange(index, '_app_period_end', e.target.value)}
                                                                    style={{ flex: 1 }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>入試日</label>
                                                            <input 
                                                                type="date"
                                                                value={item.exam_date || ''}
                                                                onChange={(e) => handleExamFieldChange(index, 'exam_date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>合否発表日</label>
                                                            <input 
                                                                type="date"
                                                                value={item.results_date || ''}
                                                                onChange={(e) => handleExamFieldChange(index, 'results_date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>合否状況</label>
                                                            <select 
                                                                value={item.status}
                                                                onChange={(e) => handleExamFieldChange(index, 'status', e.target.value)}
                                                                className={styles.selectInput}
                                                            >
                                                                <option value="結果待ち">結果待ち</option>
                                                                <option value="合格">合格</option>
                                                                <option value="不合格">不合格</option>
                                                                <option value="辞退">辞退</option>
                                                                <option value="未受験">未受験</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={addExamRow}
                                            className={styles.addBtn}
                                            style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-2)' }}
                                        >
                                            <Plus size={16} />
                                            受験校を追加する
                                        </button>

                                        <div className={styles.formNavigation}>
                                            <button 
                                                type="button" 
                                                onClick={() => setExamModalMode('view')}
                                                className={styles.cancelBtn}
                                                disabled={savingExam}
                                            >
                                                キャンセル
                                            </button>
                                            <button 
                                                type="submit" 
                                                className={styles.submitBtn}
                                                disabled={savingExam}
                                            >
                                                <Save size={16} />
                                                {savingExam ? '保存中...' : '変更を保存する'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ====================================================
                入試アンケートタブ (回答一覧 ＆ 修正)
               ==================================================== */}
            {activeTab === 'survey' && (
                <div className={styles.tabContent}>
                    
                    {/* クラス非担当教員への案内 */}
                    {!isAdmin && !hasHomeroom && (
                        <div className={styles.infoBanner}>
                            <AlertCircle size={18} />
                            <span>担任クラスが登録されていないため、全クラスの学生を表示しています。</span>
                        </div>
                    )}

                    {/* コントロールエリア (クラス選択 & 検索) */}
                    <div className={styles.controls}>
                        <div className={styles.filterGroup}>
                            <label className={styles.controlLabel}>クラス:</label>
                            <select
                                value={selectedClass}
                                onChange={(e) => handleClassChange(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">すべてのクラス</option>
                                {availableClassesForSelect.map(c => (
                                    <option key={c.id} value={c.name}>
                                        {c.name} {c.homeroom_teacher_name ? `(${c.homeroom_teacher_name}先生)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.searchGroup}>
                            <div className={styles.searchWrapper}>
                                <Search size={16} className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="名前または学籍番号で検索..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setCareerPage(1)
                                        setExamPage(1)
                                        setSurveyPage(1)
                                    }}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 学生一覧テーブル */}
                    <div className={styles.tableCard}>
                        {loading ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinner}></div>
                                <p>データを読み込んでいます...</p>
                            </div>
                        ) : filteredSurveyStudents.length === 0 ? (
                            <div className={styles.emptyState}>
                                <FileText size={48} color="var(--text-tertiary)" />
                                <p>該当する学生が見つかりません。</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>クラス</th>
                                                <th>学籍番号</th>
                                                <th>氏名</th>
                                                <th>回答アンケート校一覧 (種別)</th>
                                                <th className={styles.textCenter}>回答数</th>
                                                <th className={styles.textCenter}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedSurveyStudents.map(student => {
                                                const list = student.exam_surveys || []
                                                const totalSurveys = list.length

                                                return (
                                                    <tr key={student.student_id_text}>
                                                        <td data-label="クラス">{student.class_name || '-'}</td>
                                                        <td data-label="学籍番号">{student.student_id_text}</td>
                                                        <td data-label="氏名" className={styles.fontWeightMedium}>{student.full_name}</td>
                                                        <td data-label="回答アンケート校一覧 (種別)">
                                                            <span className={styles.truncateText} style={{ maxWidth: '400px' }}>
                                                                {list.length > 0 ? (
                                                                    list.map((s, idx) => (
                                                                        `${s.school_name}${s.school_type ? ` (${s.school_type})` : ''}`
                                                                    )).join(', ')
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-tertiary)' }}>未回答</span>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td data-label="回答数" className={styles.textCenter}>{totalSurveys}</td>
                                                        <td data-label="操作" className={styles.textCenter}>
                                                            <button
                                                                onClick={() => openSurveyModal(student)}
                                                                className={styles.actionButton}
                                                            >
                                                                確認・修正
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {surveyTotalPages > 1 && (
                                    <div className={styles.paginationSection}>
                                        <div className={styles.paginationInfo}>
                                            全 {filteredSurveyStudents.length} 人中 {surveyStartIndex + 1}〜{Math.min(surveyStartIndex + ITEMS_PER_PAGE, filteredSurveyStudents.length)} 人を表示
                                        </div>
                                        <div className={styles.paginationControls}>
                                            <button 
                                                onClick={() => setSurveyPage(prev => Math.max(prev - 1, 1))}
                                                disabled={surveyPage === 1}
                                                className={styles.pageBtn}
                                            >
                                                前へ
                                            </button>
                                            <span className={styles.pageIndicator}>
                                                {surveyPage} / {surveyTotalPages}
                                            </span>
                                            <button 
                                                onClick={() => setSurveyPage(prev => Math.min(prev + 1, surveyTotalPages))}
                                                disabled={surveyPage === surveyTotalPages}
                                                className={styles.pageBtn}
                                            >
                                                次へ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ====================================================
                入試アンケート確認・修正用モーダル (教員用)
               ==================================================== */}
            {selectedStudentForSurvey && (
                <div className={styles.modalOverlay} onClick={() => surveyModalMode === 'list' && setSelectedStudentForSurvey(null)}>
                    <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* モーダルヘッダー */}
                        <div className={styles.modalHeader}>
                            <h2>
                                {surveyModalMode === 'list' && `入試アンケート回答一覧 (${selectedStudentForSurvey.full_name} さん)`}
                                {surveyModalMode === 'view' && `アンケート詳細の確認 (${selectedStudentForSurvey.full_name} さん)`}
                                {surveyModalMode === 'edit' && `アンケート回答の修正 (${selectedStudentForSurvey.full_name} さん - ステップ ${surveyStep} / 5)`}
                            </h2>
                            <button 
                                onClick={() => setSelectedStudentForSurvey(null)} 
                                className={styles.closeModalBtn}
                                disabled={savingSurvey}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* モーダルボディ */}
                        <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto', padding: 'var(--spacing-4)' }}>
                            {surveySuccessMsg && (
                                <div className={styles.successAlert} style={{ marginBottom: 'var(--spacing-4)' }}>
                                    <CheckCircle size={16} />
                                    <span>{surveySuccessMsg}</span>
                                </div>
                            )}

                            {surveyError && (
                                <div className={styles.errorAlert} style={{ marginBottom: 'var(--spacing-4)' }}>
                                    <AlertCircle size={16} />
                                    <span>{surveyError}</span>
                                </div>
                            )}

                            {/* モード1: アンケート一覧 (list) */}
                            {surveyModalMode === 'list' && (
                                <div>
                                    {selectedStudentForSurvey.exam_surveys?.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <AlertCircle size={36} color="var(--text-tertiary)" />
                                            <p>この学生はまだ入試アンケートに回答していません。</p>
                                        </div>
                                    ) : (
                                        <div className={styles.tableWrapper}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>受験校 (種別)</th>
                                                        <th>学部・学科・コース</th>
                                                        <th>試験の種類</th>
                                                        <th>試験日</th>
                                                        <th className={styles.textCenter}>操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedStudentForSurvey.exam_surveys.map((survey) => (
                                                        <tr key={survey.id}>
                                                            <td className={styles.fontWeightMedium}>
                                                                <div>{survey.school_name}</div>
                                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                    {survey.school_type}
                                                                </div>
                                                            </td>
                                                            <td>{survey.department_name || '-'}</td>
                                                            <td>{survey.exam_type || '-'}</td>
                                                            <td>{survey.exam_date || '-'}</td>
                                                            <td className={styles.textCenter}>
                                                                <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'center' }}>
                                                                    <button
                                                                        onClick={() => startViewingStudentSurvey(survey)}
                                                                        className={styles.actionButton}
                                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                                    >
                                                                        詳細
                                                                    </button>
                                                                    <button
                                                                        onClick={() => startEditingStudentSurvey(survey)}
                                                                        className={styles.editButton}
                                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', marginTop: 0 }}
                                                                    >
                                                                        修正
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteStudentSurvey(survey.id, survey.school_name)}
                                                                        className={styles.deleteRowBtn}
                                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                                        disabled={savingSurvey}
                                                                    >
                                                                        <Trash2 size={12} />
                                                                        削除
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* モード2: 詳細表示 (view) */}
                            {surveyModalMode === 'view' && (
                                <div className={styles.detailContainer}>
                                    <div className={styles.detailGrid}>
                                        <div className={styles.detailCard}>
                                            <h3>基本情報</h3>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>受験した学校の種別:</span><span className={styles.detailValue}>{surveyForm.school_type}</span></div>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>受験した学校の名前:</span><span className={styles.detailValue}>{surveyForm.school_name}</span></div>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>試験を受けた日:</span><span className={styles.detailValue}>{surveyForm.exam_date || '-'}</span></div>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>学部、学科、コース:</span><span className={styles.detailValue}>{surveyForm.department_name || '-'}</span></div>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>試験の種類:</span><span className={styles.detailValue}>{surveyForm.exam_type || '-'}</span></div>
                                        </div>

                                        <div className={styles.detailCard}>
                                            <h3>作文・小論文</h3>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>試験の有無:</span><span className={styles.detailValue}>{surveyForm.essay_exists}</span></div>
                                            {surveyForm.essay_exists === 'あり' && (
                                                <>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>試験時間:</span><span className={styles.detailValue}>{surveyForm.essay_time ? `${surveyForm.essay_time}分` : '-'}</span></div>
                                                    <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                        <span className={styles.detailLabel}>テーマ:</span>
                                                        <span className={styles.detailValueBlock}>{surveyForm.essay_theme || '-'}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className={styles.detailCard}>
                                            <h3>日本語の試験</h3>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>試験の有無:</span><span className={styles.detailValue}>{surveyForm.japanese_exists}</span></div>
                                            {surveyForm.japanese_exists === 'あり' && (
                                                <>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>試験時間:</span><span className={styles.detailValue}>{surveyForm.japanese_time ? `${surveyForm.japanese_time}分` : '-'}</span></div>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>試験レベル:</span><span className={styles.detailValue}>{surveyForm.japanese_level || '-'}</span></div>
                                                    <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                        <span className={styles.detailLabel}>試験内容:</span>
                                                        <span className={styles.detailValueBlock}>{(surveyForm.japanese_content || []).join(', ') || '-'}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className={styles.detailCard}>
                                            <h3>面接試験</h3>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>面接の有無:</span><span className={styles.detailValue}>{surveyForm.interview_exists}</span></div>
                                            {surveyForm.interview_exists === 'あり' && (
                                                <>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>面接時間:</span><span className={styles.detailValue}>{surveyForm.interview_time ? `${surveyForm.interview_time}分` : '-'}</span></div>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>面接官の人数:</span><span className={styles.detailValue}>{surveyForm.interview_teachers ? `${surveyForm.interview_teachers}人` : '-'}</span></div>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>同室の学生数:</span><span className={styles.detailValue}>{surveyForm.interview_students ? `${surveyForm.interview_students}人` : '-'}</span></div>
                                                    <div className={styles.choiceGroup}>
                                                        <div className={styles.choiceHeader}>質問された内容</div>
                                                        {surveyForm.interview_question_1 && (
                                                            <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                                <span className={styles.detailLabel}>質問①:</span>
                                                                <span className={styles.detailValueBlock}>{surveyForm.interview_question_1}</span>
                                                            </div>
                                                        )}
                                                        {surveyForm.interview_question_2 && (
                                                            <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                                <span className={styles.detailLabel}>質問②:</span>
                                                                <span className={styles.detailValueBlock}>{surveyForm.interview_question_2}</span>
                                                            </div>
                                                        )}
                                                        {surveyForm.interview_question_3 && (
                                                            <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                                <span className={styles.detailLabel}>質問③:</span>
                                                                <span className={styles.detailValueBlock}>{surveyForm.interview_question_3}</span>
                                                            </div>
                                                        )}
                                                        {surveyForm.interview_question_4 && (
                                                            <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                                <span className={styles.detailLabel}>質問④:</span>
                                                                <span className={styles.detailValueBlock}>{surveyForm.interview_question_4}</span>
                                                            </div>
                                                        )}
                                                        {surveyForm.interview_question_5 && (
                                                            <div className={styles.detailRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                                <span className={styles.detailLabel}>質問⑤:</span>
                                                                <span className={styles.detailValueBlock}>{surveyForm.interview_question_5}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className={styles.detailCard}>
                                            <h3>その他・アドバイス</h3>
                                            <div className={styles.detailRow}><span className={styles.detailLabel}>その他の試験:</span><span className={styles.detailValue}>{surveyForm.other_exam_exists}</span></div>
                                            {surveyForm.other_exam_exists === 'あり' && (
                                                <>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>試験内容:</span><span className={styles.detailValue}>{surveyForm.other_exam_content || '-'}</span></div>
                                                    <div className={styles.detailRow}><span className={styles.detailLabel}>試験時間:</span><span className={styles.detailValue}>{surveyForm.other_exam_time ? `${surveyForm.other_exam_time}分` : '-'}</span></div>
                                                </>
                                            )}
                                            <div className={styles.detailRow} style={{ marginTop: 'var(--spacing-3)', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                <span className={styles.detailLabel}>後輩へのアドバイス:</span>
                                                <span className={styles.detailValueBlock}>{surveyForm.advice || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.formNavigation} style={{ marginTop: 'var(--spacing-4)' }}>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setSurveyModalMode('list')
                                                setSurveyError(null)
                                                setSurveySuccessMsg(null)
                                            }}
                                            className={styles.cancelBtn}
                                        >
                                            一覧へ戻る
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* モード3: 編集画面 (edit) */}
                            {surveyModalMode === 'edit' && (
                                <form onSubmit={handleSaveStudentSurvey} className={styles.wizardForm}>
                                    
                                    {/* ステップ1: 基本情報 */}
                                    {surveyStep === 1 && (
                                        <div className={styles.formStep}>
                                            <h3>1. 受験校の基本情報</h3>
                                            
                                            <div className={styles.inputGroup}>
                                                <label>受験した学校の種別</label>
                                                <select
                                                    value={surveyForm.school_type}
                                                    onChange={(e) => handleSurveyFieldChange('school_type', e.target.value)}
                                                    className={styles.selectInput}
                                                >
                                                    <option value="大学">大学</option>
                                                    <option value="大学院">大学院</option>
                                                    <option value="短期大学">短期大学</option>
                                                    <option value="専門学校">専門学校</option>
                                                    <option value="その他">その他</option>
                                                </select>
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label>受験した学校の名前 <span style={{ color: 'red' }}>*</span></label>
                                                <SchoolAutocomplete 
                                                    value={surveyForm.school_name}
                                                    onChange={(val) => handleSurveyFieldChange('school_name', val)}
                                                    placeholder="学校名を入力してください"
                                                    required
                                                />
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label>学部、学科、コース</label>
                                                <input 
                                                    type="text" 
                                                    value={surveyForm.department_name}
                                                    onChange={(e) => handleSurveyFieldChange('department_name', e.target.value)}
                                                    placeholder="例: 国際ビジネス学科"
                                                />
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label>試験を受けた日</label>
                                                <input 
                                                    type="date" 
                                                    value={surveyForm.exam_date}
                                                    onChange={(e) => handleSurveyFieldChange('exam_date', e.target.value)}
                                                />
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label>試験の種類</label>
                                                <select
                                                    value={surveyForm.exam_type}
                                                    onChange={(e) => handleSurveyFieldChange('exam_type', e.target.value)}
                                                    className={styles.selectInput}
                                                >
                                                    <option value="指定校推薦入試">指定校推薦入試</option>
                                                    <option value="公募推薦入試">公募推薦入試</option>
                                                    <option value="一般入試">一般入試</option>
                                                    <option value="AO入試">AO入試</option>
                                                    <option value="外国人留学生特別入試">外国人留学生特別入試</option>
                                                    <option value="その他">その他</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* ステップ2: 作文・小論文 */}
                                    {surveyStep === 2 && (
                                        <div className={styles.formStep}>
                                            <h3>2. 作文・小論文試験</h3>
                                            
                                            <div className={styles.radioGroup}>
                                                <label>作文・小論文がありましたか</label>
                                                <div className={styles.radioOptions}>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.essay_exists === 'あり' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('essay_exists', 'あり')}
                                                    >あり</button>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.essay_exists === 'なし' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('essay_exists', 'なし')}
                                                    >なし</button>
                                                </div>
                                            </div>

                                            {surveyForm.essay_exists === 'あり' && (
                                                <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                                    <div className={styles.inputGroup}>
                                                        <label>試験時間 (分)</label>
                                                        <input 
                                                            type="number" 
                                                            value={surveyForm.essay_time}
                                                            onChange={(e) => handleSurveyFieldChange('essay_time', e.target.value)}
                                                            placeholder="例: 60"
                                                            style={{ width: '150px' }}
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>出題された作文・小論文のテーマを記入してください。</label>
                                                        <textarea 
                                                            value={surveyForm.essay_theme}
                                                            onChange={(e) => handleSurveyFieldChange('essay_theme', e.target.value)}
                                                            placeholder="出題された作文のテーマやキーワードを記入してください。"
                                                            rows={4}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ステップ3: 日本語の試験 */}
                                    {surveyStep === 3 && (
                                        <div className={styles.formStep}>
                                            <h3>3. 日本語の筆記試験</h3>
                                            
                                            <div className={styles.radioGroup}>
                                                <label>日本語の筆記試験がありましたか</label>
                                                <div className={styles.radioOptions}>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.japanese_exists === 'あり' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('japanese_exists', 'あり')}
                                                    >あり</button>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.japanese_exists === 'なし' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('japanese_exists', 'なし')}
                                                    >なし</button>
                                                </div>
                                            </div>

                                            {surveyForm.japanese_exists === 'あり' && (
                                                <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                                    <div className={styles.inputGroup}>
                                                        <label>試験時間 (分)</label>
                                                        <input 
                                                            type="number" 
                                                            value={surveyForm.japanese_time}
                                                            onChange={(e) => handleSurveyFieldChange('japanese_time', e.target.value)}
                                                            placeholder="例: 45"
                                                            style={{ width: '150px' }}
                                                        />
                                                    </div>
                                                    
                                                    <div className={styles.inputGroup}>
                                                        <label>日本語の試験のレベル</label>
                                                        <select
                                                            value={surveyForm.japanese_level}
                                                            onChange={(e) => handleSurveyFieldChange('japanese_level', e.target.value)}
                                                            className={styles.selectInput}
                                                            style={{ width: '200px' }}
                                                        >
                                                            <option value="N1">N1程度</option>
                                                            <option value="N2">N2程度</option>
                                                            <option value="N3">N3程度</option>
                                                            <option value="N4">N4程度</option>
                                                            <option value="N5">N5程度</option>
                                                            <option value="その他">その他</option>
                                                        </select>
                                                    </div>

                                                    <div className={styles.inputGroup}>
                                                        <label>日本語 of 試験の内容 (該当するものをすべて選択)</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-2)' }}>
                                                            {['漢字', '語彙', '文法', '読解', '聴解', '記述', 'その他'].map(item => {
                                                                const isChecked = (surveyForm.japanese_content || []).includes(item)
                                                                return (
                                                                    <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', cursor: 'pointer' }}>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={isChecked}
                                                                            onChange={(e) => handleSurveyCheckboxChange(item, e.target.checked)}
                                                                        />
                                                                        <span>{item}</span>
                                                                    </label>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ステップ4: 面接 */}
                                    {surveyStep === 4 && (
                                        <div className={styles.formStep}>
                                            <h3>4. 面接試験</h3>
                                            
                                            <div className={styles.radioGroup}>
                                                <label>面接がありましたか</label>
                                                <div className={styles.radioOptions}>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.interview_exists === 'あり' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('interview_exists', 'あり')}
                                                    >あり</button>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.interview_exists === 'なし' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('interview_exists', 'なし')}
                                                    >なし</button>
                                                </div>
                                            </div>

                                            {surveyForm.interview_exists === 'あり' && (
                                                <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                                    <div className={styles.formRow3Col} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-3)' }}>
                                                        <div className={styles.inputGroup}>
                                                            <label>面接時間 (分)</label>
                                                            <input 
                                                                type="number" 
                                                                value={surveyForm.interview_time}
                                                                onChange={(e) => handleSurveyFieldChange('interview_time', e.target.value)}
                                                                placeholder="例: 15"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>面接官の先生の人数</label>
                                                            <input 
                                                                type="number" 
                                                                value={surveyForm.interview_teachers}
                                                                onChange={(e) => handleSurveyFieldChange('interview_teachers', e.target.value)}
                                                                placeholder="例: 2"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>同室の学生人数 (自身含む)</label>
                                                            <input 
                                                                type="number" 
                                                                value={surveyForm.interview_students}
                                                                onChange={(e) => handleSurveyFieldChange('interview_students', e.target.value)}
                                                                placeholder="例: 1"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                                        <label style={{ fontWeight: '600' }}>どんな質問をされましたか？</label>
                                                        <div className={styles.inputGroup}>
                                                            <label style={{ fontSize: 'var(--font-size-xs)' }}>質問①</label>
                                                            <input 
                                                                type="text" 
                                                                value={surveyForm.interview_question_1}
                                                                onChange={(e) => handleSurveyFieldChange('interview_question_1', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label style={{ fontSize: 'var(--font-size-xs)' }}>質問②</label>
                                                            <input 
                                                                type="text" 
                                                                value={surveyForm.interview_question_2}
                                                                onChange={(e) => handleSurveyFieldChange('interview_question_2', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label style={{ fontSize: 'var(--font-size-xs)' }}>質問③</label>
                                                            <input 
                                                                type="text" 
                                                                value={surveyForm.interview_question_3}
                                                                onChange={(e) => handleSurveyFieldChange('interview_question_3', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label style={{ fontSize: 'var(--font-size-xs)' }}>質問④</label>
                                                            <input 
                                                                type="text" 
                                                                value={surveyForm.interview_question_4}
                                                                onChange={(e) => handleSurveyFieldChange('interview_question_4', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label style={{ fontSize: 'var(--font-size-xs)' }}>質問⑤</label>
                                                            <input 
                                                                type="text" 
                                                                value={surveyForm.interview_question_5}
                                                                onChange={(e) => handleSurveyFieldChange('interview_question_5', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ステップ5: その他・アドバイス */}
                                    {surveyStep === 5 && (
                                        <div className={styles.formStep}>
                                            <h3>5. その他・後輩へのアドバイス</h3>
                                            
                                            <div className={styles.radioGroup}>
                                                <label>作文・小論文・日本語・面接以外の試験がありましたか</label>
                                                <div className={styles.radioOptions}>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.other_exam_exists === 'あり' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('other_exam_exists', 'あり')}
                                                    >あり</button>
                                                    <button 
                                                        type="button" 
                                                        className={`${styles.radioBtn} ${surveyForm.other_exam_exists === 'なし' ? styles.radioBtnActive : ''}`}
                                                        onClick={() => handleSurveyFieldChange('other_exam_exists', 'なし')}
                                                    >なし</button>
                                                </div>
                                            </div>

                                            {surveyForm.other_exam_exists === 'あり' && (
                                                <div style={{ marginTop: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                                    <div className={styles.inputGroup}>
                                                        <label>どんな試験でしたか (英語、数学、実技など)</label>
                                                        <input 
                                                            type="text" 
                                                            value={surveyForm.other_exam_content}
                                                            onChange={(e) => handleSurveyFieldChange('other_exam_content', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>試験時間 (分)</label>
                                                        <input 
                                                            type="number" 
                                                            value={surveyForm.other_exam_time}
                                                            onChange={(e) => handleSurveyFieldChange('other_exam_time', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            <div className={styles.inputGroup} style={{ marginTop: 'var(--spacing-4)' }}>
                                                <label>次に受験する学生に、アドバイスや準備したほうがいいことを書いてください</label>
                                                <textarea 
                                                    value={surveyForm.advice}
                                                    onChange={(e) => handleSurveyFieldChange('advice', e.target.value)}
                                                    rows={5}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ナビゲーションボタン */}
                                    <div className={styles.formNavigation} style={{ marginTop: 'var(--spacing-4)' }}>
                                        {surveyStep > 1 && (
                                            <button 
                                                key="survey-prev-btn"
                                                type="button" 
                                                onClick={() => setSurveyStep(prev => prev - 1)}
                                                className={styles.prevBtn}
                                                disabled={savingSurvey}
                                            >
                                                前へ
                                            </button>
                                        )}
                                        
                                        <button 
                                            key="survey-cancel-btn"
                                            type="button" 
                                            onClick={() => {
                                                setSurveyModalMode('list')
                                                setSurveyError(null)
                                                setSurveySuccessMsg(null)
                                            }}
                                            className={styles.cancelBtn}
                                            disabled={savingSurvey}
                                            style={{ marginRight: 'auto' }}
                                        >
                                            キャンセル
                                        </button>

                                         {surveyStep < 5 ? (
                                             <button 
                                                 key="survey-next-btn"
                                                 type="button" 
                                                 onClick={() => setSurveyStep(prev => prev + 1)}
                                                 className={styles.nextBtn}
                                                 disabled={savingSurvey}
                                             >
                                                 次へ
                                             </button>
                                         ) : (
                                             <button 
                                                 key="survey-submit-btn"
                                                 type="submit"
                                                 className={styles.submitBtn}
                                                 disabled={savingSurvey}
                                             >
                                                 <Save size={16} />
                                                 {savingSurvey ? '保存中...' : '変更を保存する'}
                                             </button>
                                         )}
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
