'use client'

import { useState, useMemo, useEffect } from 'react'
import { getStudentsCareerList, getStudentsExamSchedulesList, getStudentsExamSurveysList, saveStudentCareerInfoByAdmin, saveStudentExamSchedules, saveStudentExamSurvey, deleteStudentExamSurvey } from '@/app/actions/career'
import { 
    getTeacherTemplates, 
    saveTeacherTemplates, 
    getTeacherSlots, 
    generateSlots, 
    updateSlot, 
    deleteSlot,
    createSlot,
    getTeacherBookingsFiltered,
    getTeacherTemplateNames,
    getTeacherPendingSlots,
    approveSlot,
    rejectSlot,
    getStudentCompletedInterviews
} from '@/app/actions/interview'
import { 
    BookOpen, Clipboard, Calendar, HelpCircle, ChevronRight, ChevronLeft, 
    Save, Edit3, Lock, X, Search, FileText, CheckCircle, AlertCircle, Trash2, Plus
} from 'lucide-react'
import styles from './page.module.css'
import SchoolAutocomplete from '@/components/SchoolAutocomplete'
import { parseStudentId } from '@/lib/utils/studentId'

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
    const [activeTab, setActiveTab] = useState('interview') // 初期表示は「面談」タブ
    const [selectedClass, setSelectedClass] = useState(initialClass)
    const [students, setStudents] = useState(initialStudents)
    const [downloading, setDownloading] = useState(false)
    const [careerPage, setCareerPage] = useState(1)
    const [examPage, setExamPage] = useState(1)
    const [surveyPage, setSurveyPage] = useState(1)
    const ITEMS_PER_PAGE = 50
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // 面談（Interview）関連の状態
    const [interviewTemplates, setInterviewTemplates] = useState([
        { day_of_week: 1, start_time: '09:00', end_time: '18:00', enabled: true },
        { day_of_week: 2, start_time: '09:00', end_time: '18:00', enabled: true },
        { day_of_week: 3, start_time: '09:00', end_time: '18:00', enabled: true },
        { day_of_week: 4, start_time: '09:00', end_time: '18:00', enabled: true },
        { day_of_week: 5, start_time: '09:00', end_time: '18:00', enabled: true }
    ])
    const [interviewSlots, setInterviewSlots] = useState([])
    const [interviewSelectedDate, setInterviewSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [interviewGenRange, setInterviewGenRange] = useState({
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    const [editingInterviewSlot, setEditingInterviewSlot] = useState(null)
    const [interviewEditForm, setInterviewEditForm] = useState({
        start_time: '',
        end_time: '',
        status: '',
        notes: '',
        student_id_text: ''
    })
    const [interviewActiveSubTab, setInterviewActiveSubTab] = useState('schedule') // 'schedule' | 'template' | 'generate' | 'history'
    const [interviewLoading, setInterviewLoading] = useState(false)
    const [interviewSaving, setInterviewSaving] = useState(false)
    const [interviewGenerating, setInterviewGenerating] = useState(false)
    const [interviewSuccessMsg, setInterviewSuccessMsg] = useState(null)
    const [interviewError, setInterviewError] = useState(null)
    const [weeklyBookings, setWeeklyBookings] = useState([])
    const [interviewPeriodFilter, setInterviewPeriodFilter] = useState('weekly') // 'today' | 'weekly' | 'all'
    const [availableTemplates, setAvailableTemplates] = useState(['デフォルト'])
    const [selectedTemplateName, setSelectedTemplateName] = useState('デフォルト')
    const [newTemplateNameInput, setNewTemplateNameInput] = useState('')
    const [myClassStudents, setMyClassStudents] = useState([])
    const [historySelectedStudentId, setHistorySelectedStudentId] = useState('')
    const [studentHistoryInterviews, setStudentHistoryInterviews] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historySearchTerm, setHistorySearchTerm] = useState('')
    
    // クラス担任が複数の場合にクラスごとに学生をグループ化
    const groupedMyClassStudents = useMemo(() => {
        const groups = {}
        myClassStudents.forEach(st => {
            const className = st.class_name || 'クラス指定なし'
            if (!groups[className]) {
                groups[className] = []
            }
            groups[className].push(st)
        })
        return groups
    }, [myClassStudents])
    
    // 新規面談スロット手動作成用の状態
    const [isCreatingInterviewSlot, setIsCreatingInterviewSlot] = useState(false)
    const [interviewCreateForm, setInterviewCreateForm] = useState({
        start_time: '10:00',
        end_time: '10:15',
        status: 'available',
        notes: '',
        student_id_text: ''
    })

    // 面談スロットで選択された複数学生のIDを保持する状態
    const [selectedStudentIds, setSelectedStudentIds] = useState([])
    // 承認待ち（pending）のスロット一覧
    const [pendingSlots, setPendingSlots] = useState([])
    const [teacherFutureAvailableSlots, setTeacherFutureAvailableSlots] = useState([])
    const [teacherScheduleLoading, setTeacherScheduleLoading] = useState(false)

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
    const [surveyViewMode, setSurveyViewMode] = useState('student') // 'student' or 'school'
    const [surveySchoolPage, setSurveySchoolPage] = useState(1)
    const [selectedSchoolForSurveyDetails, setSelectedSchoolForSurveyDetails] = useState(null)

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

    // Excelダウンロードハンドラー
    const handleDownloadExcel = async () => {
        if (!selectedClass || selectedClass === 'all') return
        setDownloading(true)
        try {
            const res = await fetch(`/api/career/download-survey?class=${encodeURIComponent(selectedClass)}`)
            if (!res.ok) {
                const errText = await res.text()
                alert(`ダウンロードに失敗しました: ${errText || res.statusText}`)
                return
            }
            
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `全学生進路希望調査票2025_${selectedClass}.xlsx`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Download error:', err)
            alert('ダウンロード中にエラーが発生しました。')
        } finally {
            setDownloading(false)
        }
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

    // 学校別表示用のグループ化データ
    const schoolsGroupedSurveys = useMemo(() => {
        const grouped = {}
        
        studentsExamSurveys.forEach(student => {
            // クラスフィルターの適用
            if (selectedClass && selectedClass !== 'all' && student.class_name !== selectedClass) {
                return
            }

            (student.exam_surveys || []).forEach(survey => {
                const schoolName = survey.school_name || '未指定の学校'
                const schoolType = survey.school_type || ''
                
                // 検索ワード (searchTerm) によるフィルタリング
                const term = searchTerm.toLowerCase().trim()
                if (term) {
                    const isMatch = 
                        schoolName.toLowerCase().includes(term) ||
                        student.full_name?.toLowerCase().includes(term) ||
                        student.student_id_text?.toLowerCase().includes(term) ||
                        survey.department_name?.toLowerCase().includes(term)
                    if (!isMatch) return
                }

                if (!grouped[schoolName]) {
                    grouped[schoolName] = {
                        school_name: schoolName,
                        school_type: schoolType,
                        surveys: []
                    }
                }
                grouped[schoolName].surveys.push({
                    ...survey,
                    student_name: student.full_name,
                    class_name: student.class_name,
                    student_id_text: student.student_id_text
                })
            })
        })

        return Object.values(grouped).sort((a, b) => a.school_name.localeCompare(b.school_name, 'ja'))
    }, [studentsExamSurveys, selectedClass, searchTerm])

    // 学校別表示のページネーション
    const surveySchoolStartIndex = (surveySchoolPage - 1) * ITEMS_PER_PAGE
    const paginatedSchoolSurveys = schoolsGroupedSurveys.slice(surveySchoolStartIndex, surveySchoolStartIndex + ITEMS_PER_PAGE)
    const surveySchoolTotalPages = Math.ceil(schoolsGroupedSurveys.length / ITEMS_PER_PAGE)

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

        // JSバリデーションチェック
        const errors = []
        if (!surveyForm.school_type) errors.push('学校の種類')
        if (!surveyForm.school_name || !surveyForm.school_name.trim()) errors.push('学校名')
        if (!surveyForm.department_name || !surveyForm.department_name.trim()) errors.push('学部、学科、コース')
        if (!surveyForm.exam_type || !surveyForm.exam_type.trim()) errors.push('試験の種類')

        if (surveyForm.essay_exists === 'あり') {
            if (!surveyForm.essay_time) errors.push('作文・小論文の試験時間')
            if (!surveyForm.essay_theme || !surveyForm.essay_theme.trim()) errors.push('作文・小論文のテーマ')
        }

        if (surveyForm.japanese_exists === 'あり') {
            if (!surveyForm.japanese_time) errors.push('日本語の試験時間')
            if (!surveyForm.japanese_level) errors.push('日本語の試験のレベル')
            if (!surveyForm.japanese_content || surveyForm.japanese_content.length === 0) {
                errors.push('日本語の試験内容')
            }
        }

        if (surveyForm.interview_exists === 'あり') {
            if (!surveyForm.interview_time) errors.push('面接時間')
            if (!surveyForm.interview_teachers) errors.push('面接官の先生の人数')
            if (!surveyForm.interview_students) errors.push('同室の学生人数')
            if (!surveyForm.interview_question_1 || !surveyForm.interview_question_1.trim()) errors.push('面接の質問①')
        }

        if (errors.length > 0) {
            setSurveyError(`未回答の項目があります：${errors.join('、')} を入力・選択してください。`)
            
            // 最初のエラー項目に基づいて適切なステップに戻る
            const firstError = errors[0]
            if (['学校の種類', '学校名', '学部、学科、コース', '試験の種類'].includes(firstError)) {
                setSurveyStep(1)
            } else if (['作文・小論文の試験時間', '作文・小論文のテーマ'].includes(firstError)) {
                setSurveyStep(2)
            } else if (['日本語の試験時間', '日本語の試験のレベル', '日本語の試験内容'].includes(firstError)) {
                setSurveyStep(3)
            } else if (['面接時間', '面接官の先生の人数', '同室の学生人数', '面接の質問①'].includes(firstError)) {
                setSurveyStep(4)
            }
            
            setSavingSurvey(false)
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

    // 面談履歴用：担任している2年生のクラスの学生一覧（ソート・検索用）
    const filteredHistoryStudents = useMemo(() => {
        return myClassStudents.filter(student => {
            const matchesSearch = (student.full_name || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                                  (student.student_id_text || '').toLowerCase().includes(historySearchTerm.toLowerCase());
            return matchesSearch;
        }).sort((a, b) => {
            const classComp = (a.class_name || '').localeCompare(b.class_name || '');
            if (classComp !== 0) return classComp;
            return (a.full_name || '').localeCompare(b.full_name || '');
        });
    }, [myClassStudents, historySearchTerm])

    // 日付フォーマット
    const formatDate = (isoString) => {
        if (!isoString) return '-'
        const date = new Date(isoString)
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    // ----------------------------------------------------
    // 面談（INTERVIEW）ロジック
    // ----------------------------------------------------
    const loadTemplateNamesList = async () => {
        const res = await getTeacherTemplateNames()
        if (res.success) {
            setAvailableTemplates(res.templateNames)
        }
    }

    const loadTeacherFutureAvailableSlots = async () => {
        setTeacherScheduleLoading(true)
        try {
            const todayStr = new Date().toISOString().split('T')[0]
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 30)
            const futureDateStr = futureDate.toISOString().split('T')[0]

            const res = await getTeacherSlots(todayStr, futureDateStr)
            if (res.success) {
                const available = (res.slots || []).filter(s => s.status === 'available')
                setTeacherFutureAvailableSlots(available)
            }
        } catch (err) {
            console.error('Error loading teacher future available slots:', err)
        } finally {
            setTeacherScheduleLoading(false)
        }
    }

    const loadInterviewTemplates = async (templateName = selectedTemplateName, skipLoading = false) => {
        if (!skipLoading) setInterviewLoading(true)
        const res = await getTeacherTemplates(templateName)
        if (!skipLoading) setInterviewLoading(false)
        
        const defaultTemplates = [1, 2, 3, 4, 5].map(day => ({
            day_of_week: day,
            start_time: '09:00',
            end_time: '18:00',
            enabled: false
        }))

        if (res.success && res.templates.length > 0) {
            const formatted = [1, 2, 3, 4, 5].map(day => {
                const found = res.templates.find(t => t.day_of_week === day)
                return {
                    day_of_week: day,
                    start_time: found ? found.start_time.substring(0, 5) : '09:00',
                    end_time: found ? found.end_time.substring(0, 5) : '18:00',
                    enabled: !!found
                }
            })
            setInterviewTemplates(formatted)
        } else {
            setInterviewTemplates(defaultTemplates)
        }
    }

    const handleSaveInterviewTemplates = async () => {
        setInterviewSaving(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)
        const activeTemplates = interviewTemplates
            .filter(t => t.enabled)
            .map(t => ({
                day_of_week: t.day_of_week,
                start_time: `${t.start_time}:00`,
                end_time: `${t.end_time}:00`
            }))

        const res = await saveTeacherTemplates(activeTemplates, selectedTemplateName)
        setInterviewSaving(false)
        if (res.success) {
            setInterviewSuccessMsg(`テンプレート設定「${selectedTemplateName}」を保存しました。`)
            loadTemplateNamesList()
        } else {
            setInterviewError(`保存に失敗しました: ${res.error}`)
        }
    }

    const loadInterviewSlots = async (skipLoading = false) => {
        if (!skipLoading) setInterviewLoading(true)
        const startObj = new Date(interviewSelectedDate)
        startObj.setDate(startObj.getDate() - 3)
        const endObj = new Date(interviewSelectedDate)
        endObj.setDate(endObj.getDate() + 3)

        const [slotsRes, pendingRes] = await Promise.all([
            getTeacherSlots(
                startObj.toISOString().split('T')[0],
                endObj.toISOString().split('T')[0]
            ),
            getTeacherPendingSlots()
        ])

        if (!skipLoading) setInterviewLoading(false)
        if (slotsRes.success) {
            setInterviewSlots(slotsRes.slots)
        } else {
            setInterviewError(`予約枠の取得に失敗しました: ${slotsRes.error}`)
        }

        if (pendingRes.success) {
            setPendingSlots(pendingRes.slots)
        }
    }

    const handleGenerateInterviewSlots = async () => {
        setInterviewGenerating(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)
        const res = await generateSlots(interviewGenRange.start, interviewGenRange.end, selectedTemplateName)
        setInterviewGenerating(false)
        if (res.success) {
            setInterviewSuccessMsg(`面談予約可能枠を自動生成しました！ (ベーステンプレート: ${selectedTemplateName}, 生成数: ${res.count})`)
            loadInterviewSlots()
            loadTeacherFutureAvailableSlots()
        } else {
            setInterviewError(`生成に失敗しました: ${res.error}`)
        }
    }

    const handleOpenEditInterview = (slot) => {
        setEditingInterviewSlot(slot)
        setInterviewEditForm({
            start_time: slot.start_time.substring(0, 5),
            end_time: slot.end_time.substring(0, 5),
            status: slot.status,
            notes: slot.notes || '',
            discussion_content: slot.discussion_content || '',
            instructions: slot.instructions || '',
            student_id_text: slot.student_id_text || ''
        })
        const ids = slot.slot_students ? slot.slot_students.map(ss => ss.student_id_text).filter(Boolean) : []
        setSelectedStudentIds(ids)
    }

    const handleSaveEditInterview = async () => {
        if (!editingInterviewSlot) return
        setInterviewLoading(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)

        const finalStatus = interviewEditForm.status === 'completed'
            ? 'completed'
            : (selectedStudentIds.length > 0 ? 'booked' : (interviewEditForm.status === 'booked' ? 'available' : interviewEditForm.status))

        const res = await updateSlot(editingInterviewSlot.id, {
            start_time: `${interviewEditForm.start_time}:00`,
            end_time: `${interviewEditForm.end_time}:00`,
            status: finalStatus,
            notes: interviewEditForm.notes,
            discussion_content: interviewEditForm.discussion_content,
            instructions: interviewEditForm.instructions,
            student_id_texts: selectedStudentIds
        })
        setInterviewLoading(false)
        if (res.success) {
            setInterviewSuccessMsg('予約枠を更新しました。')
            setEditingInterviewSlot(null)
            loadInterviewSlots()
            loadFilteredBookings(interviewPeriodFilter)
            loadTeacherFutureAvailableSlots()
        } else {
            setInterviewError(`更新に失敗しました: ${res.error}`)
        }
    }

    const handleCreateInterviewSlot = async () => {
        setInterviewSaving(true)
        setInterviewError(null)

        const finalStatus = selectedStudentIds.length > 0 ? 'booked' : interviewCreateForm.status

        const res = await createSlot({
            slot_date: interviewSelectedDate,
            start_time: `${interviewCreateForm.start_time}:00`,
            end_time: `${interviewCreateForm.end_time}:00`,
            status: finalStatus,
            notes: interviewCreateForm.notes,
            student_id_texts: selectedStudentIds
        })

        setInterviewSaving(false)
        if (res.success) {
            setIsCreatingInterviewSlot(false)
            loadInterviewSlots()
            loadTeacherFutureAvailableSlots()
        } else {
            setInterviewError(`作成に失敗しました: ${res.error}`)
        }
    }

    const loadFilteredBookings = (filterType) => {
        getTeacherBookingsFiltered(filterType).then(res => {
            if (res.success) setWeeklyBookings(res.slots)
        })
    }

    const handleDeleteInterviewSlot = async (slotId) => {
        if (!confirm('この予約枠を完全に削除してよろしいですか？')) return
        setInterviewLoading(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)
        const res = await deleteSlot(slotId)
        setInterviewLoading(false)
        if (res.success) {
            setInterviewSuccessMsg('予約枠を削除しました。')
            loadInterviewSlots()
            loadFilteredBookings(interviewPeriodFilter)
            loadTeacherFutureAvailableSlots()
        } else {
            setInterviewError(`削除に失敗しました: ${res.error}`)
        }
    }

    const handleApproveInterview = async (slotId) => {
        setInterviewLoading(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)
        const res = await approveSlot(slotId)
        setInterviewLoading(false)
        if (res.success) {
            setInterviewSuccessMsg('予約申請を承認しました。')
            loadInterviewSlots()
            loadFilteredBookings(interviewPeriodFilter)
            loadTeacherFutureAvailableSlots()
        } else {
            setInterviewError(`承認に失敗しました: ${res.error}`)
        }
    }

    const handleRejectInterview = async (slotId) => {
        if (!confirm('この予約申請を却下し、空き枠に戻してよろしいですか？')) return
        setInterviewLoading(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)
        const res = await rejectSlot(slotId)
        setInterviewLoading(false)
        if (res.success) {
            setInterviewSuccessMsg('予約申請を却下しました。')
            loadInterviewSlots()
            loadFilteredBookings(interviewPeriodFilter)
            loadTeacherFutureAvailableSlots()
        } else {
            setInterviewError(`却下に失敗しました: ${res.error}`)
        }
    }

    useEffect(() => {
        if (activeTab === 'interview') {
            const loadAll = async () => {
                setInterviewLoading(true)
                try {
                    await Promise.all([
                        loadTemplateNamesList(),
                        loadInterviewTemplates(selectedTemplateName, true),
                        loadInterviewSlots(true),
                        loadTeacherFutureAvailableSlots(),
                        getTeacherBookingsFiltered(interviewPeriodFilter).then(res => {
                            if (res.success) setWeeklyBookings(res.slots)
                        })
                    ])
                } catch (err) {
                    console.error('Error loading interview data:', err)
                } finally {
                    setInterviewLoading(false)
                }
            }
            loadAll()
        }
    }, [activeTab, interviewPeriodFilter, selectedTemplateName])

    useEffect(() => {
        if (activeTab === 'interview') {
            loadInterviewSlots()
        }
    }, [interviewSelectedDate])

    // サブタブが切り替わった時に成功・失敗メッセージをリセットする
    useEffect(() => {
        setInterviewSuccessMsg(null)
        setInterviewError(null)
    }, [interviewActiveSubTab])

    // ログイン教員の担任（担当）クラスの学生リストを一度だけ取得して保持する
    useEffect(() => {
        if (myClasses && myClasses.length > 0) {
            Promise.all(myClasses.map(c => getStudentsCareerList(c.name))).then(results => {
                const allSts = results.flat()
                const uniqueSts = Array.from(new Map(allSts.map(s => [s.student_id_text, s])).values())
                // 2年生の学生のみに絞り込む
                const secondYearSts = uniqueSts.filter(s => {
                    const info = parseStudentId(s.student_id_text)
                    return info.grade === 2
                })
                setMyClassStudents(secondYearSts)
            })
        }
    }, [myClasses])

    const loadStudentHistory = async (studentId) => {
        if (!studentId) {
            setStudentHistoryInterviews([])
            return
        }
        setHistoryLoading(true)
        setInterviewError(null)
        try {
            const res = await getStudentCompletedInterviews(studentId)
            if (res.success) {
                setStudentHistoryInterviews(res.interviews)
            } else {
                setInterviewError(`履歴の取得に失敗しました: ${res.error}`)
            }
        } catch (err) {
            console.error('loadStudentHistory error:', err)
            setInterviewError('履歴の取得中にエラーが発生しました。')
        } finally {
            setHistoryLoading(false)
        }
    }



    useEffect(() => {
        if (historySelectedStudentId) {
            loadStudentHistory(historySelectedStudentId)
        } else {
            setStudentHistoryInterviews([])
        }
    }, [historySelectedStudentId])

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
            can_move: info?.can_move || '',
            tuition_budget: info?.tuition_budget || '',
            parent_support: info?.parent_support || '',
            parent_support_amount: info?.parent_support_amount || '',
            passbook_updated: info?.passbook_updated || '',
            pay_slips_available: info?.pay_slips_available || '',
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
    const DAYS_OF_WEEK = [
        { num: 1, label: '月曜日', short: '月', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
        { num: 2, label: '火曜日', short: '火', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
        { num: 3, label: '水曜日', short: '水', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
        { num: 4, label: '木曜日', short: '木', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
        { num: 5, label: '金曜日', short: '金', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' }
    ]

    const futureSlotsMap = DAYS_OF_WEEK.reduce((acc, day) => {
        const slots = teacherFutureAvailableSlots.filter(slot => {
            const dateObj = new Date(slot.slot_date)
            const dayOfWeek = dateObj.getDay()
            return dayOfWeek === day.num
        })

        const uniqueDates = []
        const seen = new Set()
        slots.forEach(s => {
            if (!seen.has(s.slot_date)) {
                seen.add(s.slot_date)
                const [y, m, d] = s.slot_date.split('-')
                uniqueDates.push({
                    date: s.slot_date,
                    label: `${parseInt(m, 10)}/${parseInt(d, 10)}`
                })
            }
        })

        acc[day.num] = uniqueDates
        return acc
    }, {})

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
                面談タブ (個別予約枠管理・スケジュール)
               ==================================================== */}
            {activeTab === 'interview' && (
                <div className={styles.tabContent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    {/* 面談用アラート表示 */}
                    {interviewSuccessMsg && (
                        <div className={styles.successAlert} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', background: 'var(--success-50)', color: 'var(--success-700)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--success-500)', boxShadow: 'var(--shadow-sm)' }}>
                            <CheckCircle size={16} />
                            <span style={{ fontWeight: '600' }}>{interviewSuccessMsg}</span>
                        </div>
                    )}
                    {interviewError && (
                        <div className={styles.errorAlert} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', background: 'var(--error-50)', color: 'var(--error-700)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--error-500)', boxShadow: 'var(--shadow-sm)' }}>
                            <AlertCircle size={16} />
                            <span style={{ fontWeight: '600' }}>{interviewError}</span>
                        </div>
                    )}

                    {/* 面談用サブタブ (セグメントコントロール調) */}
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '6px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', alignSelf: 'flex-start' }}>
                        <button 
                            className={styles.actionButton}
                            onClick={() => setInterviewActiveSubTab('schedule')}
                            style={{ margin: 0, border: 'none', borderRadius: 'var(--radius-lg)', padding: '10px 20px', background: interviewActiveSubTab === 'schedule' ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' : 'transparent', color: interviewActiveSubTab === 'schedule' ? '#fff' : 'var(--text-secondary)', fontWeight: '700', fontSize: 'var(--font-size-sm)', boxShadow: interviewActiveSubTab === 'schedule' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none', transition: 'all 0.2s', cursor: 'pointer' }}
                        >
                            📅 予約状況・スケジュール
                        </button>
                        <button 
                            className={styles.actionButton}
                            onClick={() => { setInterviewActiveSubTab('template'); loadInterviewTemplates(); }}
                            style={{ margin: 0, border: 'none', borderRadius: 'var(--radius-lg)', padding: '10px 20px', background: interviewActiveSubTab === 'template' ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' : 'transparent', color: interviewActiveSubTab === 'template' ? '#fff' : 'var(--text-secondary)', fontWeight: '700', fontSize: 'var(--font-size-sm)', boxShadow: interviewActiveSubTab === 'template' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none', transition: 'all 0.2s', cursor: 'pointer' }}
                        >
                            ⚙️ シフトテンプレート設定
                        </button>
                        <button 
                            className={styles.actionButton}
                            onClick={() => setInterviewActiveSubTab('generate')}
                            style={{ margin: 0, border: 'none', borderRadius: 'var(--radius-lg)', padding: '10px 20px', background: interviewActiveSubTab === 'generate' ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' : 'transparent', color: interviewActiveSubTab === 'generate' ? '#fff' : 'var(--text-secondary)', fontWeight: '700', fontSize: 'var(--font-size-sm)', boxShadow: interviewActiveSubTab === 'generate' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none', transition: 'all 0.2s', cursor: 'pointer' }}
                        >
                            ⚡ 枠の自動生成
                        </button>
                        <button 
                            className={styles.actionButton}
                            onClick={() => setInterviewActiveSubTab('history')}
                            style={{ margin: 0, border: 'none', borderRadius: 'var(--radius-lg)', padding: '10px 20px', background: interviewActiveSubTab === 'history' ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' : 'transparent', color: interviewActiveSubTab === 'history' ? '#fff' : 'var(--text-secondary)', fontWeight: '700', fontSize: 'var(--font-size-sm)', boxShadow: interviewActiveSubTab === 'history' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none', transition: 'all 0.2s', cursor: 'pointer' }}
                        >
                            📝 面談履歴（クラス・学生別）
                        </button>
                    </div>

                    {/* サブタブ1: スケジュール管理 */}
                    {interviewActiveSubTab === 'schedule' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>

                            {/* 予約申請一覧 (承認待ち) */}
                            {pendingSlots && pendingSlots.length > 0 && (
                                <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-4)' }}>
                                        <span style={{ fontSize: '18px' }}>📥</span>
                                        <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>
                                            予約申請一覧（承認待ち）
                                        </h3>
                                        <span style={{ background: 'var(--warning-100)', color: 'var(--warning-700)', padding: '2px 10px', borderRadius: '999px', fontSize: 'var(--font-size-xs)', fontWeight: '700' }}>
                                            {pendingSlots.length}件
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {pendingSlots.map(slot => {
                                            const d = new Date(slot.slot_date + 'T00:00:00')
                                            const days = ['日', '月', '火', '水', '木', '金', '土']
                                            const dayLabel = `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]})`
                                            return (
                                                <div 
                                                    key={slot.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        gap: '12px', 
                                                        padding: '16px 20px', 
                                                        background: '#ffffff', 
                                                        border: '1px solid var(--border-color)', 
                                                        borderRadius: 'var(--radius-xl)', 
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                                            <div style={{ fontWeight: '700', fontSize: 'var(--font-size-sm)', color: 'var(--warning-700)', background: 'var(--warning-50)', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning-200)' }}>
                                                                {dayLabel} {slot.start_time?.substring(0,5)} 〜 {slot.end_time?.substring(0,5)}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                {slot.slot_students && slot.slot_students.length > 0 ? (
                                                                    slot.slot_students.map(ss => ss.student && (
                                                                        <div key={ss.student_id_text} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: 'var(--font-size-sm)' }}>
                                                                                {ss.student.full_name}
                                                                            </span>
                                                                            <span style={{ fontSize: '11px', color: 'var(--primary-700)', background: 'var(--primary-50)', padding: '2px 8px', borderRadius: 'var(--radius-md)', fontWeight: '600' }}>
                                                                                {ss.student.class_name}
                                                                            </span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>学生情報なし</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleApproveInterview(slot.id)}
                                                                className={styles.actionButton}
                                                                style={{ margin: 0, padding: '8px 16px', fontSize: 'var(--font-size-sm)', fontWeight: '700', color: '#fff', background: 'linear-gradient(135deg, var(--success-500), var(--success-600))', border: 'none', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)', cursor: 'pointer' }}
                                                            >
                                                                ✔️ 承認する
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectInterview(slot.id)}
                                                                className={styles.actionButton}
                                                                style={{ margin: 0, padding: '8px 16px', fontSize: 'var(--font-size-sm)', fontWeight: '700', color: 'var(--error-600)', borderColor: 'var(--error-200)', background: '#fff', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--error-50)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                                            >
                                                                ❌ 却下する
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {slot.notes && (
                                                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '8px', lineHeight: '1.5', wordBreak: 'break-all' }}>
                                                            <span style={{ marginRight: '6px', color: 'var(--primary-500)' }}>💬</span>{slot.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 面談予定サマリー (今日・直近1週間・すべて切り替え) */}
                            <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-4)', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '18px' }}>📋</span>
                                    <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)', fontSize: 'var(--font-size-md)' }}>
                                        {interviewPeriodFilter === 'today' ? '本日の面談予定' : 
                                         interviewPeriodFilter === 'weekly' ? '直近1週間の面談予定' : 'すべての面談予定（本日以降）'}
                                    </h3>
                                    <span style={{ background: weeklyBookings.length > 0 ? 'var(--primary-50)' : 'var(--bg-secondary)', color: weeklyBookings.length > 0 ? 'var(--primary-700)' : 'var(--text-tertiary)', padding: '2px 10px', borderRadius: '999px', fontSize: 'var(--font-size-xs)', fontWeight: '700' }}>
                                        {weeklyBookings.length}件
                                    </span>

                                    {/* 期間切り替えスイッチ (セグメントコントロール調) */}
                                    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginLeft: 'auto' }}>
                                        <button 
                                            onClick={() => setInterviewPeriodFilter('today')}
                                            style={{ border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', background: interviewPeriodFilter === 'today' ? '#fff' : 'transparent', color: interviewPeriodFilter === 'today' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '11px', boxShadow: interviewPeriodFilter === 'today' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                                        >
                                            今日
                                        </button>
                                        <button 
                                            onClick={() => setInterviewPeriodFilter('weekly')}
                                            style={{ border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', background: interviewPeriodFilter === 'weekly' ? '#fff' : 'transparent', color: interviewPeriodFilter === 'weekly' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '11px', boxShadow: interviewPeriodFilter === 'weekly' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                                        >
                                            直近1週間
                                        </button>
                                        <button 
                                            onClick={() => setInterviewPeriodFilter('all')}
                                            style={{ border: 'none', borderRadius: 'var(--radius-md)', padding: '6px 12px', background: interviewPeriodFilter === 'all' ? '#fff' : 'transparent', color: interviewPeriodFilter === 'all' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: '700', fontSize: '11px', boxShadow: interviewPeriodFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                                        >
                                            すべて
                                        </button>
                                    </div>
                                </div>
                                {interviewLoading ? (
                                    <div className={styles.loadingSpinner}>
                                        <div className={styles.spinner}></div>
                                        <p>面談予定を読み込み中...</p>
                                    </div>
                                ) : weeklyBookings.length === 0 ? (
                                    <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: 'var(--spacing-4) 0' }}>
                                        {interviewPeriodFilter === 'today' ? '本日の予約済み面談はありません。' : 
                                         interviewPeriodFilter === 'weekly' ? '直近1週間の予約済み面談はありません。' : '予約済み面談はありません。'}
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'var(--spacing-2)' }}>
                                        {weeklyBookings.map(slot => {
                                            const d = new Date(slot.slot_date + 'T00:00:00')
                                            const days = ['日', '月', '火', '水', '木', '金', '土']
                                            const dayLabel = `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]})`
                                            const isToday = slot.slot_date === new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo'})).toISOString().split('T')[0]
                                            return (
                                                <div 
                                                    key={slot.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '16px', 
                                                        padding: '16px 20px', 
                                                        background: '#ffffff', 
                                                        border: '1px solid var(--border-color)', 
                                                        borderRadius: 'var(--radius-xl)', 
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: '700', fontSize: 'var(--font-size-sm)', color: isToday ? 'var(--primary-600)' : 'var(--text-primary)', minWidth: '95px' }}>
                                                        {dayLabel}
                                                        {isToday && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>本日</span>}
                                                    </div>
                                                    <div style={{ fontWeight: '700', color: 'var(--text-secondary)', minWidth: '130px', fontSize: 'var(--font-size-sm)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                        <>{slot.start_time?.substring(0,5)} 〜 {slot.end_time?.substring(0,5)}{slot.status === 'pending' && <span style={{ fontSize: '10px', background: 'var(--warning-50)', color: 'var(--warning-700)', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', border: '1px solid var(--warning-200)', whiteSpace: 'nowrap' }}>申請中</span>}</>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        {slot.slot_students && slot.slot_students.length > 0 ? (
                                                            slot.slot_students.map(ss => ss.student && (
                                                                <div key={ss.student_id_text} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: 'var(--font-size-sm)' }}>
                                                                        {ss.student.full_name}
                                                                    </span>
                                                                    <span style={{ fontSize: '11px', color: 'var(--primary-700)', background: 'var(--primary-50)', padding: '2px 8px', borderRadius: 'var(--radius-md)', fontWeight: '600' }}>
                                                                        {ss.student.class_name}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>学生情報なし</span>
                                                        )}
                                                    </div>
                                                    {slot.notes && (
                                                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', marginLeft: 'auto', background: '#fff', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontWeight: '500', maxWidth: '350px', wordBreak: 'break-all' }}>
                                                            💬 {slot.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* 曜日別スケジュール・空き枠一覧 */}
                            <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-5)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                                    <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>曜日別の予約可能スケジュールと空き日程</strong>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--spacing-4)', marginTop: 0 }}>
                                    曜日ごとの基本対応時間と、現在受付中の予約枠（直近30日間）です。<strong>日付をクリックすると</strong>、下の表示日付が切り替わります。
                                </p>

                                {teacherScheduleLoading ? (
                                    <div style={{ padding: 'var(--spacing-4) 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                        スケジュールを読み込んでいます...
                                    </div>
                                ) : (
                                    <div className={styles.scheduleGrid}>
                                        {DAYS_OF_WEEK.map(day => {
                                            const temps = interviewTemplates
                                                .filter(t => t.day_of_week === day.num && t.enabled)
                                                .map(t => `${t.start_time} - ${t.end_time}`)
                                            const slots = futureSlotsMap[day.num] || []
                                            return (
                                                <div 
                                                    key={day.num} 
                                                    className={styles.scheduleDayCard}
                                                    style={{ 
                                                        border: `1px solid ${day.border}`
                                                    }}
                                                >
                                                    {/* 曜日ヘッダー */}
                                                    <div style={{ background: day.bg, color: day.color, padding: '8px 4px', textAlign: 'center', fontWeight: '800', fontSize: 'var(--font-size-sm)', borderBottom: `1px solid ${day.border}` }}>
                                                        {day.label}
                                                    </div>

                                                    {/* 基本対応時間帯 */}
                                                    <div style={{ padding: '8px 6px', borderBottom: '1px dashed var(--border-color)', minHeight: '52px', display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>基本対応時間:</span>
                                                        {temps.length === 0 ? (
                                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>未設定</span>
                                                        ) : (
                                                            temps.map((t, i) => (
                                                                <span key={i} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: '600', display: 'block' }}>
                                                                    {t}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>

                                                    {/* 予約可能な具体的な日付 */}
                                                    <div style={{ padding: '8px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>受付中の日程:</span>
                                                        {slots.length === 0 ? (
                                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>なし</span>
                                                        ) : (
                                                            <div className={styles.slotsContainer}>
                                                                {slots.map(s => {
                                                                    const isSelected = interviewSelectedDate === s.date;
                                                                    return (
                                                                        <button
                                                                            key={s.date}
                                                                            type="button"
                                                                            onClick={() => setInterviewSelectedDate(s.date)}
                                                                            className={styles.slotButton}
                                                                            style={{
                                                                                border: isSelected ? `1px solid ${day.color}` : '1px solid var(--border-color)',
                                                                                background: isSelected ? day.color : '#fff',
                                                                                color: isSelected ? '#fff' : 'var(--text-secondary)',
                                                                                boxShadow: isSelected ? `0 2px 6px ${day.color}33` : 'none'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                if (!isSelected) {
                                                                                    e.currentTarget.style.borderColor = day.color
                                                                                    e.currentTarget.style.background = day.bg
                                                                                    e.currentTarget.style.color = day.color
                                                                                }
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                if (!isSelected) {
                                                                                    e.currentTarget.style.borderColor = 'var(--border-color)'
                                                                                    e.currentTarget.style.background = '#fff'
                                                                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                                                                }
                                                                            }}
                                                                        >
                                                                            {s.label}
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className={styles.tableCard} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', background: 'var(--bg-card)' }}>
                                <div style={{ padding: 'var(--spacing-4) var(--spacing-6)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 'var(--spacing-4)', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-card)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                        <label style={{ fontWeight: '700', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>表示日付:</label>
                                        <input 
                                            type="date" 
                                            value={interviewSelectedDate} 
                                            onChange={(e) => setInterviewSelectedDate(e.target.value)} 
                                            className={styles.searchInput}
                                            style={{ width: 'auto', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setInterviewSelectedDate(new Date().toISOString().split('T')[0])}
                                        className={styles.actionButton}
                                        style={{ margin: 0, padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--text-primary)' }}
                                    >
                                        今日に戻る
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsCreatingInterviewSlot(true)
                                            setInterviewCreateForm({
                                                start_time: '10:00',
                                                end_time: '10:15',
                                                status: 'available',
                                                notes: '',
                                                student_id_text: ''
                                            })
                                        }}
                                        className={styles.actionButton}
                                        style={{ margin: '0 0 0 auto', padding: '8px 16px', background: 'var(--primary-600)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-700)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-600)'}
                                    >
                                        ➕ 新規予約枠を作成
                                    </button>
                                </div>
                                <div className={styles.tableWrapper}>
                                    {interviewLoading ? (
                                        <div className={styles.loadingSpinner}>
                                            <div className={styles.spinner}></div>
                                            <p>スロットを読み込み中...</p>
                                        </div>
                                    ) : interviewSlots.filter(s => s.slot_date === interviewSelectedDate).length === 0 ? (
                                        <div className={styles.emptyState} style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
                                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--text-secondary)' }}>この日付の面談枠はまだ登録されていません。</p>
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
                                                「枠の自動生成」タブから、テンプレートを元に予約枠を作成してください。
                                            </p>
                                        </div>
                                    ) : (
                                        <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: '700' }}>時間帯 (15分枠)</th>
                                                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: '700' }}>ステータス</th>
                                                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: '700' }}>予約学生</th>
                                                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: '700' }}>面談メモ / 相談内容</th>
                                                    <th style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '700' }}>操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {interviewSlots
                                                    .filter(s => s.slot_date === interviewSelectedDate)
                                                    .map(slot => (
                                                        <tr key={slot.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <td style={{ padding: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                                {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                                            </td>
                                                            <td style={{ padding: '16px' }}>
                                                                <span style={{
                                                                    background: slot.status === 'booked' ? 'var(--primary-50)' : slot.status === 'pending' ? 'var(--warning-50)' : slot.status === 'blocked' ? 'var(--error-50)' : slot.status === 'completed' ? '#f3e8ff' : 'var(--success-50)',
                                                                    color: slot.status === 'booked' ? 'var(--primary-700)' : slot.status === 'pending' ? 'var(--warning-700)' : slot.status === 'blocked' ? 'var(--error-700)' : slot.status === 'completed' ? '#6b21a8' : 'var(--success-700)',
                                                                    padding: '4px 10px',
                                                                    borderRadius: 'var(--radius-md)',
                                                                    fontSize: 'var(--font-size-xs)',
                                                                    fontWeight: '700',
                                                                    display: 'inline-block'
                                                                }}>
                                                                    {slot.status === 'booked' ? '🔵 予約済み' : 
                                                                     slot.status === 'pending' ? '🟡 承認待ち' :
                                                                     slot.status === 'blocked' ? '🔴 受付停止' : 
                                                                     slot.status === 'completed' ? '🟣 実施完了' : '🟢 受付中'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '16px' }}>
                                                                {(slot.status === 'booked' || slot.status === 'completed') && slot.slot_students && slot.slot_students.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                        {slot.slot_students.map(ss => ss.student && (
                                                                            <strong key={ss.student_id_text} style={{ color: 'var(--text-primary)', display: 'block' }}>
                                                                                {ss.student.full_name} <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({ss.student.class_name})</span>
                                                                            </strong>
                                                                        ))}
                                                                    </div>
                                                                ) : <span style={{ color: 'var(--text-tertiary)' }}>-</span>}
                                                            </td>
                                                            <td style={{ padding: '16px', maxWidth: '300px', wordBreak: 'break-all' }}>
                                                                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.4' }}>
                                                                    {slot.notes || <span style={{ color: 'var(--text-tertiary)' }}>-</span>}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                                    {slot.status === 'pending' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleApproveInterview(slot.id)}
                                                                                className={styles.actionButton}
                                                                                style={{ margin: 0, padding: '6px 12px', fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--success-700)', borderColor: 'var(--success-200)', background: 'var(--success-50)' }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--success-100)'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--success-50)'}
                                                                            >
                                                                                ✔️ 承認
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleRejectInterview(slot.id)}
                                                                                className={styles.actionButton}
                                                                                style={{ margin: 0, padding: '6px 12px', fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--error-700)', borderColor: 'var(--error-200)', background: 'var(--error-50)' }}
                                                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--error-100)'}
                                                                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--error-50)'}
                                                                            >
                                                                                ❌ 却下
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleOpenEditInterview(slot)}
                                                                        className={styles.actionButton}
                                                                        style={{ margin: 0, padding: '6px 12px', fontSize: 'var(--font-size-xs)', fontWeight: '600' }}
                                                                    >
                                                                        ✏️ 編集
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteInterviewSlot(slot.id)}
                                                                        className={styles.actionButton}
                                                                        style={{ margin: 0, padding: '6px 12px', fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--error-600)', borderColor: 'var(--error-200)', background: '#fff' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--error-50)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                                                    >
                                                                        🗑️ 削除
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* サブタブ2: テンプレート設定 */}
                    {interviewActiveSubTab === 'template' && (
                        <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <div>
                                <h3 style={{ margin: '0 0 6px 0', fontWeight: '700', color: 'var(--text-primary)' }}>週間テンプレート (平日 9:00 〜 18:00)</h3>
                                <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 'var(--font-size-xs)' }}>
                                    各曜日の標準的な面談受付時間帯を決定します。枠を自動生成する際のデフォルト設定になります。
                                </p>
                            </div>

                            {/* テンプレート切り替え・新規追加UI */}
                            <div style={{ display: 'flex', gap: 'var(--spacing-4)', alignItems: 'flex-end', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: 'var(--spacing-4) var(--spacing-5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: 'var(--spacing-2)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '200px' }}>
                                    <label style={{ fontWeight: '700', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>適用するテンプレートを選択：</label>
                                    <select 
                                        value={selectedTemplateName}
                                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', background: '#fff', fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--text-primary)', width: '100%' }}
                                    >
                                        {availableTemplates.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1', minWidth: '240px' }}>
                                    <label style={{ fontWeight: '700', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>新規テンプレートを追加：</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input 
                                            type="text"
                                            placeholder="例: 試験期間用シフト"
                                            value={newTemplateNameInput}
                                            onChange={(e) => setNewTemplateNameInput(e.target.value)}
                                            style={{ flex: '1', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', background: '#fff', fontSize: 'var(--font-size-sm)' }}
                                        />
                                        <button 
                                            onClick={() => {
                                                const val = newTemplateNameInput.trim();
                                                if (!val) return;
                                                if (availableTemplates.includes(val)) {
                                                    alert('すでに同名のテンプレートが存在します。');
                                                    return;
                                                }
                                                // リストに追加して選択
                                                setAvailableTemplates([...availableTemplates, val]);
                                                setSelectedTemplateName(val);
                                                setNewTemplateNameInput('');
                                            }}
                                            style={{ padding: '8px 16px', background: 'var(--primary-600)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '700', fontSize: 'var(--font-size-sm)', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)', whiteSpace: 'nowrap' }}
                                        >
                                            ＋ 追加
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-4)', margin: 'var(--spacing-4) 0' }}>
                                {interviewTemplates.map((temp, idx) => {
                                    const isEnabled = temp.enabled;
                                    return (
                                        <div key={temp.day_of_week} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', padding: 'var(--spacing-4)', background: isEnabled ? 'linear-gradient(135deg, var(--bg-card), var(--bg-secondary))' : 'var(--bg-secondary)', border: isEnabled ? '1px solid var(--primary-200)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', opacity: isEnabled ? 1 : 0.65, transition: 'all 0.2s', boxShadow: isEnabled ? '0 4px 12px rgba(0,0,0,0.02)' : 'none' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={temp.enabled}
                                                    onChange={(e) => {
                                                        const updated = [...interviewTemplates]
                                                        updated[idx].enabled = e.target.checked
                                                        setInterviewTemplates(updated)
                                                    }}
                                                    style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontWeight: '700', fontSize: 'var(--font-size-md)', color: isEnabled ? 'var(--primary-700)' : 'var(--text-secondary)' }}>
                                                    {['日', '月', '火', '水', '木', '金', '土'][temp.day_of_week]}曜日
                                                </span>
                                            </label>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginTop: '4px' }}>
                                                <input 
                                                    type="time" 
                                                    value={temp.start_time}
                                                    min="09:00"
                                                    max="18:00"
                                                    disabled={!temp.enabled}
                                                    onChange={(e) => {
                                                        const updated = [...interviewTemplates]
                                                        updated[idx].start_time = e.target.value
                                                        setInterviewTemplates(updated)
                                                    }}
                                                    className={styles.searchInput}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', outline: 'none' }}
                                                />
                                                <span style={{ color: 'var(--text-tertiary)' }}>〜</span>
                                                <input 
                                                    type="time" 
                                                    value={temp.end_time}
                                                    min="09:00"
                                                    max="18:00"
                                                    disabled={!temp.enabled}
                                                    onChange={(e) => {
                                                        const updated = [...interviewTemplates]
                                                        updated[idx].end_time = e.target.value
                                                        setInterviewTemplates(updated)
                                                    }}
                                                    className={styles.searchInput}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <button 
                                onClick={handleSaveInterviewTemplates}
                                disabled={interviewSaving || interviewLoading}
                                className={styles.actionButton}
                                style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: '700', fontSize: 'var(--font-size-sm)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)', alignSelf: 'flex-start' }}
                            >
                                {interviewSaving ? '保存中...' : '💾 テンプレート設定を保存'}
                            </button>
                        </div>
                    )}

                    {/* サブタブ3: 枠の自動生成 */}
                    {interviewActiveSubTab === 'generate' && (
                        <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
                            <div>
                                <h3 style={{ margin: '0 0 6px 0', fontWeight: '700', color: 'var(--text-primary)' }}>15分間隔 予約可能枠の自動生成</h3>
                                <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 'var(--font-size-xs)' }}>
                                    設定済みの週間テンプレートをベースに、指定された開始日から終了日までの平日の予約可能スロット（15分刻み）を一括で自動生成します。
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '200px', maxWidth: '280px' }}>
                                    <label style={{ fontWeight: '700', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>ベースにするテンプレート</label>
                                    <select 
                                        value={selectedTemplateName}
                                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', background: '#fff', fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--text-primary)' }}
                                    >
                                        {availableTemplates.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '200px', maxWidth: '280px' }}>
                                    <label style={{ fontWeight: '700', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>自動生成の開始日</label>
                                    <input 
                                        type="date" 
                                        value={interviewGenRange.start}
                                        onChange={(e) => setInterviewGenRange({...interviewGenRange, start: e.target.value})}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', background: '#fff', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '200px', maxWidth: '280px' }}>
                                    <label style={{ fontWeight: '700', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>自動生成の終了日</label>
                                    <input 
                                        type="date" 
                                        value={interviewGenRange.end}
                                        onChange={(e) => setInterviewGenRange({...interviewGenRange, end: e.target.value})}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none', background: '#fff', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerateInterviewSlots}
                                disabled={interviewGenerating || interviewLoading}
                                className={styles.actionButton}
                                style={{ background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: '700', fontSize: 'var(--font-size-sm)', cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)', alignSelf: 'flex-start' }}
                            >
                                {interviewGenerating ? '生成中...' : '⚡ 予約可能枠を自動生成'}
                            </button>
                        </div>
                    )}

                    {/* サブタブ4: 面談履歴（クラス・学生別） */}
                    {interviewActiveSubTab === 'history' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
                            <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
                                <h3 style={{ margin: '0 0 16px 0', fontWeight: '700', color: 'var(--text-primary)' }}>クラス・学生別 過去の面談履歴</h3>
                                
                                {/* 検索バー & 説明 */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                                    <p style={{ color: 'var(--text-tertiary)', margin: 0, fontSize: 'var(--font-size-xs)' }}>
                                        担任している2年生のクラスの学生一覧です。行をクリックするか「履歴を表示」を押して、過去の面談記録を確認してください。
                                    </p>
                                    <div style={{ position: 'relative', width: '260px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                        <input 
                                            type="text" 
                                            placeholder="名前または学籍番号で検索..." 
                                            value={historySearchTerm}
                                            onChange={(e) => setHistorySearchTerm(e.target.value)}
                                            className={styles.searchInput}
                                            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                {/* 学生一覧の表 */}
                                <div className={styles.tableCard} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
                                    <table className={styles.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: '700', fontSize: 'var(--font-size-xs)' }}>クラス</th>
                                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: '700', fontSize: 'var(--font-size-xs)' }}>学籍番号</th>
                                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left', fontWeight: '700', fontSize: 'var(--font-size-xs)' }}>学生名</th>
                                                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '700', fontSize: 'var(--font-size-xs)' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHistoryStudents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                                                        該当する学生がいません。
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredHistoryStudents.map(student => {
                                                    const isSelected = historySelectedStudentId === student.student_id_text;
                                                    return (
                                                        <tr 
                                                            key={student.student_id_text} 
                                                            onClick={() => setHistorySelectedStudentId(student.student_id_text)}
                                                            style={{ 
                                                                cursor: 'pointer', 
                                                                background: isSelected ? 'var(--primary-50)' : 'transparent',
                                                                transition: 'background 0.15s'
                                                            }}
                                                            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                        >
                                                            <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>{student.class_name}</td>
                                                            <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)' }}>{student.student_id_text}</td>
                                                            <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>{student.full_name}</td>
                                                            <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setHistorySelectedStudentId(student.student_id_text);
                                                                    }}
                                                                    className={styles.actionButton}
                                                                    style={{ 
                                                                        margin: 0, 
                                                                        padding: '6px 12px', 
                                                                        fontSize: 'var(--font-size-xs)', 
                                                                        background: isSelected ? 'var(--primary-600)' : 'var(--bg-card)', 
                                                                        color: isSelected ? '#fff' : 'var(--primary-600)',
                                                                        border: isSelected ? 'none' : '1px solid var(--primary-200)',
                                                                        borderRadius: 'var(--radius-md)',
                                                                        fontWeight: '600',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {isSelected ? '選択中' : '履歴を表示'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 選択された学生の履歴表示 */}
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                                    {historyLoading ? (
                                        <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>履歴を読み込み中...</div>
                                    ) : !historySelectedStudentId ? (
                                        <div style={{ textAlign: 'center', padding: 'var(--spacing-8) 0', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
                                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>上の表から学生を選択すると、これまでに完了した面談履歴が表示されます。</p>
                                        </div>
                                    ) : studentHistoryInterviews.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 'var(--spacing-8) 0', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
                                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>
                                                <strong>{myClassStudents.find(s => s.student_id_text === historySelectedStudentId)?.full_name}</strong> さんの完了した面談履歴はありません。
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <h4 style={{ margin: '0 0 16px 0', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                👤 {myClassStudents.find(s => s.student_id_text === historySelectedStudentId)?.full_name} さんの面談履歴 ({studentHistoryInterviews.length}件)
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {studentHistoryInterviews.map((interview) => (
                                                    <div key={interview.id} style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', borderLeft: '5px solid var(--purple-500)' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                                                            <span style={{ fontSize: 'var(--font-size-md)', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                📅 {interview.slot_date.replace(/-/g, '/')}
                                                            </span>
                                                            <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700', border: '1px solid #e9d5ff' }}>
                                                                {interview.start_time.substring(0, 5)} - {interview.end_time.substring(0, 5)}
                                                            </span>
                                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                                👤 担当教員: <strong>{interview.teacher?.name || '不明'} 先生</strong>
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {interview.notes && (
                                                                <div style={{ background: '#fff', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                                                    <strong style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>💬 相談内容 / 面談メモ:</strong>
                                                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{interview.notes}</p>
                                                                </div>
                                                            )}
                                                            {interview.discussion_content && (
                                                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid #e2e8f0' }}>
                                                                    <strong style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: '#475569', marginBottom: '4px' }}>📝 話し合った内容:</strong>
                                                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{interview.discussion_content}</p>
                                                                </div>
                                                            )}
                                                            {interview.instructions && (
                                                                <div style={{ background: '#fffbeb', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid #fef3c7' }}>
                                                                    <strong style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: '#b45309', marginBottom: '4px' }}>📌 学生への指示 / 次回へのアドバイス:</strong>
                                                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#78350f', fontSize: 'var(--font-size-sm)' }}>{interview.instructions}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
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
                            
                            {selectedClass !== 'all' && (
                                <button
                                    onClick={handleDownloadExcel}
                                    className={styles.downloadButton}
                                    disabled={downloading}
                                >
                                    {downloading ? 'ダウンロード中...' : 'Excelダウンロード'}
                                </button>
                            )}
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

                    {/* 表示形式切り替えトグル */}
                    <div style={{ marginBottom: 'var(--spacing-3)', display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button
                            onClick={() => {
                                setSurveyViewMode('student')
                                setSurveyPage(1)
                            }}
                            className={`${styles.tabButton} ${surveyViewMode === 'student' ? styles.tabButtonActive : ''}`}
                            style={{ padding: '8px 16px', fontSize: 'var(--font-size-sm)' }}
                        >
                            学生別に表示
                        </button>
                        <button
                            onClick={() => {
                                setSurveyViewMode('school')
                                setSurveySchoolPage(1)
                            }}
                            className={`${styles.tabButton} ${surveyViewMode === 'school' ? styles.tabButtonActive : ''}`}
                            style={{ padding: '8px 16px', fontSize: 'var(--font-size-sm)' }}
                        >
                            学校別に表示
                        </button>
                    </div>

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
                                    placeholder={surveyViewMode === 'student' ? "名前または学籍番号で検索..." : "学校名、学生名等で検索..."}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setCareerPage(1)
                                        setExamPage(1)
                                        setSurveyPage(1)
                                        setSurveySchoolPage(1)
                                    }}
                                    className={styles.searchInput}
                                />
                            </div>
                        </div>
                    </div>

                    {/* データ表示エリア */}
                    <div className={styles.tableCard}>
                        {loading ? (
                            <div className={styles.loadingSpinner}>
                                <div className={styles.spinner}></div>
                                <p>データを読み込んでいます...</p>
                            </div>
                        ) : surveyViewMode === 'student' ? (
                            // 学生別表示
                            filteredSurveyStudents.length === 0 ? (
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
                            )
                        ) : (
                            // 新規：学校別表示
                            schoolsGroupedSurveys.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <FileText size={48} color="var(--text-tertiary)" />
                                    <p>該当する学校が見つかりません。</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.tableWrapper}>
                                        <table className={styles.table}>
                                            <thead>
                                                <tr>
                                                    <th>学校名</th>
                                                    <th>学校の種別</th>
                                                    <th className={styles.textCenter}>回答アンケート総数</th>
                                                    <th className={styles.textCenter}>操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedSchoolSurveys.map(item => (
                                                    <tr key={item.school_name}>
                                                        <td data-label="学校名" className={styles.fontWeightMedium}>{item.school_name}</td>
                                                        <td data-label="学校の種別">
                                                            <span className={`${styles.badge} ${
                                                                item.school_type === '大学' ? styles.badgeUniversity :
                                                                item.school_type === '短期大学' ? styles.badgeJuniorCollege :
                                                                item.school_type === '専門学校' ? styles.badgeVocationalSchool :
                                                                item.school_type === '大学院' ? styles.badgeGraduateSchool :
                                                                styles.badgeSecondary
                                                            }`}>
                                                                {item.school_type || 'その他'}
                                                            </span>
                                                        </td>
                                                        <td data-label="回答アンケート総数" className={styles.textCenter}>{item.surveys.length} 件</td>
                                                        <td data-label="操作" className={styles.textCenter}>
                                                            <button
                                                                onClick={() => setSelectedSchoolForSurveyDetails(item)}
                                                                className={styles.actionButton}
                                                            >
                                                                回答一覧を確認
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {surveySchoolTotalPages > 1 && (
                                        <div className={styles.paginationSection}>
                                            <div className={styles.paginationInfo}>
                                                全 {schoolsGroupedSurveys.length} 校中 {surveySchoolStartIndex + 1}〜{Math.min(surveySchoolStartIndex + ITEMS_PER_PAGE, schoolsGroupedSurveys.length)} 校を表示
                                            </div>
                                            <div className={styles.paginationControls}>
                                                <button 
                                                    onClick={() => setSurveySchoolPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={surveySchoolPage === 1}
                                                    className={styles.pageBtn}
                                                >
                                                    前へ
                                                </button>
                                                <span className={styles.pageIndicator}>
                                                    {surveySchoolPage} / {surveySchoolTotalPages}
                                                </span>
                                                <button 
                                                    onClick={() => setSurveySchoolPage(prev => Math.min(prev + 1, surveySchoolTotalPages))}
                                                    disabled={surveySchoolPage === surveySchoolTotalPages}
                                                    className={styles.pageBtn}
                                                >
                                                    次へ
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* ====================================================
                学校別回答一覧ポップアップ (教員用・新規)
               ==================================================== */}
            {selectedSchoolForSurveyDetails && (
                <div className={styles.modalOverlay} onClick={() => setSelectedSchoolForSurveyDetails(null)}>
                    <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{selectedSchoolForSurveyDetails.school_name} の入試アンケート回答一覧</h2>
                            <button 
                                onClick={() => setSelectedSchoolForSurveyDetails(null)} 
                                className={styles.closeModalBtn}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto', padding: 'var(--spacing-4)' }}>
                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>クラス</th>
                                            <th>氏名</th>
                                            <th>学部・学科・コース</th>
                                            <th>試験の種類</th>
                                            <th>試験日</th>
                                            <th className={styles.textCenter}>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSchoolForSurveyDetails.surveys.map((survey) => (
                                            <tr key={survey.id}>
                                                <td>{survey.class_name || '-'}</td>
                                                <td className={styles.fontWeightMedium}>{survey.student_name}</td>
                                                <td>{survey.department_name || '-'}</td>
                                                <td>{survey.exam_type || '-'}</td>
                                                <td>{survey.exam_date || '-'}</td>
                                                <td className={styles.textCenter}>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedStudentForSurvey({
                                                                full_name: survey.student_name,
                                                                student_id_text: survey.student_id_text
                                                            })
                                                            startViewingStudentSurvey(survey)
                                                        }}
                                                        className={styles.actionButton}
                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                    >
                                                        詳細確認
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                                                <label>受験した学校の種別 <span style={{ color: 'red' }}>*</span></label>
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
                                                />
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label>学部、学科、コース <span style={{ color: 'red' }}>*</span></label>
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
                                                /></div>

                                            <div className={styles.inputGroup}>
                                                <label>試験の種類 <span style={{ color: 'red' }}>*</span></label>
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
                                                <label>作文・小論文がありましたか <span style={{ color: 'red' }}>*</span></label>
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
                                                        <label>試験時間 (分) <span style={{ color: 'red' }}>*</span></label>
                                                        <input 
                                                            type="number" 
                                                            value={surveyForm.essay_time}
                                                            onChange={(e) => handleSurveyFieldChange('essay_time', e.target.value)}
                                                            placeholder="例: 60"
                                                            style={{ width: '150px' }}
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>出題された作文・小論文のテーマを記入してください。 <span style={{ color: 'red' }}>*</span></label>
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
                                                <label>日本語の筆記試験がありましたか <span style={{ color: 'red' }}>*</span></label>
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
                                                        <label>試験時間 (分) <span style={{ color: 'red' }}>*</span></label>
                                                        <input 
                                                            type="number" 
                                                            value={surveyForm.japanese_time}
                                                            onChange={(e) => handleSurveyFieldChange('japanese_time', e.target.value)}
                                                            placeholder="例: 45"
                                                            style={{ width: '150px' }}
                                                        />
                                                    </div>
                                                    
                                                    <div className={styles.inputGroup}>
                                                        <label>日本語の試験のレベル <span style={{ color: 'red' }}>*</span></label>
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
                                                        <label>日本語の試験の内容 (該当するものをすべて選択)</label>
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
                                                <label>面接がありましたか <span style={{ color: 'red' }}>*</span></label>
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
                                                            <label>面接時間 (分) <span style={{ color: 'red' }}>*</span></label>
                                                            <input 
                                                                type="number" 
                                                                value={surveyForm.interview_time}
                                                                onChange={(e) => handleSurveyFieldChange('interview_time', e.target.value)}
                                                                placeholder="例: 15"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>面接官の先生の人数 <span style={{ color: 'red' }}>*</span></label>
                                                            <input 
                                                                type="number" 
                                                                value={surveyForm.interview_teachers}
                                                                onChange={(e) => handleSurveyFieldChange('interview_teachers', e.target.value)}
                                                                placeholder="例: 2"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>同室の学生人数 (自身含む) <span style={{ color: 'red' }}>*</span></label>
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
                                                            <label style={{ fontSize: 'var(--font-size-xs)' }}>質問① <span style={{ color: 'red' }}>*</span></label>
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
            {/* ====================================================
                面談スロット新規作成モーダル
               ==================================================== */}
            {isCreatingInterviewSlot && (
                <div className={styles.modalOverlay} onClick={() => setIsCreatingInterviewSlot(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className={styles.modalHeader}>
                            <h2>手動で面談枠を作成</h2>
                            <button onClick={() => setIsCreatingInterviewSlot(false)} className={styles.closeModalBtn}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className={styles.modalBody} style={{ padding: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                {interviewSelectedDate} に新しく時間枠を手動作成します。テンプレートの時間外でも設定可能です。
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                                <div className={styles.inputGroup}>
                                    <label>開始時刻:</label>
                                    <input 
                                        type="time" 
                                        value={interviewCreateForm.start_time}
                                        onChange={(e) => setInterviewCreateForm({...interviewCreateForm, start_time: e.target.value})}
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>終了時刻:</label>
                                    <input 
                                        type="time" 
                                        value={interviewCreateForm.end_time}
                                        onChange={(e) => setInterviewCreateForm({...interviewCreateForm, end_time: e.target.value})}
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>ステータス:</label>
                                <select 
                                    value={interviewCreateForm.status}
                                    onChange={(e) => {
                                        const nextStatus = e.target.value;
                                        setInterviewCreateForm(prev => ({
                                            ...prev, 
                                            status: nextStatus,
                                            student_id_text: nextStatus !== 'booked' ? '' : prev.student_id_text
                                        }));
                                    }}
                                    className={styles.selectInput}
                                    style={{ width: '100%' }}
                                >
                                    <option value="available">🟢 予約受付中 (Available)</option>
                                    <option value="blocked">🔴 予約停止 (Blocked)</option>
                                    <option value="booked">🔵 予約済み (Booked)</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>面談を行う学生 (複数選択可):</label>
                                <div style={{ 
                                    maxHeight: '200px', 
                                    overflowY: 'auto', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: 'var(--radius-md)', 
                                    padding: '10px',
                                    background: '#fff'
                                }}>
                                    {Object.entries(groupedMyClassStudents).map(([className, sts]) => (
                                        <div key={className} style={{ marginBottom: '10px' }}>
                                            <div style={{ fontWeight: '700', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
                                                {className}
                                            </div>
                                            {sts.map(st => {
                                                const isSelected = selectedStudentIds.includes(st.student_id_text);
                                                return (
                                                    <label key={st.student_id_text} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: 'var(--font-size-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStudentIds([...selectedStudentIds, st.student_id_text])
                                                                } else {
                                                                    setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.student_id_text))
                                                                }
                                                            }}
                                                        />
                                                        {st.full_name} ({st.student_id_text})
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    {Object.keys(groupedMyClassStudents).length === 0 && (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>対象の学生がいません</span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>面談内容 / メモ:</label>
                                <textarea 
                                    value={interviewCreateForm.notes}
                                    onChange={(e) => setInterviewCreateForm({...interviewCreateForm, notes: e.target.value})}
                                    placeholder="相談内容、面談メモなど"
                                    rows={3}
                                    className={styles.searchInput}
                                    style={{ width: '100%', resize: 'none' }}
                                />
                            </div>

                            {interviewError && (
                                <div style={{ color: 'var(--error-600)', background: 'var(--error-50)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                                    ⚠️ {interviewError}
                                </div>
                            )}

                            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                                <button 
                                    onClick={() => setIsCreatingInterviewSlot(false)} 
                                    className={styles.actionButton}
                                    style={{ margin: 0, padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                >
                                    キャンセル
                                </button>
                                <button 
                                    onClick={handleCreateInterviewSlot} 
                                    disabled={interviewSaving}
                                    className={styles.actionButton}
                                    style={{ margin: 0, padding: '8px 16px', background: 'var(--primary-600)', color: '#fff', border: 'none' }}
                                >
                                    {interviewSaving ? '保存中...' : '作成して保存'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ====================================================
                面談スロット編集モーダル
               ==================================================== */}
            {editingInterviewSlot && (
                <div className={styles.modalOverlay} onClick={() => setEditingInterviewSlot(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className={styles.modalHeader}>
                            <h2>面談枠の編集・修正</h2>
                            <button onClick={() => setEditingInterviewSlot(null)} className={styles.closeModalBtn}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className={styles.modalBody} style={{ padding: 'var(--spacing-4)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                {editingInterviewSlot.slot_date} の時間枠を変更します
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                                <div className={styles.inputGroup}>
                                    <label>開始時刻:</label>
                                    <input 
                                        type="time" 
                                        value={interviewEditForm.start_time}
                                        onChange={(e) => setInterviewEditForm({...interviewEditForm, start_time: e.target.value})}
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>終了時刻:</label>
                                    <input 
                                        type="time" 
                                        value={interviewEditForm.end_time}
                                        onChange={(e) => setInterviewEditForm({...interviewEditForm, end_time: e.target.value})}
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>ステータス:</label>
                                <select 
                                    value={interviewEditForm.status}
                                    onChange={(e) => {
                                        const nextStatus = e.target.value;
                                        setInterviewEditForm(prev => ({
                                            ...prev, 
                                            status: nextStatus,
                                            // ステータスを「予約済み」または「実施完了」以外に変更したときは、選択されていた学生を自動クリア
                                            student_id_text: (nextStatus !== 'booked' && nextStatus !== 'completed') ? '' : prev.student_id_text
                                        }));
                                    }}
                                    className={styles.selectInput}
                                    style={{ width: '100%' }}
                                >
                                    <option value="available">🟢 予約受付中 (Available)</option>
                                    <option value="blocked">🔴 予約停止 (Blocked)</option>
                                    <option value="booked">🔵 予約済み (Booked)</option>
                                    <option value="completed">🟣 実施完了 (Completed)</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>面談を行う学生 (複数選択可):</label>
                                <div style={{ 
                                    maxHeight: '200px', 
                                    overflowY: 'auto', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: 'var(--radius-md)', 
                                    padding: '10px',
                                    background: '#fff'
                                }}>
                                    {Object.entries(groupedMyClassStudents).map(([className, sts]) => (
                                        <div key={className} style={{ marginBottom: '10px' }}>
                                            <div style={{ fontWeight: '700', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '4px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px' }}>
                                                {className}
                                            </div>
                                            {sts.map(st => {
                                                const isSelected = selectedStudentIds.includes(st.student_id_text);
                                                return (
                                                    <label key={st.student_id_text} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: 'var(--font-size-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStudentIds([...selectedStudentIds, st.student_id_text])
                                                                } else {
                                                                    setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.student_id_text))
                                                                }
                                                            }}
                                                        />
                                                        {st.full_name} ({st.student_id_text})
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    {Object.keys(groupedMyClassStudents).length === 0 && (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>対象の学生がいません</span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label>面談内容 / メモ:</label>
                                <textarea 
                                    value={interviewEditForm.notes}
                                    onChange={(e) => setInterviewEditForm({...interviewEditForm, notes: e.target.value})}
                                    placeholder="相談内容、面談メモなど"
                                    rows={3}
                                    className={styles.searchInput}
                                    style={{ width: '100%', resize: 'none' }}
                                />
                            </div>

                            {(interviewEditForm.status === 'completed' || interviewEditForm.status === 'booked') && (
                                <>
                                    <div className={styles.inputGroup}>
                                        <label>話し合った内容:</label>
                                        <textarea 
                                            value={interviewEditForm.discussion_content}
                                            onChange={(e) => setInterviewEditForm({...interviewEditForm, discussion_content: e.target.value})}
                                            placeholder="面談で話し合った内容や学生の状況など"
                                            rows={3}
                                            className={styles.searchInput}
                                            style={{ width: '100%', resize: 'none' }}
                                        />
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label>指示 / 次回へのアドバイス:</label>
                                        <textarea 
                                            value={interviewEditForm.instructions}
                                            onChange={(e) => setInterviewEditForm({...interviewEditForm, instructions: e.target.value})}
                                            placeholder="学生への指示事項や今後のアクションアイテムなど"
                                            rows={3}
                                            className={styles.searchInput}
                                            style={{ width: '100%', resize: 'none' }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={styles.modalFooter} style={{ display: 'flex', gap: 'var(--spacing-3)', justifyContent: 'flex-end', padding: 'var(--spacing-4)', borderTop: '1px solid var(--border-color)' }}>
                            <button 
                                onClick={() => setEditingInterviewSlot(null)}
                                className={styles.cancelBtn}
                                style={{ margin: 0 }}
                            >
                                キャンセル
                            </button>
                            <button 
                                onClick={handleSaveEditInterview}
                                disabled={interviewLoading}
                                className={styles.submitBtn}
                                style={{ margin: 0 }}
                            >
                                {interviewLoading ? '保存中...' : '変更を保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
