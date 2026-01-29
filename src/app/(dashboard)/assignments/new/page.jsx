'use client'

import { useState } from 'react'
import { createAssignment } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'

export default function NewAssignmentPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (formData) => {
        setLoading(true)
        const result = await createAssignment(formData)

        if (result.error) {
            alert(result.error)
            setLoading(false)
        } else {
            alert('課題を作成しました')
            router.push('/assignments')
            router.refresh()
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <Link href="/assignments" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6">
                <ChevronLeft size={16} />
                一覧に戻る
            </Link>

            <h1 className="text-2xl font-bold mb-6">新規課題作成</h1>

            <form action={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border space-y-6">

                <div>
                    <label className="block text-sm font-medium mb-2">タイトル <span className="text-red-500">*</span></label>
                    <input
                        name="title"
                        type="text"
                        required
                        className="w-full p-2 border rounded-md"
                        placeholder="例: 第1回 レポート課題"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">説明文</label>
                    <textarea
                        name="description"
                        rows="5"
                        className="w-full p-2 border rounded-md"
                        placeholder="課題の内容や注意事項を入力してください"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">対象クラス <span className="text-red-500">*</span></label>
                        <input
                            name="className"
                            type="text"
                            required
                            className="w-full p-2 border rounded-md"
                            placeholder="例: 2-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">※ 正確なクラス名を入力してください</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">提出期限 <span className="text-red-500">*</span></label>
                        <input
                            name="deadline"
                            type="datetime-local"
                            required
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="animate-spin" size={18} />}
                        {loading ? '作成中...' : '課題を作成する'}
                    </button>
                </div>
            </form>
        </div>
    )
}
