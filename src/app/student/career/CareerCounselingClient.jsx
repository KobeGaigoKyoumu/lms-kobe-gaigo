'use client'

import { useState } from 'react'
import { saveStudentCareerInfo, saveStudentExamSchedules, saveStudentExamSurvey, deleteStudentExamSurvey } from '@/app/actions/career'
import { BookOpen, Clipboard, Calendar, HelpCircle, ChevronRight, ChevronLeft, Save, Edit3, Lock, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react'
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

export default function CareerCounselingClient({ initialData, initialExamSchedules, initialExamSurveys, isSecondYear, session }) {
    const [activeTab, setActiveTab] = useState(isSecondYear ? 'career' : 'interview') // 2nd year default is career, 1st year default is interview
    const [data, setData] = useState(initialData || null)
    const [isEditing, setIsEditing] = useState(!initialData)
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    // Exam schedules states
    const [examSchedules, setExamSchedules] = useState(initialExamSchedules || [])
    const [isEditingExam, setIsEditingExam] = useState(false)
    const [examFormList, setExamFormList] = useState([])
    const [savingExam, setSavingExam] = useState(false)
    const [examError, setExamError] = useState(null)

    // Exam surveys states
    const [examSurveys, setExamSurveys] = useState(initialExamSurveys || [])
    const [isEditingSurvey, setIsEditingSurvey] = useState(false)
    const [isViewingSurvey, setIsViewingSurvey] = useState(false)
    const [surveyModalMode, setSurveyModalMode] = useState('add') // 'add', 'edit', 'view'
    const [surveyStep, setSurveyStep] = useState(1)
    const [savingSurvey, setSavingSurvey] = useState(false)
    const [surveyError, setSurveyError] = useState(null)
    const [selectedSurveyId, setSelectedSurveyId] = useState(null)

    const initialSurveyForm = {
        class_name: session?.className || '',
        student_name: session?.name || '',
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

    const [surveyForm, setSurveyForm] = useState(initialSurveyForm)

    // 入試アンケートの新規作成・編集・確認用インラインハンドラー
    const handleOpenSurveyModal = (mode, survey = null) => {
        setSurveyModalMode(mode)
        setSurveyStep(1)
        setSurveyError(null)
        
        if (mode === 'add') {
            setSurveyForm({
                ...initialSurveyForm,
                class_name: session?.className || '',
                student_name: session?.name || ''
            })
            setSelectedSurveyId(null)
            setIsEditingSurvey(true)
            setIsViewingSurvey(false)
        } else if (mode === 'edit' && survey) {
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
            setIsEditingSurvey(true)
            setIsViewingSurvey(false)
        } else if (mode === 'view' && survey) {
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
            setIsViewingSurvey(true)
            setIsEditingSurvey(false)
        }
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

    const handleSaveSurvey = async (e) => {
        e.preventDefault()
        
        if (surveyStep < 5) {
            // ステップ進行
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
                japanese_content: JSON.stringify(surveyForm.japanese_content || [])
            }
            
            const res = await saveStudentExamSurvey(payload)
            if (res.success) {
                window.location.reload()
            } else {
                setSurveyError(res.error || '保存に失敗しました。')
                setSavingSurvey(false)
            }
        } catch (err) {
            console.error(err)
            setSurveyError('通信エラーが発生しました。')
            setSavingSurvey(false)
        }
    }

    const handleDeleteSurvey = async (surveyId, schoolName) => {
        const isConfirmed = window.confirm(`この「${schoolName}」の入試アンケート回答を削除してもよろしいですか？\n削除すると元に戻せません。`)
        if (!isConfirmed) return
        
        setSavingSurvey(true)
        try {
            const res = await deleteStudentExamSurvey(surveyId)
            if (res.success) {
                window.location.reload()
            } else {
                alert(res.error || '削除に失敗しました。')
            }
        } catch (err) {
            console.error(err)
            alert('通信エラーが発生しました。')
        } finally {
            setSavingSurvey(false)
        }
    }

    const startEditingExam = () => {
        if (examSchedules.length === 0) {
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
            setExamFormList(examSchedules.map(s => {
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
        setIsEditingExam(true)
        setExamError(null)
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

    const handleSaveExam = async (e) => {
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
            const res = await saveStudentExamSchedules(session.studentId, validSchedules)
            if (res.success) {
                setExamSchedules(validSchedules)
                setIsEditingExam(false)
            } else {
                setExamError(res.error || '保存に失敗しました。')
            }
        } catch (err) {
            console.error(err)
            setExamError('通信エラーが発生しました。')
        } finally {
            setSavingExam(false)
        }
    }

    const handleDeleteExam = async (index) => {
        const scheduleToDelete = examSchedules[index]
        if (!scheduleToDelete) return

        const isConfirmed = window.confirm(`この入試予定（${scheduleToDelete.school_name}）を削除してもよろしいですか？`)
        if (!isConfirmed) return

        const updatedSchedules = examSchedules.filter((_, i) => i !== index)

        setSavingExam(true)
        setExamError(null)
        try {
            const res = await saveStudentExamSchedules(session.studentId, updatedSchedules)
            if (res.success) {
                setExamSchedules(updatedSchedules)
            } else {
                setExamError(res.error || '削除に失敗しました。')
            }
        } catch (err) {
            console.error(err)
            setExamError('通信エラーが発生しました。')
        } finally {
            setSavingExam(false)
        }
    }

    // Form states matching Excel questionnaire
    const [form, setForm] = useState({
        class_name: initialData?.class_name || session?.className || '',
        student_name: initialData?.student_name || session?.name || '',
        path_type: initialData?.path_type || '進学',
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
        can_move: initialData?.can_move || '可',
        tuition_budget: initialData?.tuition_budget || '',
        parent_support: initialData?.parent_support || '可',
        parent_support_amount: initialData?.parent_support_amount || '',
        passbook_updated: initialData?.passbook_updated || 'している',
        pay_slips_available: initialData?.pay_slips_available || '有',
        exam_schedule: initialData?.exam_schedule || '',
        post_grad_plans: initialData?.post_grad_plans || '',
        teacher_questions: initialData?.teacher_questions || ''
    })

    const handleFieldChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const nextStep = () => {
        // Skip step 2 if not pursuing higher education (進学)
        if (step === 1 && form.path_type !== '進学') {
            setStep(3)
        } else {
            setStep(prev => prev + 1)
        }
    }

    const prevStep = () => {
        if (step === 3 && form.path_type !== '進学') {
            setStep(1)
        } else {
            setStep(prev => prev - 1)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
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
            path_type: data?.path_type || '進学',
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
            can_move: data?.can_move || '可',
            tuition_budget: data?.tuition_budget || '',
            parent_support: data?.parent_support || '可',
            parent_support_amount: data?.parent_support_amount || '',
            passbook_updated: data?.passbook_updated || 'している',
            pay_slips_available: data?.pay_slips_available || '有',
            exam_schedule: data?.exam_schedule || '',
            post_grad_plans: data?.post_grad_plans || '',
            teacher_questions: data?.teacher_questions || ''
        })
        setIsEditing(true)
        setStep(1)
    }

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
                {isSecondYear && (
                    <button
                        onClick={() => setActiveTab('exam')}
                        className={`${styles.tabButton} ${activeTab === 'exam' ? styles.tabButtonActive : ''}`}
                    >
                        入試予定
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('survey')}
                    className={`${styles.tabButton} ${activeTab === 'survey' ? styles.tabButtonActive : ''}`}
                >
                    入試アンケート
                </button>
            </div>

            {/* ====================================================
                INTERVIEW TAB (面談)
               ==================================================== */}
            {activeTab === 'interview' && (
                <div className={styles.tabContent}>
                    <div className={styles.noticeCard}>
                        <div className={styles.noticeIcon}>
                            <Calendar size={48} color="var(--primary-600)" />
                        </div>
                        <h2>面談機能について</h2>
                        <p className={styles.noticeText}>
                            現在、面談の予約調整や面談履歴の確認機能は準備中です。
                        </p>
                        <p className={styles.noticeSubText}>
                            面談の日程や詳細については、担任教員からの個別連絡または掲示板のお知らせをお待ちください。
                        </p>
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
                                        現在の状況をわかる範囲で記入。分からない所は空欄でもOK。情報に変更があり次第、即座に変更した情報を記入。
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
                                                <span className={styles.infoLabel}>希望進路:</span>
                                                <span className={`${styles.infoVal} ${styles.badge}`}>{data.path_type}</span>
                                            </div>
                                        </div>

                                        {data.path_type === '進学' && (
                                            <div className={styles.infoCard}>
                                                <h3>志望校希望</h3>
                                                {data.first_choice_school && (
                                                    <div className={styles.choiceGroup}>
                                                        <div className={styles.choiceHeader}>第一志望</div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>学校名:</span>
                                                            <span className={styles.infoVal}>{data.first_choice_school} ({data.first_choice_department})</span>
                                                        </div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>志望理由:</span>
                                                            <span className={styles.infoValText}>{data.first_choice_reason}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {data.second_choice_school && (
                                                    <div className={styles.choiceGroup}>
                                                        <div className={styles.choiceHeader}>第二志望</div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>学校名:</span>
                                                            <span className={styles.infoVal}>{data.second_choice_school} ({data.second_choice_department})</span>
                                                        </div>
                                                        <div className={styles.infoRow}>
                                                            <span className={styles.infoLabel}>志望理由:</span>
                                                            <span className={styles.infoValText}>{data.second_choice_reason}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className={styles.infoCard}>
                                            <h3>希望条件 & 確認事項</h3>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>希望分野:</span>
                                                <span className={styles.infoVal}>{data.preferred_field || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>希望地域:</span>
                                                <span className={styles.infoVal}>{data.preferred_region || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>引っ越し可否:</span>
                                                <span className={styles.infoVal}>{data.can_move}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>学費準備可能額:</span>
                                                <span className={styles.infoVal}>{data.tuition_budget ? `${data.tuition_budget}万円` : '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>両親の援助:</span>
                                                <span className={styles.infoVal}>
                                                    {data.parent_support}
                                                    {data.parent_support === '可' && data.parent_support_amount ? ` (年額: ${data.parent_support_amount}万円)` : ''}
                                                </span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>通帳の定期記帳:</span>
                                                <span className={styles.infoVal}>{data.passbook_updated}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>給与明細保管:</span>
                                                <span className={styles.infoVal}>{data.pay_slips_available}</span>
                                            </div>
                                        </div>

                                        <div className={styles.infoCard}>
                                            <h3>今後のスケジュール & 相談</h3>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>受験予定時期:</span>
                                                <span className={styles.infoVal}>{data.exam_schedule || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>卒業後の予定:</span>
                                                <span className={styles.infoValText}>{data.post_grad_plans || '未記入'}</span>
                                            </div>
                                            <div className={styles.infoRow}>
                                                <span className={styles.infoLabel}>担任への相談事項:</span>
                                                <span className={styles.infoValText}>{data.teacher_questions || '特になし'}</span>
                                            </div>
                                        </div>
                                    </div>
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
                                        現在の状況をわかる範囲で記入。分からない所は空欄でもOK。情報に変更があり次第、即座に変更した情報を記入。
                                    </p>

                                    {error && <div className={styles.errorAlert}>{error}</div>}

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
                                                    <label>氏名</label>
                                                    <input 
                                                        type="text" 
                                                        value={form.student_name} 
                                                        disabled 
                                                        className={styles.disabledInput}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>希望する進路区分</label>
                                                    <select 
                                                        value={form.path_type}
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

                                        {/* STEP 2: School Choice (Only for Higher Education / 進学) */}
                                        {step === 2 && form.path_type === '進学' && (
                                            <div className={styles.formStep}>
                                                <h3>2. 志望校の希望</h3>
                                                
                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 第一志望</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>志望校名</label>
                                                            <SchoolAutocomplete 
                                                                value={form.first_choice_school}
                                                                onChange={(val) => handleFieldChange('first_choice_school', val)}
                                                                placeholder="例: 神戸国際大学"
                                                                required
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コース</label>
                                                            <input 
                                                                type="text" 
                                                                value={form.first_choice_department}
                                                                onChange={(e) => handleFieldChange('first_choice_department', e.target.value)}
                                                                placeholder="例: 経済学部"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>志望理由</label>
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
                                                    <h4>■ 第二志望</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>志望校名</label>
                                                            <SchoolAutocomplete 
                                                                value={form.second_choice_school}
                                                                onChange={(val) => handleFieldChange('second_choice_school', val)}
                                                                placeholder="第二志望校名を入力（任意）"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コース</label>
                                                            <input 
                                                                type="text" 
                                                                value={form.second_choice_department}
                                                                onChange={(e) => handleFieldChange('second_choice_department', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>志望理由</label>
                                                        <textarea 
                                                            value={form.second_choice_reason}
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
                                                                value={form.third_choice_school}
                                                                onChange={(val) => handleFieldChange('third_choice_school', val)}
                                                                placeholder="第三志望校名を入力（任意）"
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コース</label>
                                                            <input 
                                                                type="text" 
                                                                value={form.third_choice_department}
                                                                onChange={(e) => handleFieldChange('third_choice_department', e.target.value)}
                                                            />
                                                        </div>
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
                                                        <label>希望分野</label>
                                                        <input 
                                                            type="text" 
                                                            value={form.preferred_field}
                                                            onChange={(e) => handleFieldChange('preferred_field', e.target.value)}
                                                            placeholder="例: IT、ビジネス、通訳"
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>希望地域</label>
                                                        <input 
                                                            type="text" 
                                                            value={form.preferred_region}
                                                            onChange={(e) => handleFieldChange('preferred_region', e.target.value)}
                                                            placeholder="例: 関西圏、東京"
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.radioGroup}>
                                                    <label>進路決定に伴う引っ越しの可否</label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.can_move === '可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('can_move', '可')}
                                                        >可</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.can_move === '不可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('can_move', '不可')}
                                                        >不可</button>
                                                    </div>
                                                </div>

                                                <h4 className={styles.subStepTitle}>■ 留学維持・進学資金確認</h4>

                                                <div className={styles.inputGroup}>
                                                    <label>自己準備可能な学費予算額 (年間)</label>
                                                    <input 
                                                        type="number" 
                                                        value={form.tuition_budget}
                                                        onChange={(e) => handleFieldChange('tuition_budget', e.target.value)}
                                                        placeholder="金額を万円単位で入力 (例: 80)"
                                                        style={{ width: '200px', display: 'inline-block', marginRight: '8px' }}
                                                    />
                                                    <span>万円</span>
                                                </div>

                                                <div className={styles.radioGroup}>
                                                    <label>両親による学費の支援</label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.parent_support === '可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('parent_support', '可')}
                                                        >可</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.parent_support === '不可' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('parent_support', '不可')}
                                                        >不可</button>
                                                    </div>
                                                    {form.parent_support === '可' && (
                                                        <div className={styles.inputGroup} style={{ marginTop: 'var(--spacing-3)' }}>
                                                            <label>仕送り支援額 (年額)</label>
                                                            <input 
                                                                type="number" 
                                                                value={form.parent_support_amount}
                                                                onChange={(e) => handleFieldChange('parent_support_amount', e.target.value)}
                                                                placeholder="金額を万円単位で入力 (例: 60)"
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
                                                            className={`${styles.radioBtn} ${form.passbook_updated === 'している' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('passbook_updated', 'している')}
                                                        >している</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.passbook_updated === 'していない' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('passbook_updated', 'していない')}
                                                        >していない</button>
                                                    </div>
                                                </div>

                                                <div className={styles.radioGroup}>
                                                    <label>全アルバイト履歴の給与明細書の保管</label>
                                                    <div className={styles.radioOptions}>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.pay_slips_available === '有' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('pay_slips_available', '有')}
                                                        >有</button>
                                                        <button 
                                                            type="button" 
                                                            className={`${styles.radioBtn} ${form.pay_slips_available === '無' ? styles.radioBtnActive : ''}`}
                                                            onClick={() => handleFieldChange('pay_slips_available', '無')}
                                                        >無</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STEP 4: Schedule and other details */}
                                        {step === 4 && (
                                            <div className={styles.formStep}>
                                                <h3>4. 受験予定・卒業後の予定</h3>

                                                <div className={styles.inputGroup}>
                                                    <label>受験予定時期</label>
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
                                                    <label>担任に聞きたいこと・心配事</label>
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
                                                    <ChevronLeft size={16} />
                                                    前へ
                                                </button>
                                            )}
                                            
                                            {/* Cancel/Back button if we had data previously */}
                                            {step === 1 && data && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsEditing(false)}
                                                    className={styles.cancelBtn}
                                                >
                                                    戻る
                                                </button>
                                            )}

                                            {step < 4 ? (
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
                    )}
                </div>
            )}

            {/* ====================================================
                EXAM SCHEDULE TAB (入試予定)
               ==================================================== */}
            {activeTab === 'exam' && isSecondYear && (
                <div className={styles.tabContent}>
                    {!isEditingExam ? (
                        <div>
                            {examSchedules.length === 0 ? (
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeIcon}>
                                        <Clipboard size={48} color="var(--primary-600)" />
                                    </div>
                                    <h2>登録済みの入試予定情報はありません</h2>
                                    <p className={styles.noticeText}>
                                        受験予定の学校・学部学科コース、出願期間、入試日、合否発表日、および合否結果を登録してください。
                                    </p>
                                    <button onClick={startEditingExam} className={styles.submitBtn} style={{ marginTop: 'var(--spacing-4)' }}>
                                        <Plus size={16} />
                                        入試予定を登録する
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.careerDashboard}>
                                    <div className={styles.dashboardHeader}>
                                        <h2>登録済みの入試予定一覧</h2>
                                        <button onClick={startEditingExam} className={styles.editButton}>
                                            <Edit3 size={16} />
                                            予定を修正する
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
                                                    {examSchedules.map((schedule, idx) => (
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
                                            {examSchedules.map((schedule, idx) => (
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
                    ) : (
                        <div className={styles.wizardContainer}>
                            <div className={styles.wizardHeader}>
                                <h2>入試予定の入力・編集</h2>
                            </div>
                            <p className={styles.wizardInstruction}>
                                受験する予定の学校・学部学科コースについて入力してください。合否結果が分かり次第、随時更新してください。
                            </p>

                            {examError && (
                                <div className={styles.errorAlert} style={{ marginBottom: 'var(--spacing-4)' }}>
                                    <AlertCircle size={16} />
                                    <span>{examError}</span>
                                </div>
                            )}

                            <form onSubmit={handleSaveExam} className={styles.wizardForm}>
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
                                                        onChange={(val) => handleExamFieldChange(index, 'school_name', val)}
                                                        placeholder="受験予定校を入力してください"
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
                                        onClick={() => setIsEditingExam(false)}
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
                                        {savingExam ? '保存中...' : '予定を保存する'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* ====================================================
                EXAM SURVEY TAB (入試アンケート)
               ==================================================== */}
            {activeTab === 'survey' && (
                <div className={styles.tabContent}>
                    {isViewingSurvey ? (
                        /* 詳細確認画面のインライン表示 */
                        <div className={styles.wizardContainer}>
                            <div className={styles.wizardHeader}>
                                <h2>入試アンケート回答詳細</h2>
                            </div>
                            <p className={styles.wizardInstruction} style={{ marginBottom: 'var(--spacing-4)' }}>
                                回答されたアンケートの内容です。
                            </p>
                            
                            <div className={styles.detailContainer}>
                                <div className={styles.infoGrid}>
                                    <div className={styles.infoCard}>
                                        <h3>基本情報</h3>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>受験した学校の種別:</span><span className={styles.infoVal}>{surveyForm.school_type}</span></div>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>受験した学校の名前:</span><span className={styles.infoVal}>{surveyForm.school_name}</span></div>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>試験を受けた日:</span><span className={styles.infoVal}>{surveyForm.exam_date || '-'}</span></div>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>学部、学科、コース:</span><span className={styles.infoVal}>{surveyForm.department_name || '-'}</span></div>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>試験の種類:</span><span className={styles.infoVal}>{surveyForm.exam_type || '-'}</span></div>
                                    </div>

                                    <div className={styles.infoCard}>
                                        <h3>作文・小論文</h3>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>試験の有無:</span><span className={styles.infoVal}>{surveyForm.essay_exists}</span></div>
                                        {surveyForm.essay_exists === 'あり' && (
                                            <>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>試験時間:</span><span className={styles.infoVal}>{surveyForm.essay_time ? `${surveyForm.essay_time}分` : '-'}</span></div>
                                                <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                    <span className={styles.infoLabel}>テーマ:</span>
                                                    <span className={styles.infoValText}>{surveyForm.essay_theme || '-'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className={styles.infoCard}>
                                        <h3>日本語の試験</h3>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>試験の有無:</span><span className={styles.infoVal}>{surveyForm.japanese_exists}</span></div>
                                        {surveyForm.japanese_exists === 'あり' && (
                                            <>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>試験時間:</span><span className={styles.infoVal}>{surveyForm.japanese_time ? `${surveyForm.japanese_time}分` : '-'}</span></div>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>試験レベル:</span><span className={styles.infoVal}>{surveyForm.japanese_level || '-'}</span></div>
                                                <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                    <span className={styles.infoLabel}>試験内容:</span>
                                                    <span className={styles.infoValText}>{(surveyForm.japanese_content || []).join(', ') || '-'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className={styles.infoCard}>
                                        <h3>面接試験</h3>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>面接の有無:</span><span className={styles.infoVal}>{surveyForm.interview_exists}</span></div>
                                        {surveyForm.interview_exists === 'あり' && (
                                            <>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>面接時間:</span><span className={styles.infoVal}>{surveyForm.interview_time ? `${surveyForm.interview_time}分` : '-'}</span></div>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>面接官の人数:</span><span className={styles.infoVal}>{surveyForm.interview_teachers ? `${surveyForm.interview_teachers}人` : '-'}</span></div>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>同室の学生数:</span><span className={styles.infoVal}>{surveyForm.interview_students ? `${surveyForm.interview_students}人` : '-'}</span></div>
                                                <div className={styles.choiceGroup}>
                                                    <div className={styles.choiceHeader}>質問された内容</div>
                                                    {surveyForm.interview_question_1 && (
                                                        <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                            <span className={styles.infoLabel}>質問①:</span>
                                                            <span className={styles.infoValText}>{surveyForm.interview_question_1}</span>
                                                        </div>
                                                    )}
                                                    {surveyForm.interview_question_2 && (
                                                        <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                            <span className={styles.infoLabel}>質問②:</span>
                                                            <span className={styles.infoValText}>{surveyForm.interview_question_2}</span>
                                                        </div>
                                                    )}
                                                    {surveyForm.interview_question_3 && (
                                                        <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                            <span className={styles.infoLabel}>質問③:</span>
                                                            <span className={styles.infoValText}>{surveyForm.interview_question_3}</span>
                                                        </div>
                                                    )}
                                                    {surveyForm.interview_question_4 && (
                                                        <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                            <span className={styles.infoLabel}>質問④:</span>
                                                            <span className={styles.infoValText}>{surveyForm.interview_question_4}</span>
                                                        </div>
                                                    )}
                                                    {surveyForm.interview_question_5 && (
                                                        <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                                            <span className={styles.infoLabel}>質問⑤:</span>
                                                            <span className={styles.infoValText}>{surveyForm.interview_question_5}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className={styles.infoCard}>
                                        <h3>その他・アドバイス</h3>
                                        <div className={styles.infoRow}><span className={styles.infoLabel}>その他の試験:</span><span className={styles.infoVal}>{surveyForm.other_exam_exists}</span></div>
                                        {surveyForm.other_exam_exists === 'あり' && (
                                            <>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>試験内容:</span><span className={styles.infoVal}>{surveyForm.other_exam_content || '-'}</span></div>
                                                <div className={styles.infoRow}><span className={styles.infoLabel}>試験時間:</span><span className={styles.infoVal}>{surveyForm.other_exam_time ? `${surveyForm.other_exam_time}分` : '-'}</span></div>
                                            </>
                                        )}
                                        <div className={styles.infoRow} style={{ marginTop: 'var(--spacing-3)', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--spacing-1)' }}>
                                            <span className={styles.infoLabel}>後輩へのアドバイス:</span>
                                            <span className={styles.infoValText}>{surveyForm.advice || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.formNavigation} style={{ marginTop: 'var(--spacing-4)' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsViewingSurvey(false)}
                                        className={styles.cancelBtn}
                                    >
                                        一覧へ戻る
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : isEditingSurvey ? (
                        /* 入力・編集フォームのインライン表示 */
                        <div className={styles.wizardContainer}>
                            <div className={styles.wizardHeader}>
                                <h2>{surveyModalMode === 'edit' ? '入試アンケートの修正' : '入試アンケートの入力'}</h2>
                                <div className={styles.stepProgress}>
                                    <div className={styles.progressBar}>
                                        <div 
                                            className={styles.progressInner} 
                                            style={{ width: `${(surveyStep / 5) * 100}%` }}
                                        />
                                    </div>
                                    <span className={styles.stepText}>ステップ {surveyStep} / 5</span>
                                </div>
                            </div>
                            <p className={styles.wizardInstruction}>
                                現在の状況をわかる範囲で記入。分からない所は空欄でもOK。情報に変更があり次第、即座に変更した情報を記入。
                            </p>

                            {surveyError && <div className={styles.errorAlert}>{surveyError}</div>}

                            <form onSubmit={(e) => e.preventDefault()} className={styles.wizardForm}>
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
                                        <h3>2. 作文・小論文の試験</h3>
                                        
                                        <div className={styles.radioGroup}>
                                            <label>作文、小論文の試験がありましたか</label>
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
                                                    <label>作文・小論文のテーマを書いてください</label>
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
                                        <h3>3. 日本語の試験</h3>
                                        
                                        <div className={styles.radioGroup}>
                                            <label>日本語の試験がありましたか</label>
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
                                                    <label>日本語の試験の内容 (該当するものをすべて選択)</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-2)' }}>
                                                        {['漢字', '語彙', '文法', '読解', '聴解', '記述', 'その他'].map(item => {
                                                            const isChecked = (surveyForm.japanese_content || []).includes(item)
                                                            return (
                                                                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', cursor: 'pointer' }}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={isChecked}
                                                                        onChange={(e) => handleSurveyCheckboxChange(item, e.target.checked)}
                                                                        style={{ width: 'auto', marginRight: 'var(--spacing-1)' }}
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
                                                    <label style={{ fontWeight: '600' }}>どんな質問をされましたか？ (覚えている質問を記入)</label>
                                                    <div className={styles.inputGroup}>
                                                        <label style={{ fontSize: 'var(--font-size-xs)' }}>質問①</label>
                                                        <input 
                                                            type="text" 
                                                            value={surveyForm.interview_question_1}
                                                            onChange={(e) => handleSurveyFieldChange('interview_question_1', e.target.value)}
                                                            placeholder="例: 志望理由を聞かれました"
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label style={{ fontSize: 'var(--font-size-xs)' }}>質問②</label>
                                                        <input 
                                                            type="text" 
                                                            value={surveyForm.interview_question_2}
                                                            onChange={(e) => handleSurveyFieldChange('interview_question_2', e.target.value)}
                                                            placeholder="例: 将来の夢は何ですか"
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
                                            <label>その他に試験（筆記・実技など）がありましたか</label>
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
                                                        placeholder="例: 数学の基礎試験"
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>試験時間 (分)</label>
                                                    <input 
                                                        type="number" 
                                                        value={surveyForm.other_exam_time}
                                                        onChange={(e) => handleSurveyFieldChange('other_exam_time', e.target.value)}
                                                        placeholder="例: 30"
                                                        style={{ width: '150px' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className={styles.inputGroup} style={{ marginTop: 'var(--spacing-4)' }}>
                                            <label>次に受験する学生に、アドバイスや準備したほうがいいことを書いてください</label>
                                            <textarea 
                                                value={surveyForm.advice}
                                                onChange={(e) => handleSurveyFieldChange('advice', e.target.value)}
                                                placeholder="面接の練習のコツ、準備すべきこと、当日注意すべきことなど後輩へのメッセージをお願いします。"
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
                                        onClick={() => setIsEditingSurvey(false)}
                                        className={styles.cancelBtn}
                                        disabled={savingSurvey}
                                        style={{ marginRight: 'auto' }}
                                    >
                                        キャンセル
                                    </button>

                                    <button 
                                        key="survey-submit-next-btn"
                                        type="button" 
                                        onClick={surveyStep < 5 ? () => setSurveyStep(prev => prev + 1) : handleSaveSurvey}
                                        className={surveyStep < 5 ? styles.nextBtn : styles.submitBtn}
                                        disabled={savingSurvey}
                                    >
                                        {surveyStep < 5 ? (
                                            '次へ'
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                {savingSurvey ? '保存中...' : '登録する'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* 回答一覧のインライン表示 */
                        <div className={styles.careerDashboard}>
                            <div className={styles.dashboardHeader}>
                                <h2>入試アンケート回答一覧</h2>
                                <button 
                                    onClick={() => handleOpenSurveyModal('add')} 
                                    className={styles.submitBtn}
                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}
                                >
                                    <Plus size={16} />
                                    新規回答する
                                </button>
                            </div>
                            <p className={styles.wizardInstruction} style={{ marginBottom: 'var(--spacing-4)' }}>
                                受験が終わったあと、すぐにアンケートに答えてください。複数の学校・試験について何回でも回答できます。
                            </p>

                            {examSurveys.length === 0 ? (
                                <div className={styles.noticeCard}>
                                    <div className={styles.noticeIcon}>
                                        <Clipboard size={48} color="var(--primary-600)" />
                                    </div>
                                    <h2>未回答</h2>
                                    <p className={styles.noticeText}>
                                        登録済みの入試アンケートはありません。受験された学校についてアンケートに回答してください。
                                    </p>
                                    <button 
                                        onClick={() => handleOpenSurveyModal('add')} 
                                        className={styles.submitBtn}
                                        style={{ marginTop: 'var(--spacing-4)' }}
                                    >
                                        <Plus size={16} />
                                        入試アンケートに回答する
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.tableCard} style={{ marginTop: 'var(--spacing-4)' }}>
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
                                                {examSurveys.map((survey, idx) => (
                                                    <tr key={survey.id || idx}>
                                                        <td className={styles.fontWeightMedium}>
                                                            <div>{survey.school_name}</div>
                                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                {survey.school_type}
                                                            </div>
                                                        </td>
                                                        <td>{survey.department_name || '-'}</td>
                                                        <td>{survey.exam_type || '-'}</td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{survey.exam_date || '-'}</td>
                                                        <td className={styles.textCenter}>
                                                            <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'center' }}>
                                                                <button
                                                                    onClick={() => handleOpenSurveyModal('view', survey)}
                                                                    className={styles.actionButton}
                                                                    style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                                >
                                                                    詳細
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenSurveyModal('edit', survey)}
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
                                        {examSurveys.map((survey, idx) => (
                                            <div key={survey.id || idx} className={styles.examCard} style={{ position: 'relative' }}>
                                                <div className={styles.examCardSchool}>{survey.school_name}</div>
                                                {survey.school_type && (
                                                    <div className={styles.examCardDept}>{survey.school_type}</div>
                                                )}
                                                {survey.department_name && (
                                                    <div className={styles.examCardDept}>{survey.department_name}</div>
                                                )}
                                                <div className={styles.examCardRow}>
                                                    <span className={styles.examCardLabel}>試験の種類</span>
                                                    <span className={styles.examCardValue}>{survey.exam_type || '-'}</span>
                                                </div>
                                                <div className={styles.examCardRow}>
                                                    <span className={styles.examCardLabel}>試験日</span>
                                                    <span className={styles.examCardValue}>{survey.exam_date || '-'}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-3)', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleOpenSurveyModal('view', survey)}
                                                        className={styles.actionButton}
                                                        style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                    >
                                                        詳細
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenSurveyModal('edit', survey)}
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
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
