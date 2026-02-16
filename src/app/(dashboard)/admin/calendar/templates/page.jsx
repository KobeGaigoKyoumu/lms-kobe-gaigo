'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TemplateListPage() {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [newTemplateName, setNewTemplateName] = useState('')
    const [creating, setCreating] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        fetchTemplates()
    }, [])

    const fetchTemplates = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('calendar_templates')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching templates:', error)
        } else {
            setTemplates(data || [])
        }
        setLoading(false)
    }

    const handleCreateTemplate = async (e) => {
        e.preventDefault()
        if (!newTemplateName.trim()) return

        setCreating(true)
        const { data, error } = await supabase
            .from('calendar_templates')
            .insert({ name: newTemplateName })
            .select()
            .single()

        if (error) {
            alert('テンプレートの作成に失敗しました')
            console.error(error)
        } else {
            setNewTemplateName('')
            setTemplates([data, ...templates])
            // Optionally redirect to edit page immediately
            // router.push(`/admin/calendar/templates/${data.id}`)
        }
        setCreating(false)
    }

    const handleDeleteTemplate = async (id) => {
        if (!confirm('本当にこのテンプレートを削除しますか？関連するイベント設定も全て削除されます。')) return

        const { error } = await supabase
            .from('calendar_templates')
            .delete()
            .eq('id', id)

        if (error) {
            alert('削除に失敗しました')
            console.error(error)
        } else {
            setTemplates(templates.filter(t => t.id !== id))
        }
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>カレンダーテンプレート管理</h1>

            <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>新規テンプレート作成</h2>
                <form onSubmit={handleCreateTemplate} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder="テンプレート名（例: 2024年度 前期授業）"
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                        disabled={creating}
                    />
                    <button
                        type="submit"
                        disabled={creating || !newTemplateName.trim()}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: creating ? 'wait' : 'pointer',
                            opacity: creating ? 0.7 : 1
                        }}
                    >
                        {creating ? '作成中...' : '作成'}
                    </button>
                </form>
            </div>

            {loading ? (
                <p>読み込み中...</p>
            ) : templates.length === 0 ? (
                <p>テンプレートがありません。</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {templates.map(template => (
                        <div key={template.id} style={{
                            padding: '1.5rem',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{template.name}</h3>
                                <p style={{ fontSize: '0.85rem', color: '#666' }}>
                                    作成日: {new Date(template.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <Link
                                    href={`/admin/calendar/templates/${template.id}`}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#f3f4f6',
                                        textDecoration: 'none',
                                        color: '#374151',
                                        borderRadius: '4px',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    編集・イベント管理
                                </Link>
                                <button
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#fee2e2',
                                        color: '#ef4444',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    削除
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
