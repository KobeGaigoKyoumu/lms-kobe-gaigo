'use client'

import { useState } from 'react'
import { 
    saveStudentCareerInfo,
    saveStudentExamSchedulesSelf,
    saveStudentExamSurveySelf,
    deleteStudentExamSurveySelf
} from '@/app/actions/career'
import { 
    BookOpen, Clipboard, Calendar, HelpCircle, ChevronRight, ChevronLeft, Save, Edit3, Lock,
    Plus, Trash2, X, CheckCircle, AlertCircle, FileText
} from 'lucide-react'
import SchoolAutocomplete from '@/components/SchoolAutocomplete'
import styles from './page.module.css'

export default function CareerCounselingClient({ initialData, examSchedules, examSurveys, isSecondYear, session }) {
    const [activeTab, setActiveTab] = useState(isSecondYear ? 'career' : 'interview') // 2nd year default is career, 1st year default is interview
    const [data, setData] = useState(initialData || null)
    const [isEditing, setIsEditing] = useState(!initialData)
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

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
    const [surveyForm, setSurveyForm] = useState({
        school_type: '大学',
        school_name: '',
        exam_date: '',
        department_name: '',
        exam_type: '一般',
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
    })

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

    // ====================================================
    // 入試予定 (EXAM SCHEDULES) ロジック
    // ====================================================
    const startEditingExams = () => {
        setExamFormList(examSchedulesList.length > 0 ? examSchedulesList.map(s => ({ ...s })) : [
            { school_name: '', department_name: '', application_period: '', exam_date: '', results_date: '', status: '結果待ち' }
        ])
        setIsEditingExams(true)
        setExamError(null)
        setExamSuccessMsg(null)
    }

    const addExamRow = () => {
        setExamFormList(prev => [
            ...prev,
            { school_name: '', department_name: '', application_period: '', exam_date: '', results_date: '', status: '結果待ち' }
        ])
    }

    const removeExamRow = (index) => {
        setExamFormList(prev => prev.filter((_, i) => i !== index))
    }

    const handleExamFieldChange = (index, field, value) => {
        setExamFormList(prev => {
            const copy = [...prev]
            copy[index] = { ...copy[index], [field]: value }
            return copy
        })
    }

    const handleSaveExams = async (e) => {
        e.preventDefault()
        setSavingExam(true)
        setExamError(null)
        setExamSuccessMsg(null)

        const filteredList = examFormList.filter(item => item.school_name.trim() !== '')
        if (filteredList.length === 0) {
            setExamError('少なくとも1つの学校名を入力してください。')
            setSavingExam(false)
            return
        }

        try {
            const res = await saveStudentExamSchedulesSelf(filteredList)
            if (res.success) {
                setExamSchedulesList(filteredList)
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
    }

    const handleSurveyCheckboxChange = (item, isChecked) => {
        setSurveyForm(prev => {
            const current = prev.japanese_content || []
            const next = isChecked 
                ? [...current, item] 
                : current.filter(c => c !== item)
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
            school_type: '大学',
            school_name: '',
            exam_date: '',
            department_name: '',
            exam_type: '一般',
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

        if (survey) {
            setSurveyForm({
                ...defaultForm,
                ...survey,
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
    }

    const nextSurveyStep = () => {
        setSurveyStep(prev => prev + 1)
    }

    const prevSurveyStep = () => {
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

        if (!surveyForm.school_name) {
            setSurveyError('学校名を入力してください。')
            setSavingSurvey(false)
            return
        }

        const payload = {
            ...surveyForm,
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
                    id: selectedSurvey?.id || 'temp-' + Date.now()
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
            setSurveyModalMode('list') // モーダルを閉じる
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
                                                    <label>名前</label>
                                                    <input 
                                                        type="text" 
                                                        value={form.student_name} 
                                                        disabled 
                                                        className={styles.disabledInput}
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>日本語学校卒業後の予定</label>
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
                                                <h3>2. 志望校</h3>
                                                
                                                <div className={styles.choiceFormBlock}>
                                                    <h4>■ 1番行きたい学校</h4>
                                                    <div className={styles.formRow2Col}>
                                                        <div className={styles.inputGroup}>
                                                            <label>行きたい学校の名前</label>
                                                            <input 
                                                                type="text" 
                                                                value={form.first_choice_school}
                                                                onChange={(e) => handleFieldChange('first_choice_school', e.target.value)}
                                                                placeholder="例: 神戸国際大学"
                                                                required
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>学部・学科・コースの名前</label>
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
                                                        <label>行きたい理由</label>
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
                                                            <input 
                                                                type="text" 
                                                                value={form.second_choice_school}
                                                                onChange={(e) => handleFieldChange('second_choice_school', e.target.value)}
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
                                                            <input 
                                                                type="text" 
                                                                value={form.third_choice_school}
                                                                onChange={(e) => handleFieldChange('third_choice_school', e.target.value)}
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

                                                <div className={styles.radioGroup}>
                                                    <label>進学で引っこしできるかどうか</label>
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

                                                <div className={styles.radioGroup}>
                                                    <label>両親が学費のお金を出せるかどうか</label>
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

                                                <div className={styles.radioGroup}>
                                                    <label>アルバイトの給料が入る銀行通帳を銀行で使っているかどうか</label>
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

                                                <div className={styles.radioGroup}>
                                                    <label>日本に来てから今までの全部のアルバイトの給与明細書があるかどうか</label>
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
                                受験予定の学校について入力・修正してください。不要な行は削除してください。
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
                                                <div className={styles.inputGroup}>
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
                                                    <input 
                                                        type="text" 
                                                        value={item.application_period}
                                                        onChange={(e) => handleExamFieldChange(index, 'application_period', e.target.value)}
                                                        placeholder="例: 10/1〜10/15"
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>入学試験の日</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.exam_date}
                                                        onChange={(e) => handleExamFieldChange(index, 'exam_date', e.target.value)}
                                                        placeholder="例: 11/1"
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>合格/不合格がわかる日</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.results_date}
                                                        onChange={(e) => handleExamFieldChange(index, 'results_date', e.target.value)}
                                                        placeholder="例: 11/10"
                                                    />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label>合格/不合格の状況</label>
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
                            <div className={styles.detailHeaderActions} style={{ marginBottom: 'var(--spacing-4)' }}>
                                <button onClick={() => startEditingSurvey(null)} className={styles.addBtn}>
                                    <Plus size={16} />
                                    アンケートに回答する
                                </button>
                            </div>

                            {examSurveysList.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <FileText size={48} color="var(--text-tertiary)" />
                                    <p>入試アンケート回答が登録されていません。</p>
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
                                                        <option value="短大">短大</option>
                                                        <option value="専門学校">専門学校</option>
                                                        <option value="その他">その他</option>
                                                    </select>
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label>学校名 <span style={{ color: 'var(--error-500)' }}>*</span></label>
                                                    <SchoolAutocomplete
                                                        value={surveyForm.school_name}
                                                        onChange={(val) => handleSurveyFieldChange('school_name', val)}
                                                        placeholder="学校名を入力または選択"
                                                    />
                                                </div>

                                                <div className={styles.formRow2Col}>
                                                    <div className={styles.inputGroup}>
                                                        <label>学部・学科・コース</label>
                                                        <input 
                                                            type="text" 
                                                            value={surveyForm.department_name}
                                                            onChange={(e) => handleSurveyFieldChange('department_name', e.target.value)}
                                                            placeholder="例: グローバルビジネスコース"
                                                        />
                                                    </div>
                                                    <div className={styles.inputGroup}>
                                                        <label>試験の種類</label>
                                                        <input 
                                                            type="text" 
                                                            value={surveyForm.exam_type}
                                                            onChange={(e) => handleSurveyFieldChange('exam_type', e.target.value)}
                                                            placeholder="例: AO入試、指定校推薦、一般"
                                                        />
                                                    </div>
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label>試験日</label>
                                                    <input 
                                                        type="text" 
                                                        value={surveyForm.exam_date}
                                                        onChange={(e) => handleSurveyFieldChange('exam_date', e.target.value)}
                                                        placeholder="例: 2026/10/10"
                                                    />
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
                                                            />
                                                        </div>
                                                        <div className={styles.inputGroup}>
                                                            <label>テーマ</label>
                                                            <textarea 
                                                                value={surveyForm.essay_theme}
                                                                onChange={(e) => handleSurveyFieldChange('essay_theme', e.target.value)}
                                                                placeholder="出題された作文・小論文のテーマを記入してください。"
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
                                                        <div className={styles.formRow2Col}>
                                                            <div className={styles.inputGroup}>
                                                                <label>試験時間 (分)</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={surveyForm.japanese_time}
                                                                    onChange={(e) => handleSurveyFieldChange('japanese_time', e.target.value)}
                                                                    placeholder="例: 45"
                                                                />
                                                            </div>
                                                            <div className={styles.inputGroup}>
                                                                <label>難しさのレベル (目安)</label>
                                                                <select
                                                                    value={surveyForm.japanese_level}
                                                                    onChange={(e) => handleSurveyFieldChange('japanese_level', e.target.value)}
                                                                    className={styles.selectInput}
                                                                >
                                                                    <option value="N1">JLPT N1レベル</option>
                                                                    <option value="N2">JLPT N2レベル</option>
                                                                    <option value="N3">JLPT N3レベル</option>
                                                                    <option value="N4">JLPT N4レベル</option>
                                                                    <option value="N5">JLPT N5レベル</option>
                                                                    <option value="その他">その他・独自の試験</option>
                                                                </select>
                                                            </div>
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
                                                        <div className={styles.formRow3Col}>
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

                                        {/* ステップ5: その他試験・アドバイス */}
                                        {surveyStep === 5 && (
                                            <div className={styles.formStep}>
                                                <h3>5. その他試験とアドバイス</h3>
                                                
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
