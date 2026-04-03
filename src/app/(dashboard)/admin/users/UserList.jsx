'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toCDNUrl } from '@/lib/utils'
import styles from './page.module.css'

export default function UserList({ users: initialUsers, currentUserId }) {
    const [users, setUsers] = useState(initialUsers)
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [updating, setUpdating] = useState(null)

    const supabase = createClient()

    const filteredUsers = users.filter(user => {
        const matchesFilter = filter === 'all' || user.role === filter
        const matchesSearch =
            user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            user.email?.toLowerCase().includes(search.toLowerCase()) ||
            user.student_id?.includes(search)
        return matchesFilter && matchesSearch
    })

    const handleRoleChange = async (userId, newRole) => {
        if (userId === currentUserId) {
            alert('自分自身のロールは変更できません')
            return
        }

        setUpdating(userId)

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq('id', userId)

        if (!error) {
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ))
        } else {
            alert('ロールの更新に失敗しました')
            console.error(error)
        }

        setUpdating(null)
    }

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'admin': return styles.badgeAdmin
            case 'teacher': return styles.badgeTeacher
            default: return styles.badgeStudent
        }
    }

    return (
        <div className={styles.content}>
            {/* フィルターとサーチ */}
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <button
                        className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        すべて ({users.length})
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'student' ? styles.active : ''}`}
                        onClick={() => setFilter('student')}
                    >
                        学生
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'teacher' ? styles.active : ''}`}
                        onClick={() => setFilter('teacher')}
                    >
                        教師
                    </button>
                    <button
                        className={`${styles.filterBtn} ${filter === 'admin' ? styles.active : ''}`}
                        onClick={() => setFilter('admin')}
                    >
                        管理者
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="名前、メール、学籍番号で検索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {/* ユーザーテーブル */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ユーザー</th>
                            <th>メール</th>
                            <th>学籍番号</th>
                            <th>ロール</th>
                            <th>登録日</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className={styles.userCell}>
                                        <div className={styles.avatar}>
                                            {user.avatar_url ? (
                                                <img src={toCDNUrl(user.avatar_url)} alt="" />
                                            ) : (
                                                user.full_name?.[0] || '?'
                                            )}
                                        </div>
                                        <span>{user.full_name || '未設定'}</span>
                                    </div>
                                </td>
                                <td>{user.email}</td>
                                <td>{user.student_id || '-'}</td>
                                <td>
                                    <select
                                        value={user.role || 'student'}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        disabled={updating === user.id || user.id === currentUserId}
                                        className={`${styles.roleSelect} ${getRoleBadgeClass(user.role)}`}
                                    >
                                        <option value="student">学生</option>
                                        <option value="teacher">教師</option>
                                        <option value="admin">管理者</option>
                                    </select>
                                </td>
                                <td>
                                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className={styles.empty}>
                        該当するユーザーがいません
                    </div>
                )}
            </div>
        </div>
    )
}
