'use client'

import { useState } from 'react'
import { saveStudentCareerInfo } from '@/app/actions/career'
import { BookOpen, Clipboard, Calendar, HelpCircle, ChevronRight, ChevronLeft, Save, Edit3, Lock } from 'lucide-react'
import styles from './page.module.css'

export default function CareerCounselingClient({ initialData, isSecondYear, session }) {
    const [activeTab, setActiveTab] = useState(isSecondYear ? 'career' : 'interview') // 2nd year default is career, 1st year default is interview
    const [data, setData] = useState(initialData || null)
    const [isEditing, setIsEditing] = useState(!initialData)
    const [step, setStep] = useState(1)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

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
                                                    {data.parent_support === '可' && data.parent_support_amount ? ` (月額: ${data.parent_support_amount}万円)` : ''}
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
                                                            <input 
                                                                type="text" 
                                                                value={form.first_choice_school}
                                                                onChange={(e) => handleFieldChange('first_choice_school', e.target.value)}
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
                                                            <input 
                                                                type="text" 
                                                                value={form.second_choice_school}
                                                                onChange={(e) => handleFieldChange('second_choice_school', e.target.value)}
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
                                                            <input 
                                                                type="text" 
                                                                value={form.third_choice_school}
                                                                onChange={(e) => handleFieldChange('third_choice_school', e.target.value)}
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
                                                    <label>両親による学費の仕送り支援</label>
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
                                                            <label>仕送り支援額 (月額)</label>
                                                            <input 
                                                                type="number" 
                                                                value={form.parent_support_amount}
                                                                onChange={(e) => handleFieldChange('parent_support_amount', e.target.value)}
                                                                placeholder="金額を万円単位で入力 (例: 5)"
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
        </div>
    )
}
