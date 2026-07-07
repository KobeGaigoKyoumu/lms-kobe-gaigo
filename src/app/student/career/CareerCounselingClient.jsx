'use client'

import { useState, useEffect } from 'react'
import { 
    saveStudentCareerInfo,
    saveStudentExamSchedulesSelf,
    saveStudentExamSurveySelf,
    deleteStudentExamSurveySelf
} from '@/app/actions/career'
import {
    getStudentHomeroomTeacher,
    getAvailableSlots,
    bookSlot,
    cancelBooking,
    getStudentBookings,
    getStudentHomeroomTeacherTemplates,
    getAvailableSlotsForRange
} from '@/app/actions/interview'
import { 
    BookOpen, Clipboard, Calendar, HelpCircle, ChevronRight, ChevronLeft, Save, Edit3, Lock,
    Plus, Trash2, X, CheckCircle, AlertCircle, FileText
} from 'lucide-react'
import SchoolAutocomplete from '@/components/SchoolAutocomplete'
import styles from './page.module.css'

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

export default function CareerCounselingClient({ initialData, examSchedules, examSurveys, isSecondYear, session }) {
    const [activeTab, setActiveTab] = useState('interview') // 初期表示は「面談」タブ
    const [data, setData] = useState(initialData || null)
    const [isEditing, setIsEditing] = useState(false)
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    // 面談（Interview）関連の状態
    const [homeroomTeacher, setHomeroomTeacher] = useState(null) // 担任教師情報: { id, name }
    const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0])
    const [availableSlots, setAvailableSlots] = useState([])
    const [selectedSlotId, setSelectedSlotId] = useState('')
    const [consultNotes, setConsultNotes] = useState('')
    const [studentBookings, setStudentBookings] = useState([])
    const [interviewLoading, setInterviewLoading] = useState(false)
    const [interviewSuccessMsg, setInterviewSuccessMsg] = useState(null)
    const [interviewError, setInterviewError] = useState(null)
    const [teacherTemplates, setTeacherTemplates] = useState([])
    const [futureAvailableSlots, setFutureAvailableSlots] = useState([])
    const [scheduleLoading, setScheduleLoading] = useState(false)

    // 入試予定関連の状態
    const [examSchedulesList, setExamSchedulesList] = useState(examSchedules || [])
    const [isEditingExams, setIsEditingExams] = useState(false)
    const [examFormList, setExamFormList] = useState([])
    const [savingExam, setSavingExam] = useState(false)
    const [examError, setExamError] = useState(null)
    const [examSuccessMsg, setExamSuccessMsg] = useState(null)

    // 入試アンケート関連の状態
    const [examSurveysList, setExamSurveysList] = useState(examSurveys || [])
    const [surveyModalMode, setSurveyModalMode] = useState('list') // 'list', 'view', 'edit'
    const [selectedSurvey, setSelectedSurvey] = useState(null)
    const [surveyStep, setSurveyStep] = useState(1)
    const [savingSurvey, setSavingSurvey] = useState(false)
    const [surveyError, setSurveyError] = useState(null)
    const [surveySuccessMsg, setSurveySuccessMsg] = useState(null)

    // validation states for red section styling
    const [careerErrors, setCareerErrors] = useState([])
    const [examErrors, setExamErrors] = useState([]) // indices of invalid exams
    const [surveyErrors, setSurveyErrors] = useState([])

    const upcomingBookings = studentBookings.filter(b => b.status === 'booked' || b.status === 'pending')
    const completedBookings = studentBookings.filter(b => b.status === 'completed')

    const [surveyForm, setSurveyForm] = useState({
        school_type: '',
        school_name: '',
        exam_date: '',
        department_name: '',
        exam_type: '',
        essay_exists: '',
        essay_time: '',
        essay_theme: '',
        japanese_exists: '',
        japanese_time: '',
        japanese_level: '',
        japanese_content: [],
        interview_exists: '',
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
    })

    // Form states matching Excel questionnaire
    const [form, setForm] = useState({
        class_name: initialData?.class_name || session?.className || '',
        student_name: initialData?.student_name || session?.name || '',
        path_type: initialData?.path_type || '',
        first_choice_school: initialData?.first_choice_school || '',
        first_choice_reason: initialData?.first_choice_reason || '',
        first_choice_department: initialData?.first_choice_department || '',
        second_choice_school: initialData?.second_choice_school || '',
        second_choice_reason: initialData?.second_choice_reason || '',
        second_choice_department: initialData?.second_choice_department || '',
        third_choice_school: initialData?.third_choice_school || '',
        third_choice_reason: initialData?.third_choice_reason || '',
        third_choice_department: initialData?.third_choice_department || '',
        preferred_field: initialData?.preferred_field || '',
        preferred_region: initialData?.preferred_region || '',
        can_move: initialData?.can_move || '',
        tuition_budget: initialData?.tuition_budget || '',
        parent_support: initialData?.parent_support || '',
        parent_support_amount: initialData?.parent_support_amount || '',
        passbook_updated: initialData?.passbook_updated || '',
        pay_slips_available: initialData?.pay_slips_available || '',
        exam_schedule: initialData?.exam_schedule || '',
        post_grad_plans: initialData?.post_grad_plans || '',
        teacher_questions: initialData?.teacher_questions || ''
    })

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
        if (value && (typeof value !== 'string' || value.trim())) {
            setCareerErrors(prev => prev.filter(f => f !== field))
        }
    }

    const validateCareerStep = (currentStep) => {
        const errors = []
        const fields = []

        if (currentStep === 1) {
            if (!form.path_type) {
                errors.push('日本語学校卒業後の予定')
                fields.push('path_type')
            }
        } else if (currentStep === 2 && form.path_type === '進学') {
            if (!form.first_choice_school || !form.first_choice_school.trim()) {
                errors.push('1番行きたい学校の名前')
                fields.push('first_choice_school')
            }
            if (!form.first_choice_department || !form.first_choice_department.trim()) {
                errors.push('1番行きたい学校の学部・学科・コースの名前')
                fields.push('first_choice_department')
            }
            if (!form.first_choice_reason || !form.first_choice_reason.trim()) {
                errors.push('1番行きたい学校の行きたい理由')
                fields.push('first_choice_reason')
            }
        } else if (currentStep === 3) {
            if (!form.can_move) {
                errors.push('進学で引っこしできるかどうか')
                fields.push('can_move')
            }
            if (!form.parent_support) {
                errors.push('両親が学費のお金を出せるかどうか')
                fields.push('parent_support')
            }
            if (!form.passbook_updated) {
                errors.push('銀行通帳を使っているかどうか')
                fields.push('passbook_updated')
            }
            if (!form.pay_slips_available) {
                errors.push('アルバイトの給与明細書があるかどうか')
                fields.push('pay_slips_available')
            }
        }

        return { errors, fields }
    }

    const nextStep = () => {
        const { errors, fields } = validateCareerStep(step)
        if (errors.length > 0) {
            setCareerErrors(fields)
            setError(`未回答の項目があります：${errors.join('、')} を入力してください。`)
            return
        }
        setError(null)
        setCareerErrors([])

        // Skip step 2 and 3 if not pursuing higher education (進学)
        if (step === 1 && form.path_type !== '進学') {
            setStep(4)
        } else {
            setStep(prev => prev + 1)
        }
    }

    const prevStep = () => {
        setError(null)
        setCareerErrors([])
        if (step === 4 && form.path_type !== '進学') {
            setStep(1)
        } else {
            setStep(prev => prev - 1)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const { errors, fields } = validateCareerStep(step)
        if (errors.length > 0) {
            setCareerErrors(fields)
            setError(`未回答の項目があります：${errors.join('、')} を入力してください。`)
            return
        }
        setError(null)
        setCareerErrors([])

        if (step < 4) {
            nextStep()
            return
        }
        setSaving(true)
        setError(null)
        
        try {
            const res = await saveStudentCareerInfo(form)
            if (res.success) {
                setData(form)
                setIsEditing(false)
                setStep(1)
            } else {
                setError(res.error || '保存に失敗しました。')
            }
        } catch (err) {
            setError('通信エラーが発生しました。')
        } finally {
            setSaving(false)
        }
    }

    const startEditing = () => {
        setForm({
            class_name: data?.class_name || session?.className || '',
            student_name: data?.student_name || session?.name || '',
            path_type: data?.path_type || '',
            first_choice_school: data?.first_choice_school || '',
            first_choice_reason: data?.first_choice_reason || '',
            first_choice_department: data?.first_choice_department || '',
            second_choice_school: data?.second_choice_school || '',
            second_choice_reason: data?.second_choice_reason || '',
            second_choice_department: data?.second_choice_department || '',
            third_choice_school: data?.third_choice_school || '',
            third_choice_reason: data?.third_choice_reason || '',
            third_choice_department: data?.third_choice_department || '',
            preferred_field: data?.preferred_field || '',
            preferred_region: data?.preferred_region || '',
            can_move: data?.can_move || '',
            tuition_budget: data?.tuition_budget || '',
            parent_support: data?.parent_support || '',
            parent_support_amount: data?.parent_support_amount || '',
            passbook_updated: data?.passbook_updated || '',
            pay_slips_available: data?.pay_slips_available || '',
            exam_schedule: data?.exam_schedule || '',
            post_grad_plans: data?.post_grad_plans || '',
            teacher_questions: data?.teacher_questions || ''
        })
        setIsEditing(true)
        setStep(1)
        setCareerErrors([])
        setError(null)
    }

    // ====================================================
    // 入試予定 (EXAM SCHEDULES) ロジック
    // ====================================================
    const startEditingExams = () => {
        if (examSchedulesList.length === 0) {
            setExamFormList([{ 
                school_name: '', 
                department_name: '', 
                _app_period_start: '',
                _app_period_end: '',
                exam_date: '', 
                results_date: '', 
                status: '' 
            }])
        } else {
            setExamFormList(examSchedulesList.map(s => {
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
        setIsEditingExams(true)
        setExamError(null)
        setExamSuccessMsg(null)
        setExamErrors([])
    }

    const addExamRow = () => {
        setExamFormList(prev => [
            ...prev,
            { 
                school_name: '', 
                department_name: '', 
                _app_period_start: '',
                _app_period_end: '',
                exam_date: '', 
                results_date: '', 
                status: '' 
            }
        ])
    }

    const removeExamRow = (index) => {
        setExamFormList(prev => prev.filter((_, i) => i !== index))
        setExamErrors(prev => prev.filter(idx => idx !== index).map(idx => idx > index ? idx - 1 : idx))
    }

    const handleExamFieldChange = (index, field, value) => {
        setExamFormList(prev => {
            const copy = [...prev]
            copy[index] = { ...copy[index], [field]: value }
            return copy
        })
        if (field === 'school_name' && value && value.trim()) {
            setExamErrors(prev => prev.filter(idx => idx !== index))
        }
    }

    const handleSaveExams = async (e) => {
        e.preventDefault()
        setSavingExam(true)
        setExamError(null)
        setExamSuccessMsg(null)
        setExamErrors([])

        const invalidIndices = []
        examFormList.forEach((item, idx) => {
            if (!item.school_name || !item.school_name.trim() || !item.status) {
                invalidIndices.push(idx)
            }
        })

        if (invalidIndices.length > 0) {
            setExamErrors(invalidIndices)
            setExamError('入力されていない学校名または試験の状況があります。すべての項目を入力・選択してください。')
            setSavingExam(false)
            return
        }

        const validSchedules = examFormList.map(s => {
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

        try {
            const res = await saveStudentExamSchedulesSelf(validSchedules)
            if (res.success) {
                setExamSchedulesList(validSchedules)
                setIsEditingExams(false)
                setExamSuccessMsg('入試予定を保存しました。')
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
        const scheduleToDelete = examSchedulesList[index]
        if (!scheduleToDelete) return

        const isConfirmed = window.confirm(`この入試予定（${scheduleToDelete.school_name}）を削除してもよろしいですか？`)
        if (!isConfirmed) return

        const updatedSchedules = examSchedulesList.filter((_, i) => i !== index)

        setSavingExam(true)
        setExamError(null)
        setExamSuccessMsg(null)
        try {
            const res = await saveStudentExamSchedulesSelf(updatedSchedules)
            if (res.success) {
                setExamSchedulesList(updatedSchedules)
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

    // ====================================================
    // 入試アンケート (EXAM SURVEYS) ロジック
    // ====================================================
    const handleSurveyFieldChange = (field, value) => {
        setSurveyForm(prev => ({ ...prev, [field]: value }))
        if (value && (typeof value !== 'string' || value.trim())) {
            setSurveyErrors(prev => prev.filter(f => f !== field))
        }
    }

    const handleSurveyCheckboxChange = (item, isChecked) => {
        setSurveyForm(prev => {
            const current = prev.japanese_content || []
            const next = isChecked 
                ? [...current, item] 
                : current.filter(c => c !== item)
            
            if (next.length > 0) {
                setSurveyErrors(prev => prev.filter(f => f !== 'japanese_content'))
            }
            return { ...prev, japanese_content: next }
        })
    }

    const startViewingSurvey = (survey) => {
        setSurveyForm({
            ...survey,
            japanese_content: Array.isArray(survey.japanese_content) 
                ? survey.japanese_content 
                : (typeof survey.japanese_content === 'string' && survey.japanese_content.startsWith('[')
                    ? JSON.parse(survey.japanese_content)
                    : (survey.japanese_content ? survey.japanese_content.split(',') : [])
                )
        })
        setSelectedSurvey(survey)
        setSurveyModalMode('view')
        setSurveyError(null)
        setSurveySuccessMsg(null)
    }

    const startEditingSurvey = (survey) => {
        const defaultForm = {
            school_type: '',
            school_name: '',
            exam_date: '',
            department_name: '',
            exam_type: '',
            essay_exists: '',
            essay_time: '',
            essay_theme: '',
            japanese_exists: '',
            japanese_time: '',
            japanese_level: '',
            japanese_content: [],
            interview_exists: '',
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

        if (survey) {
            setSurveyForm({
                ...defaultForm,
                ...survey,
                exam_date: parseToDateInput(survey.exam_date),
                japanese_content: Array.isArray(survey.japanese_content) 
                    ? survey.japanese_content 
                    : (typeof survey.japanese_content === 'string' && survey.japanese_content.startsWith('[')
                        ? JSON.parse(survey.japanese_content)
                        : (survey.japanese_content ? survey.japanese_content.split(',') : [])
                    )
            })
            setSelectedSurvey(survey)
        } else {
            setSurveyForm(defaultForm)
            setSelectedSurvey(null)
        }
        
        setSurveyStep(1)
        setSurveyModalMode('edit')
        setSurveyError(null)
        setSurveySuccessMsg(null)
        setSurveyErrors([])
    }

    const validateSurveyStep = (currentStep) => {
        const errors = []
        const fields = []

        if (currentStep === 1) {
            if (!surveyForm.school_type) {
                errors.push('学校の種類')
                fields.push('school_type')
            }
            if (!surveyForm.school_name || !surveyForm.school_name.trim()) {
                errors.push('学校名')
                fields.push('school_name')
            }
            if (!surveyForm.department_name || !surveyForm.department_name.trim()) {
                errors.push('学部・学科・コース')
                fields.push('department_name')
            }
            if (!surveyForm.exam_type || !surveyForm.exam_type.trim()) {
                errors.push('試験の種類')
                fields.push('exam_type')
            }
        } else if (currentStep === 2) {
            if (!surveyForm.essay_exists) {
                errors.push('作文・小論文試験の有無')
                fields.push('essay_exists')
            } else if (surveyForm.essay_exists === 'あり') {
                if (!surveyForm.essay_time) {
                    errors.push('作文・小論文の試験時間')
                    fields.push('essay_time')
                }
                if (!surveyForm.essay_theme || !surveyForm.essay_theme.trim()) {
                    errors.push('作文・小論文のテーマ')
                    fields.push('essay_theme')
                }
            }
        } else if (currentStep === 3) {
            if (!surveyForm.japanese_exists) {
                errors.push('日本語試験の有無')
                fields.push('japanese_exists')
            } else if (surveyForm.japanese_exists === 'あり') {
                if (!surveyForm.japanese_time) {
                    errors.push('日本語の試験時間')
                    fields.push('japanese_time')
                }
                if (!surveyForm.japanese_level) {
                    errors.push('難しさのレベル')
                    fields.push('japanese_level')
                }
                if (!surveyForm.japanese_content || surveyForm.japanese_content.length === 0) {
                    errors.push('日本語の試験内容')
                    fields.push('japanese_content')
                }
            }
        } else if (currentStep === 4) {
            if (!surveyForm.interview_exists) {
                errors.push('面接試験の有無')
                fields.push('interview_exists')
            } else if (surveyForm.interview_exists === 'あり') {
                if (!surveyForm.interview_time) {
                    errors.push('面接時間')
                    fields.push('interview_time')
                }
                if (!surveyForm.interview_teachers) {
                    errors.push('面接の先生の人数')
                    fields.push('interview_teachers')
                }
                if (!surveyForm.interview_students) {
                    errors.push('一緒に面接を受けた学生の人数')
                    fields.push('interview_students')
                }
                if (!surveyForm.interview_question_1 || !surveyForm.interview_question_1.trim()) {
                    errors.push('面接の質問①')
                    fields.push('interview_question_1')
                }
            }
        }

        return { errors, fields }
    }

    const nextSurveyStep = () => {
        const { errors, fields } = validateSurveyStep(surveyStep)
        if (errors.length > 0) {
            setSurveyErrors(fields)
            setSurveyError(`未回答の項目があります：${errors.join('、')} を入力・選択してください。`)
            return
        }

        setSurveyError(null)
        setSurveyErrors([])
        setSurveyStep(prev => prev + 1)
    }

    const prevSurveyStep = () => {
        setSurveyError(null)
        setSurveyErrors([])
        setSurveyStep(prev => prev - 1)
    }

    const handleSaveSurvey = async (e) => {
        if (e) e.preventDefault()
        
        if (surveyStep < 5) {
            nextSurveyStep()
            return
        }

        setSavingSurvey(true)
        setSurveyError(null)
        setSurveySuccessMsg(null)
        setSurveyErrors([])

        // Validate all steps from 1 to 4
        let allErrors = []
        let allFields = []
        for (let s = 1; s <= 4; s++) {
            const { errors, fields } = validateSurveyStep(s)
            allErrors = [...allErrors, ...errors]
            allFields = [...allFields, ...fields]
        }

        if (allErrors.length > 0) {
            setSurveyErrors(allFields)
            setSurveyError(`未回答の項目があります：${allErrors.join('、')} を入力・選択してください。`)
            
            // Go back to the first step containing an error
            const firstField = allFields[0]
            if (['school_type', 'school_name', 'department_name', 'exam_type'].includes(firstField)) {
                setSurveyStep(1)
            } else if (['essay_time', 'essay_theme'].includes(firstField)) {
                setSurveyStep(2)
            } else if (['japanese_time', 'japanese_level', 'japanese_content'].includes(firstField)) {
                setSurveyStep(3)
            } else if (['interview_time', 'interview_teachers', 'interview_students', 'interview_question_1'].includes(firstField)) {
                setSurveyStep(4)
            }
            
            setSavingSurvey(false)
            return
        }

        const payload = {
            ...surveyForm,
            exam_date: formatToSave(surveyForm.exam_date),
            japanese_content: JSON.stringify(surveyForm.japanese_content || [])
        }
        if (selectedSurvey?.id) {
            payload.id = selectedSurvey.id
        }

        try {
            const res = await saveStudentExamSurveySelf(payload)
            if (res.success) {
                const updatedSurveyItem = {
                    ...surveyForm,
                    exam_date: formatToSave(surveyForm.exam_date),
                    id: selectedSurvey?.id || res.id
                }

                if (selectedSurvey?.id) {
                    setExamSurveysList(prev => prev.map(s => s.id === selectedSurvey.id ? updatedSurveyItem : s))
                } else {
                    setExamSurveysList(prev => [...prev, updatedSurveyItem])
                }

                setSurveyModalMode('list')
                setSurveySuccessMsg('アンケート回答を保存しました。')
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

    const handleDeleteSurvey = async (surveyId, schoolName) => {
        const isConfirmed = window.confirm(`この「${schoolName}」の入試アンケート回答を削除してもよろしいですか？\n削除すると元に戻せません。`)
        if (!isConfirmed) return

        setSavingSurvey(true)
        setSurveyError(null)
        setSurveySuccessMsg(null)

        try {
            const res = await deleteStudentExamSurveySelf(surveyId)
            if (res.success) {
                setExamSurveysList(prev => prev.filter(s => s.id !== surveyId))
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


    // ----------------------------------------------------
    // 面談（INTERVIEW）ロジック
    // ----------------------------------------------------
    const loadTeacherScheduleDetails = async (teacherId) => {
        if (!teacherId) return
        setScheduleLoading(true)
        try {
            const todayStr = new Date().toISOString().split('T')[0]
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 30)
            const futureDateStr = futureDate.toISOString().split('T')[0]

            const [tempRes, slotsRes] = await Promise.all([
                getStudentHomeroomTeacherTemplates(teacherId),
                getAvailableSlotsForRange(teacherId, todayStr, futureDateStr)
            ])

            if (tempRes.success) {
                setTeacherTemplates(tempRes.templates || [])
            }
            if (slotsRes.success) {
                setFutureAvailableSlots(slotsRes.slots || [])
            }
        } catch (err) {
            console.error('Error loading teacher schedule details:', err)
        } finally {
            setScheduleLoading(false)
        }
    }

    const loadHomeroomTeacher = async () => {
        setInterviewLoading(true)
        const res = await getStudentHomeroomTeacher()
        setInterviewLoading(false)
        if (res.success) {
            setHomeroomTeacher(res.teacher)
            loadTeacherScheduleDetails(res.teacher.id)
        } else {
            setInterviewError(res.error || '担任教師の取得に失敗しました。')
        }
    }

    const loadAvailableSlots = async () => {
        if (!homeroomTeacher?.id) return
        setInterviewLoading(true)
        const res = await getAvailableSlots(homeroomTeacher.id, interviewDate)
        setInterviewLoading(false)
        if (res.success) {
            setAvailableSlots(res.slots)
            setSelectedSlotId('')
        }
    }

    const loadStudentBookings = async () => {
        setInterviewLoading(true)
        const res = await getStudentBookings()
        setInterviewLoading(false)
        if (res.success) {
            setStudentBookings(res.bookings)
        }
    }

    const handleBookSlot = async (e) => {
        e.preventDefault()
        if (!selectedSlotId) {
            setInterviewError('予約する時間枠を選択してください。')
            return
        }
        setInterviewLoading(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)

        const res = await bookSlot(selectedSlotId, consultNotes)
        setInterviewLoading(false)
        if (res.success) {
            setInterviewSuccessMsg('面談の予約が完了しました！')
            setConsultNotes('')
            setSelectedSlotId('')
            loadAvailableSlots()
            loadStudentBookings()
            if (homeroomTeacher?.id) {
                loadTeacherScheduleDetails(homeroomTeacher.id)
            }
        } else {
            setInterviewError(`予約に失敗しました: ${res.error}`)
        }
    }

    const handleCancelBooking = async (slotId) => {
        if (!confirm('この面談予約をキャンセルしてよろしいですか？')) return
        setInterviewLoading(true)
        setInterviewSuccessMsg(null)
        setInterviewError(null)

        const res = await cancelBooking(slotId)
        setInterviewLoading(false)
        if (res.success) {
            setInterviewSuccessMsg('予約をキャンセルしました。')
            loadAvailableSlots()
            loadStudentBookings()
            if (homeroomTeacher?.id) {
                loadTeacherScheduleDetails(homeroomTeacher.id)
            }
        } else {
            setInterviewError(`キャンセルに失敗しました: ${res.error}`)
        }
    }

    useEffect(() => {
        if (activeTab === 'interview') {
            loadHomeroomTeacher()
            loadStudentBookings()
        }
    }, [activeTab])

    useEffect(() => {
        if (activeTab === 'interview' && homeroomTeacher?.id) {
            loadAvailableSlots()
        }
    }, [activeTab, homeroomTeacher, interviewDate])
    const DAYS_OF_WEEK = [
        { num: 1, label: '月曜日', short: '月', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
        { num: 2, label: '火曜日', short: '火', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
        { num: 3, label: '水曜日', short: '水', color: '#f59e0b', bg: '#fffbeb', border: '#fef3c7' },
        { num: 4, label: '木曜日', short: '木', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
        { num: 5, label: '金曜日', short: '金', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' }
    ]

    const templateMap = DAYS_OF_WEEK.reduce((acc, day) => {
        acc[day.num] = teacherTemplates
            .filter(t => t.day_of_week === day.num)
            .map(t => `${t.start_time.substring(0, 5)} - ${t.end_time.substring(0, 5)}`)
        return acc
    }, {})

    const futureSlotsMap = DAYS_OF_WEEK.reduce((acc, day) => {
        const slots = futureAvailableSlots.filter(slot => {
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
        <div className={styles.page}>
            <h1 className={styles.title}>進路・面談</h1>

            {/* Tabs */}
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
                INTERVIEW TAB (面談予約)
               ==================================================== */}
            {activeTab === 'interview' && (
                <div className={styles.tabContent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    {interviewSuccessMsg && (
                        <div className={styles.successAlert} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', background: 'var(--success-50)', color: 'var(--success-700)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--success-500)', boxShadow: 'var(--shadow-sm)' }}>
                            <CheckCircle size={18} />
                            <span style={{ fontWeight: '600' }}>{interviewSuccessMsg}</span>
                        </div>
                    )}
                    {interviewError && (
                        <div className={styles.errorAlert} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', background: 'var(--error-50)', color: 'var(--error-700)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--error-500)', boxShadow: 'var(--shadow-sm)' }}>
                            <AlertCircle size={18} />
                            <span style={{ fontWeight: '600' }}>{interviewError}</span>
                        </div>
                    )}

                    {/* アクティブな面談予約の表示 */}
                    <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
                            <span style={{ fontSize: '1.4rem' }}>📅</span>
                            <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)' }}>いまの予約リスト</h3>
                        </div>
                        
                        {upcomingBookings.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-6) 0', color: 'var(--text-tertiary)' }}>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>いま、話す予定はありません。</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                                {upcomingBookings.map(booking => (
                                    <div key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', borderLeft: '5px solid var(--primary-500)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: '4px' }}>
                                                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {booking.slot_date.replace(/-/g, '/')}
                                                </span>
                                                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700', border: '1px solid #bae6fd' }}>
                                                    {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                                                </span>
                                                {booking.status === 'pending' ? (
                                                    <span style={{ background: 'var(--warning-50)', color: 'var(--warning-700)', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', fontWeight: '700', border: '1px solid var(--warning-200)', marginLeft: '8px' }}>
                                                        先生のチェック待ち
                                                    </span>
                                                ) : (
                                                    <span style={{ background: 'var(--success-50)', color: 'var(--success-700)', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', fontWeight: '700', border: '1px solid var(--success-200)', marginLeft: '8px' }}>
                                                        予約できています
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', display: 'block' }}>
                                                👤 話す先生: <strong>{booking.teacher?.name || '担任'} 先生</strong>
                                            </span>
                                            {booking.notes && (
                                                <div style={{ marginTop: 'var(--spacing-2)', padding: 'var(--spacing-2) var(--spacing-3)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', borderLeft: '2px solid var(--border-color)' }}>
                                                    相談したいこと: 「{booking.notes}」
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleCancelBooking(booking.id)}
                                            className={styles.cancelBtn}
                                            style={{ margin: 0, padding: '6px 14px', fontSize: 'var(--font-size-xs)', fontWeight: '600', borderRadius: 'var(--radius-md)', border: '1px solid var(--error-200)', color: 'var(--error-600)', background: '#fff', transition: 'all 0.2s', cursor: 'pointer' }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-50)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                                        >
                                            キャンセルする
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* これまでの面談記録の表示 */}
                    <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-4)' }}>
                            <span style={{ fontSize: '1.4rem' }}>📝</span>
                            <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)' }}>これまでの面談記録</h3>
                        </div>
                        
                        {completedBookings.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-6) 0', color: 'var(--text-tertiary)' }}>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>これまでに完了した面談はありません。</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                {completedBookings.map(booking => (
                                    <div key={booking.id} style={{ padding: 'var(--spacing-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', borderLeft: '5px solid var(--text-tertiary)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                                            <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                {booking.slot_date.replace(/-/g, '/')}
                                            </span>
                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '700', border: '1px solid #cbd5e1' }}>
                                                {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                                            </span>
                                            <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '4px 10px', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', fontWeight: '700', border: '1px solid #e9d5ff', marginLeft: '8px' }}>
                                                実施完了
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                            👤 話した先生: <strong>{booking.teacher?.name || '担任'} 先生</strong>
                                        </span>
                                        {booking.notes && (
                                            <div style={{ marginTop: 'var(--spacing-2)', padding: 'var(--spacing-2) var(--spacing-3)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', borderLeft: '2px solid var(--border-color)' }}>
                                                相談したこと: 「{booking.notes}」
                                            </div>
                                        )}
                                        {booking.discussion_content && (
                                            <div style={{ marginTop: 'var(--spacing-2)', padding: 'var(--spacing-3)', background: '#f8fafc', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', border: '1px solid #e2e8f0' }}>
                                                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>💬 話し合った内容:</strong>
                                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{booking.discussion_content}</p>
                                            </div>
                                        )}
                                        {booking.instructions && (
                                            <div style={{ marginTop: 'var(--spacing-2)', padding: 'var(--spacing-3)', background: '#fffbeb', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', border: '1px solid #fef3c7' }}>
                                                <strong style={{ display: 'block', color: '#b45309', marginBottom: '4px' }}>📌 指示・アドバイス:</strong>
                                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#78350f' }}>{booking.instructions}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 新規面談予約フォーム */}
                    <div style={{ background: 'var(--bg-card)', padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-2)' }}>
                            <span style={{ fontSize: '1.4rem' }}>✨</span>
                            <h3 style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)' }}>新しく相談の予約をする</h3>
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--spacing-6)' }}>
                            先生がつくったスケジュールから、話したい時間をえらんで、予約を送ってください。
                        </p>

                        <form onSubmit={handleBookSlot} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                            
                            {/* 担任教師 固定バッジ表示 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', padding: 'var(--spacing-4)', background: 'linear-gradient(135deg, var(--primary-50), var(--primary-100))', borderRadius: 'var(--radius-lg)', border: '1px solid var(--primary-200)' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-lg)', fontWeight: '700', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
                                    {homeroomTeacher?.name ? homeroomTeacher.name[0] : '師'}
                                </div>
                                <div>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary-700)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                                        👥 話す先生
                                    </span>
                                    <strong style={{ fontSize: 'var(--font-size-md)', color: 'var(--primary-900)' }}>
                                        {homeroomTeacher?.name ? `${homeroomTeacher.name} 先生` : '取得中...'}
                                    </strong>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--primary-700)', marginLeft: 'var(--spacing-2)' }}>
                                        ({session?.className || 'クラス'} 担任)
                                    </span>
                                </div>
                            </div>

                            {/* 曜日別面談可能スケジュール表 */}
                            <div style={{ background: '#f8fafc', padding: 'var(--spacing-5)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-3)' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                                    <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>担任の先生と話せる時間・日にち</strong>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--spacing-4)', marginTop: 0 }}>
                                    曜日ごとの話せる時間と、よやくできる日（これから30日のあいだ）です。<strong>日にちをクリックすると</strong>、下の「話したい日」に自動で入力されます。
                                </p>

                                {scheduleLoading ? (
                                    <div style={{ padding: 'var(--spacing-4) 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)' }}>
                                        しらべています...
                                    </div>
                                ) : (
                                    <div className={styles.scheduleGrid}>
                                        {DAYS_OF_WEEK.map(day => {
                                            const temps = templateMap[day.num] || []
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
                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>いつも話せる時間:</span>
                                                        {temps.length === 0 ? (
                                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>きまっていません</span>
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
                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>よやくできる日:</span>
                                                        {slots.length === 0 ? (
                                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '4px 0' }}>ありません</span>
                                                        ) : (
                                                            <div className={styles.slotsContainer}>
                                                                {slots.map(s => {
                                                                    const isSelected = interviewDate === s.date;
                                                                    return (
                                                                        <button
                                                                            key={s.date}
                                                                            type="button"
                                                                            onClick={() => setInterviewDate(s.date)}
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

                            <div className={styles.formRow3Col} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-4)' }}>
                                <div className={styles.inputGroup}>
                                    <label style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-2)', display: 'block' }}>話したい日 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                    <input 
                                        type="date" 
                                        value={interviewDate}
                                        onChange={(e) => setInterviewDate(e.target.value)}
                                        className={styles.searchInput}
                                        style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', outline: 'none', transition: 'border 0.2s' }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                                    />
                                </div>
                            </div>

                            <div className={styles.inputGroup}>
                                <label style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-2)', display: 'block' }}>あいている時間 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                
                                {interviewLoading ? (
                                    <div style={{ padding: 'var(--spacing-4)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>よやくできる時間を調べています...</div>
                                ) : availableSlots.length === 0 ? (
                                    <div style={{ padding: 'var(--spacing-4)', background: 'var(--error-50)', color: 'var(--error-700)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--error-100)', fontSize: 'var(--font-size-xs)' }}>
                                        ⚠️ えらんだ日には空いている時間がありません。ほかの日をえらんでください。
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
                                        {availableSlots.map(slot => {
                                            const isSelected = selectedSlotId === slot.id;
                                            return (
                                                <button
                                                    key={slot.id}
                                                    type="button"
                                                    onClick={() => setSelectedSlotId(slot.id)}
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: 'var(--radius-md)',
                                                        fontSize: 'var(--font-size-sm)',
                                                        border: isSelected ? '1px solid var(--primary-500)' : '1px solid var(--border-color)',
                                                        background: isSelected ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))' : '#fff',
                                                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                                                        fontWeight: isSelected ? '600' : 'normal',
                                                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none',
                                                        transition: 'all 0.15s ease-in-out',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.borderColor = 'var(--primary-400)';
                                                            e.currentTarget.style.background = 'var(--primary-50)';
                                                            e.currentTarget.style.color = 'var(--primary-700)';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                                            e.currentTarget.style.background = '#fff';
                                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                                        }
                                                    }}
                                                >
                                                    {isSelected && <span>✓</span>}
                                                    {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className={styles.inputGroup}>
                                <label style={{ fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-2)', display: 'block' }}>相談したいこと</label>
                                <textarea 
                                    value={consultNotes}
                                    onChange={(e) => setConsultNotes(e.target.value)}
                                    placeholder="れい：志望理由書のチェック、お金のそうだん、ききたいことなど…"
                                    rows={4}
                                    className={styles.searchInput}
                                    style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', fontSize: 'var(--font-size-sm)', outline: 'none', transition: 'border 0.2s', resize: 'none' }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-500)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={interviewLoading || !selectedSlotId}
                                className={styles.submitBtn}
                                style={{ 
                                    margin: 0, 
                                    alignSelf: 'flex-start',
                                    padding: '12px 28px',
                                    borderRadius: 'var(--radius-lg)',
                                    background: (interviewLoading || !selectedSlotId) ? 'var(--text-tertiary)' : 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                                    color: '#fff',
                                    fontWeight: '700',
                                    fontSize: 'var(--font-size-sm)',
                                    border: 'none',
                                    cursor: (interviewLoading || !selectedSlotId) ? 'not-allowed' : 'pointer',
                                    boxShadow: (interviewLoading || !selectedSlotId) ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {interviewLoading ? '処理中...' : '📅 予約を送る'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ====================================================
                CAREER TAB (進路)
               ==================================================== */}
            {activeTab === 'career' && (
                <div className={styles.tabContent}>
                    {/* Grade lock gate for 1st Year Students */}
                    {!isSecondYear ? (
                        <div className={styles.lockCard}>
                            <div className={styles.lockIcon}>
                                <Lock size={48} color="var(--text-tertiary)" />
                            </div>
                            <h2>進路登録 (2年生専用)</h2>
                            <p className={styles.lockText}>
                                進路登録および関連情報の閲覧機能は、**2年生になってから（2年生のみ）**開放されます。
                            </p>
                            <p className={styles.lockSubText}>
                                1年生の間は基礎学習と学校生活に集中しましょう。進路相談については「面談」タブや直接担任にご相談ください。
                            </p>
                        </div>
                    ) : (
                        <div>
                            {/* Career responses dashboard view */}
                            {!isEditing && data ? (
                                <div className={styles.careerDashboard}>
                                    <div className={styles.dashboardHeader}>
                                        <h2>登録済みの進路希望情報</h2>
                                        <button onClick={startEditing} className={styles.editButton}>
                                            <Edit3 size={16} />
                                            回答を修正する
                                        </button>
                                    </div>
                                    <p className={styles.wizardInstruction}>
                                        わかるところを書いてください。今わからないところは書かなくてもいいです。新しい情報はすぐにアップデートしてください。
                                    </p>

                                    {/* Main Info Grid */}
                                    <div className={styles.infoGrid}>
                                        <div className={styles.infoCard}>
                                            <h3>基本情報</h3>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>クラス:</span>
                                                <span className={styles.infoVal}>{data.class_name}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>名前:</span>
                                                <span className={styles.infoVal}>{data.student_name}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>日本語学校卒業後の予定:</span>
                                                <span className={`${styles.infoVal} ${styles.badge}`}>{data.path_type}</span>
                                            </div>
                                        </div>

                                        {data.path_type === '進学' && (
                                            <div className={styles.infoCard}>
                                                <h3>志望校希望</h3>
                                                {data.first_choice_school && (
                                                    <div className={styles.choiceGroup}>
                                                        <div className={styles.choiceHeader}>1番行きたい学校</div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>行きたい学校の名前:</span>
                                                            <span className={styles.infoVal}>{data.first_choice_school} ({data.first_choice_department})</span>
                                                        </div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>行きたい理由:</span>
                                                            <span className={styles.infoValText}>{data.first_choice_reason}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {data.second_choice_school && (
                                                    <div className={styles.choiceGroup}>
                                                        <div className={styles.choiceHeader}>2番目に行きたい学校</div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>行きたい学校の名前:</span>
                                                            <span className={styles.infoVal}>{data.second_choice_school} ({data.second_choice_department})</span>
                                                        </div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>行きたい理由:</span>
                                                            <span className={styles.infoValText}>{data.second_choice_reason}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                 {data.third_choice_school && (
                                                     <div className={styles.choiceGroup}>
                                                         <div className={styles.choiceHeader}>3番目に行きたい学校</div>
                                                         <div className={styles.infoRow}>
                                                             <span className={styles.infoLabel}>行きたい学校の名前:</span>
                                                             <span className={styles.infoVal}>{data.third_choice_school} ({data.third_choice_department})</span>
                                                         </div>
                                                         {data.third_choice_reason && (
                                                             <div className={styles.infoRow}>
                                                                 <span className={styles.infoLabel}>行きたい理由:</span>
                                                                 <span className={styles.infoValText}>{data.third_choice_reason}</span>
                                                             </div>
                                                         )}
                                                     </div>
                                                 )}
                                            </div>
                                        )}

                                        <div className={styles.infoCard}>
                                            <h3>希望条件 & 確認事項</h3>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>勉強したい専門分野:</span>
                                                <span className={styles.infoVal}>{data.preferred_field || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>進学したい場所:</span>
                                                <span className={styles.infoVal}>{data.preferred_region || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>進学で引っこしできるかどうか:</span>
                                                <span className={styles.infoVal}>{data.can_move === '可' ? 'できる' : data.can_move === '不可' ? 'できない' : data.can_move}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>自分で準備できる1年目の学費:</span>
                                                <span className={styles.infoVal}>{data.tuition_budget ? `${data.tuition_budget}万円` : '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>両親が学費のお金を出せるかどうか:</span>
                                                <span className={styles.infoVal}>
                                                    {data.parent_support === '可' ? '出せる' : data.parent_support === '不可' ? '出せない' : data.parent_support}
                                                    {data.parent_support === '可' && data.parent_support_amount ? ` (1年目の学費で両親が出せるお金: ${data.parent_support_amount}万円)` : ''}
                                                </span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>アルバイトの給料が入る銀行通帳を銀行で使っているかどうか:</span>
                                                <span className={styles.infoVal}>{data.passbook_updated === 'している' ? '使っている' : data.passbook_updated === 'していない' ? '使っていない' : data.passbook_updated}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>日本に来てから今までの全部のアルバイトの給与明細書があるかどうか:</span>
                                                <span className={styles.infoVal}>{data.pay_slips_available === '有' ? 'ある' : data.pay_slips_available === '無' ? 'ない' : data.pay_slips_available}</span>
                                            </div>
                                        </div>

                                        <div className={styles.infoCard}>
                                            <h3>今後のスケジュール & 相談</h3>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>入学試験を受けるだいたいの時期:</span>
                                                <span className={styles.infoVal}>{data.exam_schedule || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>卒業後の予定:</span>
                                                <span className={styles.infoValText}>{data.post_grad_plans || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>クラスの先生に聞きたいこと、心配なこと:</span>
                                                <span className={styles.infoValText}>{data.teacher_questions || '特になし'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : !isEditing && !data ? (
                                <div className={styles.emptyState}>
                                    <Clipboard size={48} color="var(--text-tertiary)" />
                                    <p>進路希望情報が登録されていません。</p>
                                    <button onClick={startEditing} className={styles.addBtn}>
                                        <Plus size={16} />
                                        新規作成
                                    </button>
                                </div>
                            ) : (
                                /* Wizard/Step Form mode */
                                <div className={styles.wizardContainer}>
                                    <div className={styles.wizardHeader}>
                                        <h2>進路希望状況の入力</h2>
                                        <div className={styles.stepProgress}>
                                            <div className={styles.progressBar}>
                                                <div 
                                                    className={styles.progressInner} 
                                                    style={{ width: `${(step / 4) * 100}%` }}
                                                />
                                            </div>
                                            <span className={styles.stepText}>ステップ {step} / 4</span>
                                        </div>
                                    </div>
                                    <p className={styles.wizardInstruction}>
                                        わかるところを書いてください。今わからないところは書かなくてもいいです。新しい情報はすぐにアップデートしてください。
                                    </p>

                                    {error && (
                                        <div className={styles.errorAlert}>
                                            <AlertCircle size={16} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className={styles.wizardForm}>
                                        {/* STEP 1: Basic Info */}
                                        {step === 1 && (
                                            <div className={styles.formStep}>
                                                <h3>1. 基本情報の登録</h3>
                                                <div className={styles.inputGroup}>
                                                    <label>クラス</label>
                                                    <input 
                                                        type="text" 
                                                        value={form.class_name} 
                                                        disabled 
                                                        className={styles.disabledInput}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>名前</label>
                                                    <input 
                                                        type="text" 
                                                        value={form.student_name} 
                                                        disabled 
                                                        className={styles.disabledInput}
                                                    />
                                                </div>
                                                <div className={`${styles.inputGroup} ${careerErrors.includes('path_type') ? styles.inputGroupError : ''}`}>
                                                    <label>日本語学校卒業後の予定 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <select 
                                                        value={form.path_type}
                                                        onChange={(e) => handleFieldChange('path_type', e.target.value)}
                                                        className={styles.selectInput}
                                                    >
                                                        <option value="">選択してください</option>
                                                        <option value="進学">進学</option>
                                                        <option value="就職">就職</option>
                                                        <option value="帰国">帰国</option>
                                                        <option value="そのほか">そのほか</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 2: School Choice (Only for Higher Education / 進学) */}
                                        {step === 2 && form.path_type === '進学' && (
                                            <div className={styles.formStep}>
                                                <h3>2. 志望校</h3>
                                                
                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 1番行きたい学校</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={`${styles.inputGroup} ${careerErrors.includes('first_choice_school') ? styles.inputGroupError : ''}`}>
                                                            <label>行きたい学校の名前 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                            <SchoolAutocomplete
                                                                value={form.first_choice_school}
                                                                onChange={(val) => handleFieldChange('first_choice_school', val)}
                                                                placeholder="例: 神戸国際大学"
                                                            />
                                                        </div>
                                                        <div className={`${styles.inputGroup} ${careerErrors.includes('first_choice_department') ? styles.inputGroupError : ''}`}>
                                                            <label>学部・学科・コースの名前 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                            <input 
                                                                type="text" 
                                                                value={form.first_choice_department}
                                                                onChange={(e) => handleFieldChange('first_choice_department', e.target.value)}
                                                                placeholder="例: 経済学部"
   
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={`${styles.inputGroup} ${careerErrors.includes('first_choice_reason') ? styles.inputGroupError : ''}`}>
                                                        <label>行きたい理由 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                        <textarea 
                                                            value={form.first_choice_reason}
                                                            onChange={(e) => handleFieldChange('first_choice_reason', e.target.value)}
                                                            placeholder="この学校を志望する具体的な理由を記入してください。"
                                                            rows={3}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 2番目に行きたい学校</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>行きたい学校の名前</label>
                                                            <SchoolAutocomplete
                                                                value={form.second_choice_school}
                                                                onChange={(val) => handleFieldChange('second_choice_school', val)}
                                                                placeholder="学校名を入力または選択"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コースの名前</label>
                                                            <input 
                                                                type="text" 
                                                                value={form.second_choice_department}
                                                                onChange={(e) => handleFieldChange('second_choice_department', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>行きたい理由</label>
                                                        <textarea 
                                                            value={form.second_choice_reason}
                                                            onChange={(e) => handleFieldChange('second_choice_reason', e.target.value)}
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 3番目に行きたい学校</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>行きたい学校の名前</label>
                                                            <SchoolAutocomplete
                                                                value={form.third_choice_school}
                                                                onChange={(val) => handleFieldChange('third_choice_school', val)}
                                                                placeholder="学校名を入力または選択"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コースの名前</label>
                                                            <input 
                                                                type="text" 
                                                                value={form.third_choice_department}
                                                                onChange={(e) => handleFieldChange('third_choice_department', e.target.value)}
                                                            />
                                                        </div>
                                                     </div>
                                                     <div className={styles.inputGroup}>
                                                         <label>行きたい理由</label>
                                                         <textarea 
                                                             value={form.third_choice_reason}
                                                             onChange={(e) => handleFieldChange('third_choice_reason', e.target.value)}
                                                             rows={2}
                                                         />
                                                     </div>
                                                 </div>
                                            </div>
                                        )}

                                        {/* STEP 3: Conditions and verifications */}
                                        {step === 3 && (
                                            <div className={styles.formStep}>
                                                <h3>3. 希望条件と確認事項</h3>
                                                
                                                <div className={styles.formRow2Col}>
                                                    <div className={styles.inputGroup}>
                                                        <label>勉強したい専門分野</label>
                                                        <input 
                                                            type="text" 
                                                            value={form.preferred_field}
                                                            onChange={(e) => handleFieldChange('preferred_field', e.target.value)}
                                                            placeholder="例: IT、ビジネス、通訳"
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>進学したい場所</label>
                                                        <input 
                                                            type="text" 
                                                            value={form.preferred_region}
                                                            onChange={(e) => handleFieldChange('preferred_region', e.target.value)}
                                                            placeholder="例: 関西圏、東京"
                                                        />
                                                    </div>
                                                </div>

                                                <div className={`${styles.radioGroup} ${careerErrors.includes('can_move') ? styles.radioGroupError : ''}`}>
                                                    <label>進学で引っこしできるかどうか <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.can_move === '可' ? styles.radioBtnActive : ''}`}
                                                             onClick={() => handleFieldChange('can_move', '可')}
                                                         >できる</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.can_move === '不可' ? styles.radioBtnActive : ''}`}
                                                             onClick={() => handleFieldChange('can_move', '不可')}
                                                         >できない</button>
                                                    </div>
                                                </div>

                                                <h4 className={styles.subStepTitle}>■ 留学維持・進学資金確認</h4>

                                                <div className={styles.inputGroup}>
                                                    <label>自分で準備できる1年目の学費</label>
                                                    <input 
                                                        type="number" 
                                                        value={form.tuition_budget}
                                                        onChange={(e) => handleFieldChange('tuition_budget', e.target.value)}
                                                        placeholder="例: 80万円"
                                                        style={{ width: '200px', display: 'inline-block', marginRight: '8px' }}
                                                    />
                                                    <span>万円</span>
                                                </div>

                                                <div className={`${styles.radioGroup} ${careerErrors.includes('parent_support') ? styles.radioGroupError : ''}`}>
                                                    <label>両親が学費のお金を出せるかどうか <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.parent_support === '可' ? styles.radioBtnActive : ''}`}
                                                             onClick={() => handleFieldChange('parent_support', '可')}
                                                         >出せる</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.parent_support === '不可' ? styles.radioBtnActive : ''}`}
                                                             onClick={() => handleFieldChange('parent_support', '不可')}
                                                         >出せない</button>
                                                    </div>
                                                    {form.parent_support === '可' && (
                                                        <div className={styles.inputGroup} style={{ marginTop: 'var(--spacing-3)' }}>
                                                            <label>1年目の学費で両親が出せるお金</label>
                                                            <input 
                                                                type="number" 
                                                                value={form.parent_support_amount}
                                                                onChange={(e) => handleFieldChange('parent_support_amount', e.target.value)}
                                                                placeholder="例: 60万円"
                                                                style={{ width: '200px', display: 'inline-block', marginRight: '8px' }}
                                                            />
                                                            <span>万円</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={`${styles.radioGroup} ${careerErrors.includes('passbook_updated') ? styles.radioGroupError : ''}`}>
                                                    <label>アルバイトの給料が入る銀行通帳を銀行で使っているかどうか <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.passbook_updated === 'している' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('passbook_updated', 'している')}
                                                        >使っている</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.passbook_updated === 'していない' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('passbook_updated', 'していない')}
                                                        >使っていない</button>
                                                    </div>
                                                </div>

                                                <div className={`${styles.radioGroup} ${careerErrors.includes('pay_slips_available') ? styles.radioGroupError : ''}`}>
                                                    <label>日本に来てから今までの全部のアルバイトの給与明細書があるかどうか <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.pay_slips_available === '有' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('pay_slips_available', '有')}
                                                        >ある</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.pay_slips_available === '無' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('pay_slips_available', '無')}
                                                        >ない</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 4: Schedule and other details */}
                                        {step === 4 && (
                                            <div className={styles.formStep}>
                                                <h3>4. 受験予定・卒業後の予定</h3>

                                                <div className={styles.inputGroup}>
                                                    <label>入学試験を受けるだいたいの時期</label>
                                                    <input 
                                                        type="text" 
                                                        value={form.exam_schedule}
                                                        onChange={(e) => handleFieldChange('exam_schedule', e.target.value)}
                                                        placeholder="例: 2026年10月頃"
                                                    />
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label>進学先（就職先）卒業後の将来の予定</label>
                                                    <textarea 
                                                        value={form.post_grad_plans}
                                                        onChange={(e) => handleFieldChange('post_grad_plans', e.target.value)}
                                                        placeholder="例: 日本でITエンジニアとして就職したい、本国に帰国して日系企業に勤めたいなど。"
                                                        rows={3}
                                                    />
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label>クラスの先生に聞きたいこと、心配なこと</label>
                                                    <textarea 
                                                        value={form.teacher_questions}
                                                        onChange={(e) => handleFieldChange('teacher_questions', e.target.value)}
                                                        placeholder="進路手続きやビザの更新など、不安なことがあれば自由に書いてください。"
                                                        rows={3}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Navigation buttons */}
                                        <div className={styles.formNavigation}>
                                            {step > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={prevStep}
                                                    className={styles.prevBtn}
                                                >
                                                    前へ
                                                </button>
                                            )}
                                            
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setIsEditing(false)
                                                    if (!data) {
                                                        setStep(1)
                                                        setForm({
                                                            class_name: session?.className || '',
                                                            student_name: session?.name || '',
                                                            path_type: '',
                                                            first_choice_school: '',
                                                            first_choice_reason: '',
                                                            first_choice_department: '',
                                                            second_choice_school: '',
                                                            second_choice_reason: '',
                                                            second_choice_department: '',
                                                            third_choice_school: '',
                                                            third_choice_reason: '',
                                                            third_choice_department: '',
                                                            preferred_field: '',
                                                            preferred_region: '',
                                                            can_move: '',
                                                            tuition_budget: '',
                                                            parent_support: '',
                                                            parent_support_amount: '',
                                                            passbook_updated: '',
                                                            pay_slips_available: '',
                                                            exam_schedule: '',
                                                            post_grad_plans: '',
                                                            teacher_questions: ''
                                                        })
                                                    }
                                                    setError(null)
                                                }}
                                                className={styles.cancelBtn}
                                                style={{ marginRight: 'auto' }}
                                            >
                                                キャンセル
                                            </button>

                                            {step < 4 ? (
                                                <button 
                                                    key="next-btn"
                                                    type="button" 
                                                    onClick={nextStep}
                                                    className={styles.nextBtn}
                                                >
                                                    次へ
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
                    )}
                </div>
            )}

            {/* ====================================================
                EXAM TAB (入試予定)
               ==================================================== */}
            {activeTab === 'exam' && (
                <div className={styles.tabContent}>
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
                    {!isEditingExams ? (
                        <div>
                            {examSchedulesList.length === 0 ? (
                                <div className={styles.noDataState}>
                                    <AlertCircle size={36} color="var(--text-tertiary)" />
                                    <p>入試予定情報が登録されていません。</p>
                                    <button onClick={startEditingExams} className={styles.addBtn}>
                                        <Plus size={16} />
                                        新規追加する
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.detailContainer}>
                                    <div className={styles.detailHeaderActions}>
                                        <button onClick={startEditingExams} className={styles.editButton}>
                                            <Edit3 size={16} />
                                            入試予定を修正する
                                        </button>
                                    </div>
                                    
                                    <div className={styles.tableCard} style={{ marginTop: 'var(--spacing-4)' }}>
                                        <div className={styles.tableWrapper}>
                                            <table className={styles.table}>
                                                <thead>
                                                    <tr>
                                                        <th>受験予定校 (学部・学科・コースの名前)</th>
                                                        <th>書類を出す期間</th>
                                                        <th>入学試験の日</th>
                                                        <th>合格/不合格がわかる日</th>
                                                        <th className={styles.textCenter}>合否</th>
                                                        <th className={styles.textCenter}>操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {examSchedulesList.map((schedule, idx) => (
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
                                            {examSchedulesList.map((schedule, idx) => (
                                                <div key={schedule.id || idx} className={styles.examCard}>
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
                                                        <span className={styles.examCardLabel}>書類を出す期間</span>
                                                        <span className={styles.examCardValue}>{schedule.application_period || '-'}</span>
                                                    </div>
                                                    <div className={styles.examCardRow}>
                                                        <span className={styles.examCardLabel}>入学試験の日</span>
                                                        <span className={styles.examCardValue}>{schedule.exam_date || '-'}</span>
                                                    </div>
                                                    <div className={styles.examCardRow}>
                                                        <span className={styles.examCardLabel}>合格/不合格がわかる日</span>
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
                    ) : (
                        /* EDIT MODE */
                        <div className={styles.wizardContainer}>
                            <p className={styles.wizardInstruction}>
                                受験予定の学校について入力・修正してください。
                            </p>

                            <form onSubmit={handleSaveExams} className={styles.wizardForm}>
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
                                                <div className={`${styles.inputGroup} ${examErrors.includes(index) ? styles.inputGroupError : ''}`}>
                                                    <label>入学試験を受ける学校の名前 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <SchoolAutocomplete
                                                        value={item.school_name}
                                                        onChange={(val) => handleExamFieldChange(index, 'school_name', val)}
                                                        placeholder="学校名を入力または選択"
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>学部・学科・コースの名前</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.department_name}
                                                        onChange={(e) => handleExamFieldChange(index, 'department_name', e.target.value)}
                                                        placeholder="例: ビジネス学科"
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.formRow4Col}>
                                                <div className={styles.inputGroup}>
                                                    <label>書類を出す期間</label>
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
                                                    <label>入学試験の日</label>
                                                    <input 
                                                        type="date" 
                                                        value={item.exam_date || ''}
                                                        onChange={(e) => handleExamFieldChange(index, 'exam_date', e.target.value)}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>合格/不合格がわかる日</label>
                                                    <input 
                                                        type="date" 
                                                        value={item.results_date || ''}
                                                        onChange={(e) => handleExamFieldChange(index, 'results_date', e.target.value)}
                                                    />
                                                </div>
                                                <div className={`${styles.inputGroup} ${examErrors.includes(index) && !item.status ? styles.inputGroupError : ''}`}>
                                                    <label>試験の状況 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <select
                                                        value={item.status}
                                                        onChange={(e) => handleExamFieldChange(index, 'status', e.target.value)}
                                                        className={styles.selectInput}
                                                    >
                                                        <option value="">選択してください</option>
                                                        <option value="準備中">準備中</option>
                                                        <option value="試験待ち">試験待ち</option>
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

                                <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-2)' }}>
                                    <button 
                                        type="button" 
                                        onClick={addExamRow}
                                        className={styles.addBtn}
                                    >
                                        <Plus size={16} />
                                        受験校を追加
                                    </button>
                                </div>

                                <div className={styles.formNavigation}>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditingExams(false)}
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
                                        {savingExam ? '保存中...' : '入試予定を保存'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* ====================================================
                SURVEY TAB (入試アンケート)
               ==================================================== */}
            {activeTab === 'survey' && (
                <div className={styles.tabContent}>
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
                            {examSurveysList.length > 0 && (
                                <div className={styles.detailHeaderActions} style={{ marginBottom: 'var(--spacing-4)' }}>
                                    <button onClick={() => startEditingSurvey(null)} className={styles.addBtn}>
                                        <Plus size={16} />
                                        アンケートに回答する
                                    </button>
                                </div>
                            )}

                            {examSurveysList.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <FileText size={48} color="var(--text-tertiary)" />
                                    <p>入試アンケート回答が登録されていません。</p>
                                    <button onClick={() => startEditingSurvey(null)} className={styles.addBtn}>
                                        <Plus size={16} />
                                        アンケートに回答する
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.tableCard}>
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
                                                {examSurveysList.map((survey) => (
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
                                                                    onClick={() => startViewingSurvey(survey)}
                                                                    className={styles.addBtn}
                                                                    style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', marginTop: 0 }}
                                                                >
                                                                    詳細
                                                                </button>
                                                                <button
                                                                    onClick={() => startEditingSurvey(survey)}
                                                                    className={styles.editButton}
                                                                    style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', marginTop: 0 }}
                                                                >
                                                                    修正
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSurvey(survey.id, survey.school_name)}
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
                                    {/* スマホ用カードビュー */}
                                    <div className={styles.examCardList}>
                                        {examSurveysList.map((survey) => (
                                            <div key={survey.id} className={styles.examCard}>
                                                <div className={styles.examCardSchool}>{survey.school_name}</div>
                                                {survey.department_name && (
                                                    <div className={styles.examCardDept}>{survey.department_name}</div>
                                                )}
                                                <div className={styles.examCardRow}>
                                                    <span className={styles.examCardLabel}>種別</span>
                                                    <span className={styles.examCardValue}>{survey.school_type}</span>
                                                </div>
                                                <div className={styles.examCardRow}>
                                                    <span className={styles.examCardLabel}>試験の種類</span>
                                                    <span className={styles.examCardValue}>{survey.exam_type || '-'}</span>
                                                </div>
                                                <div className={styles.examCardRow}>
                                                    <span className={styles.examCardLabel}>試験日</span>
                                                    <span className={styles.examCardValue}>{survey.exam_date || '-'}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => startViewingSurvey(survey)}
                                                        className={styles.editButton}
                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', marginTop: 0 }}
                                                    >
                                                        詳細
                                                    </button>
                                                    <button
                                                        onClick={() => startEditingSurvey(survey)}
                                                        className={styles.editButton}
                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)', marginTop: 0 }}
                                                    >
                                                        修正
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSurvey(survey.id, survey.school_name)}
                                                        className={styles.deleteRowBtn}
                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                        disabled={savingSurvey}
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* モード2: 詳細表示 (view) - モーダルとして表示 */}
                    {surveyModalMode === 'view' && (
                        <div className={styles.modalOverlay} onClick={() => setSurveyModalMode('list')}>
                            <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <h2>アンケート詳細の確認</h2>
                                    <button onClick={() => setSurveyModalMode('list')} className={styles.closeModalBtn}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                    <div className={styles.detailContainer}>
                                        <div className={styles.detailGrid}>
                                            <div className={styles.detailCard}>
                                                <h3>基本情報</h3>
                                                <div className={styles.detailRow}><span className={styles.detailLabel}>試験を受けた学校の種類:</span><span className={styles.detailValue}>{surveyForm.school_type}</span></div>
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
                                                onClick={() => setSurveyModalMode('list')}
                                                className={styles.cancelBtn}
                                            >
                                                閉じる
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* モード3: 編集画面 (edit) - モーダルとして表示 */}
                    {surveyModalMode === 'edit' && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modalContent} style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <h2>
                                        {selectedSurvey ? 'アンケート回答の修正' : '入試アンケートの回答'}
                                        {` - ステップ ${surveyStep} / 5`}
                                    </h2>
                                    <button onClick={() => setSurveyModalMode('list')} className={styles.closeModalBtn} disabled={savingSurvey}>
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                    <form onSubmit={handleSaveSurvey} className={styles.wizardForm}>
                                        {surveyError && (
                                            <div className={styles.errorAlert}>
                                                <AlertCircle size={16} />
                                                <span>{surveyError}</span>
                                            </div>
                                        )}
                                        {/* ステップ1: 基本情報 */}
                                        {surveyStep === 1 && (
                                            <div className={styles.formStep}>
                                                <h3>1. 受験校の基本情報</h3>
                                                
                                                <div className={`${styles.inputGroup} ${surveyErrors.includes('school_type') ? styles.inputGroupError : ''}`}>
                                                    <label>試験を受けた学校の種類 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <select
                                                        value={surveyForm.school_type}
                                                        onChange={(e) => handleSurveyFieldChange('school_type', e.target.value)}
                                                        className={styles.selectInput}
                                                    >
                                                        <option value="">選択してください</option>
                                                        <option value="大学">大学</option>
                                                        <option value="大学院">大学院</option>
                                                        <option value="短大">短大</option>
                                                        <option value="専門学校">専門学校</option>
                                                        <option value="その他">その他</option>
                                                    </select>
                                                </div>

                                                <div className={`${styles.inputGroup} ${surveyErrors.includes('school_name') ? styles.inputGroupError : ''}`}>
                                                    <label>学校名 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <SchoolAutocomplete
                                                        value={surveyForm.school_name}
                                                        onChange={(val) => handleSurveyFieldChange('school_name', val)}
                                                        placeholder="学校名を入力または選択"
                                                    />
                                                </div>

                                                <div className={styles.formRow2Col}>
                                                    <div className={`${styles.inputGroup} ${surveyErrors.includes('department_name') ? styles.inputGroupError : ''}`}>
                                                        <label>学部・学科・コース <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                        <input 
                                                            type="text" 
                                                            value={surveyForm.department_name}
                                                            onChange={(e) => handleSurveyFieldChange('department_name', e.target.value)}
                                                            placeholder="例: グローバルビジネスコース"
                                                        />
                                                    </div>
                                                    <div className={`${styles.inputGroup} ${surveyErrors.includes('exam_type') ? styles.inputGroupError : ''}`}>
                                                        <label>試験の種類 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                         <select
                                                             value={surveyForm.exam_type || ''}
                                                             onChange={(e) => handleSurveyFieldChange('exam_type', e.target.value)}
                                                             className={styles.selectInput}
                                                         >
                                                             <option value="">選択してください</option>
                                                             <option value="指定校推薦入試">指定校推薦入試</option>
                                                             <option value="公募推薦入試">公募推薦入試</option>
                                                             <option value="一般入試">一般入試</option>
                                                             <option value="AO入試">AO入試</option>
                                                             <option value="外国人留学生特別入試">外国人留学生特別入試</option>
                                                             <option value="その他">その他</option>
                                                         </select>
                                                    </div>
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label>試験日</label>
                                                    <input 
                                                        type="date" 
                                                        value={surveyForm.exam_date || ''}
                                                        onChange={(e) => handleSurveyFieldChange('exam_date', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* ステップ2: 作文・小論文 */}
                                        {surveyStep === 2 && (
                                            <div className={styles.formStep}>
                                                <h3>2. 作文・小論文試験</h3>
                                                
                                                <div className={`${styles.radioGroup} ${surveyErrors.includes('essay_exists') ? styles.radioGroupError : ''}`}>
                                                    <label>作文・小論文の試験がありましたか <span style={{ color: 'var(--error-500)' }}>*</span></label>
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
                                                        <div className={`${styles.inputGroup} ${surveyErrors.includes('essay_time') ? styles.inputGroupError : ''}`}>
                                                            <label>試験時間 (分) <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                            <input 
                                                                type="number" 
                                                                value={surveyForm.essay_time}
                                                                onChange={(e) => handleSurveyFieldChange('essay_time', e.target.value)}
                                                                placeholder="例: 60"
                                                            />
                                                        </div>
                                                        <div className={`${styles.inputGroup} ${surveyErrors.includes('essay_theme') ? styles.inputGroupError : ''}`}>
                                                            <label>テーマ <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                            <textarea 
                                                                value={surveyForm.essay_theme}
                                                                onChange={(e) => handleSurveyFieldChange('essay_theme', e.target.value)}
                                                                placeholder="作文・小論文のテーマを書いてください。"
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
                                                
                                                <div className={`${styles.radioGroup} ${surveyErrors.includes('japanese_exists') ? styles.radioGroupError : ''}`}>
                                                    <label>日本語の試験がありましたか <span style={{ color: 'var(--error-500)' }}>*</span></label>
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
                                                        <div className={styles.formRow2Col}>
                                                            <div className={`${styles.inputGroup} ${surveyErrors.includes('japanese_time') ? styles.inputGroupError : ''}`}>
                                                                <label>試験時間 (分) <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                                <input 
                                                                    type="number" 
                                                                    value={surveyForm.japanese_time}
                                                                    onChange={(e) => handleSurveyFieldChange('japanese_time', e.target.value)}
                                                                    placeholder="例: 45"
                                                                />
                                                            </div>
                                                            <div className={`${styles.inputGroup} ${surveyErrors.includes('japanese_level') ? styles.inputGroupError : ''}`}>
                                                                <label>難しさのレベル (目安) <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                                <select
                                                                    value={surveyForm.japanese_level || ''}
                                                                    onChange={(e) => handleSurveyFieldChange('japanese_level', e.target.value)}
                                                                    className={styles.selectInput}
                                                                >
                                                                    <option value="">選択してください</option>
                                                                    <option value="N1">JLPT N1レベル</option>
                                                                    <option value="N2">JLPT N2レベル</option>
                                                                    <option value="N3">JLPT N3レベル</option>
                                                                    <option value="N4">JLPT N4レベル</option>
                                                                    <option value="N5">JLPT N5レベル</option>
                                                                    <option value="その他">その他・独自の試験</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className={`${styles.inputGroup} ${surveyErrors.includes('japanese_content') ? styles.inputGroupError : ''}`}>
                                                            <label>日本語の試験の内容 (あったものはすべて選んでください)</label>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-2)' }}>
                                                                {['漢字', '語彙', '文法', '読解', '聴解', '(短)作文', 'その他'].map(item => {
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
                                                
                                                <div className={`${styles.radioGroup} ${surveyErrors.includes('interview_exists') ? styles.radioGroupError : ''}`}>
                                                    <label>面接がありましたか <span style={{ color: 'var(--error-500)' }}>*</span></label>
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
                                                        <div className={styles.formRow3Col}>
                                                            <div className={`${styles.inputGroup} ${surveyErrors.includes('interview_time') ? styles.inputGroupError : ''}`}>
                                                                <label>面接時間 (分) <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                                <input 
                                                                    type="number" 
                                                                    value={surveyForm.interview_time}
                                                                    onChange={(e) => handleSurveyFieldChange('interview_time', e.target.value)}
                                                                    placeholder="例: 15"
                                                                />
                                                            </div>
                                                            <div className={`${styles.inputGroup} ${surveyErrors.includes('interview_teachers') ? styles.inputGroupError : ''}`}>
                                                                <label>面接の先生の人数 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                                <input 
                                                                    type="number" 
                                                                    value={surveyForm.interview_teachers}
                                                                    onChange={(e) => handleSurveyFieldChange('interview_teachers', e.target.value)}
                                                                    placeholder="例: 2"
                                                                />
                                                            </div>
                                                            <div className={`${styles.inputGroup} ${surveyErrors.includes('interview_students') ? styles.inputGroupError : ''}`}>
                                                                <label>一緒に面接を受けた学生の人数 (自分も入れる) <span style={{ color: 'var(--error-500)' }}>*</span></label>
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
                                                            <div className={`${styles.inputGroup} ${surveyErrors.includes('interview_question_1') ? styles.inputGroupError : ''}`}>
                                                                <label style={{ fontSize: 'var(--font-size-xs)' }}>質問① <span style={{ color: 'var(--error-500)' }}>*</span></label>
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

                                        {/* ステップ5: その他試験・アドバイス */}
                                        {surveyStep === 5 && (
                                            <div className={styles.formStep}>
                                                <h3>5. その他試験とアドバイス</h3>
                                                
                                                <div className={styles.radioGroup}>
                                                    <label>作文・小論文・日本語・面接のほかに試験がありましたか</label>
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
                                                            <label>どんな試験でしたか (英語、数学、など)</label>
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
                                                    <label>これから、この学校の試験を受ける学生に、アドバイスや準備したほうがいいことを書いてください</label>
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
                                                    onClick={prevSurveyStep}
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
                                                    onClick={nextSurveyStep}
                                                    className={styles.nextBtn}
                                                    disabled={savingSurvey}
                                                >
                                                    次へ
                                                </button>
                                            ) : (
                                                <button 
                                                    key="survey-save-btn"
                                                    type="submit" 
                                                    className={styles.submitBtn}
                                                    disabled={savingSurvey}
                                                >
                                                    <Save size={16} />
                                                    {savingSurvey ? '保存中...' : '登録する'}
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
