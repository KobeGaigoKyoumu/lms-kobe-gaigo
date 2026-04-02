'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import KanbanBoard from './KanbanBoard'
import styles from './page.module.css'

export default function KanbanClientWrapper({ userId }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        columns: [],
        cards: [],
        labels: [],
        reminders: []
    })
    const [error, setError] = useState(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchKanbanData = async () => {
            try {
                setLoading(true)
                
                // Fetch all kanban data directly from Supabase to save Vercel CPU
                const [colsRes, cardsRes, labelsRes, remindersRes] = await Promise.all([
                    supabase.from('kanban_columns').select('*').order('position'),
                    supabase.from('kanban_cards').select('*').order('position'),
                    supabase.from('kanban_labels').select('*'),
                    supabase.from('kanban_reminders').select('*')
                ])

                if (colsRes.error) throw colsRes.error
                if (cardsRes.error) throw cardsRes.error
                if (labelsRes.error) throw labelsRes.error
                if (remindersRes.error) throw remindersRes.error

                setData({
                    columns: colsRes.data || [],
                    cards: cardsRes.data || [],
                    labels: labelsRes.data || [],
                    reminders: remindersRes.data || []
                })
            } catch (err) {
                console.error('Failed to fetch kanban data:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchKanbanData()
    }, [supabase])

    if (loading) {
        return (
            <div className={styles.page}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.title}>カンバンボード</h1>
                        <p className={styles.subtitle}>読み込み中...</p>
                    </div>
                </header>
                <div className={styles.loadingState}>
                    <p>データを読み込んでいます...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.error}>
                    データの取得に失敗しました: {error}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>カンバンボード</h1>
                    <p className={styles.subtitle}>タスクとスケジュールの管理</p>
                </div>
            </header>
            <KanbanBoard 
                userId={userId} 
                initialColumns={data.columns}
                initialCards={data.cards}
                initialLabels={data.labels}
                initialReminders={data.reminders}
            />
        </div>
    )
}
