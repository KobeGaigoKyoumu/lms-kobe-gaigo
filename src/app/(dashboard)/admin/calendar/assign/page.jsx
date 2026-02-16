'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TemplateAssignmentPage() {
    const [classes, setClasses] = useState([])
    const [templates, setTemplates] = useState([])
    const [assignments, setAssignments] = useState({}) // { className: templateId }
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)

        // 1. Fetch Classes (Unique names)
        const { data: students } = await supabase
            .from('students')
            .select('class_name')
            .not('class_name', 'is', null)
            .order('class_name')

        const uniqueClasses = [...new Set(students?.map(s => s.class_name))].filter(Boolean)
        setClasses(uniqueClasses)

        // 2. Fetch Templates
        const { data: tmpl } = await supabase
            .from('calendar_templates')
            .select('id, name')
            .order('name')
        setTemplates(tmpl || [])

        // 3. Fetch Existing Assignments
        const { data: exists } = await supabase
            .from('class_template_assignments')
            .select('class_name, template_id')

        const currentAssignments = {}
        exists?.forEach(a => {
            currentAssignments[a.class_name] = a.template_id
        })
        setAssignments(currentAssignments)

        setLoading(false)
    }

    const handleAssignmentChange = async (className, templateId) => {
        // Optimistic update
        setAssignments(prev => ({
            ...prev,
            [className]: templateId
        }))

        // Verify if we should save immediately or via "Save All" button.
        // Immediate save is better UX for simple toggles.
        await saveAssignment(className, templateId)
    }

    const saveAssignment = async (className, templateId) => {
        if (!templateId) {
            // Remove assignment
            await supabase
                .from('class_template_assignments')
                .delete()
                .eq('class_name', className)
        } else {
            // Upsert (since we have unique constraint)
            // But upsert on (class_name, template_id) unique key won't work if we want to change template for same class
            // The unique constraint is (class_name, template_id) -> effectively allows multiple templates per class?
            // Wait, my migration said: UNIQUE(class_name, template_id)
            // Actually, usually we want ONE template per class per year?
            // If we want only 1 template per class, the UNIQUE should be on (class_name).
            // Let's check migration... 
            // "UNIQUE(class_name, template_id)" -> This allows (A, 1) and (A, 2) ???
            // No, unique constraint on multiple columns means the COMBINATION is unique.
            // So (ClassA, Template1) exists. If I try (ClassA, Template1) again, it fails.
            // But (ClassA, Template2) is allowed alongside!
            // This means a class can have MULTIPLE templates. e.g. "Basic Schedule" AND "Summer Camp".
            // That is actually good flexibility.

            // So, for this UI:
            // If I want to support multiple templates, UI should be checkboxes or multi-select.
            // If I want to enforce single template, I should delete others first.

            // For simplicity/MVP, let's assume 1 MAIN template per class for now in UI,
            // but database supports multiple.
            // So when I select a template in dropdown, I will delete old ones for this class and insert new one.
            // OR I can just allow adding multiple.

            // Let's stick to "Single Template Mode" for this page to keep it simple.
            // Delete all for class -> Insert new.

            await supabase
                .from('class_template_assignments')
                .delete()
                .eq('class_name', className)

            if (templateId) {
                await supabase
                    .from('class_template_assignments')
                    .insert({
                        class_name: className,
                        template_id: templateId
                    })
            }
        }
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>クラスへのテンプレート割り当て</h1>
            <p style={{ marginBottom: '2rem', color: '#666' }}>
                各クラスに適用するカレンダーテンプレートを選択してください。
            </p>

            {loading ? <p>読み込み中...</p> : (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>クラス名</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>適用テンプレート</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map(cls => (
                                <tr key={cls} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '1rem' }}>{cls}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <select
                                            value={assignments[cls] || ''}
                                            onChange={(e) => handleAssignmentChange(cls, e.target.value)}
                                            style={{ padding: '0.5rem', minWidth: '200px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                        >
                                            <option value="">設定なし</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
