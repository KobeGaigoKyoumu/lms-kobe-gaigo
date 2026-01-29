'use client'

import { useState } from 'react'
import { gradeSubmission } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Save, FileText, Image as ImageIcon } from 'lucide-react'

// This component handles the grading logic for a single student row
function SubmissionRow({ submission, student }) {
    const [score, setScore] = useState(submission.score ?? '')
    const [feedback, setFeedback] = useState(submission.feedback ?? '')
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        setSaving(true)
        const result = await gradeSubmission(submission.id, score, feedback)
        if (result.error) {
            alert(result.error)
        } else {
            // Optional: Show success toast
            router.refresh()
        }
        setSaving(false)
    }

    const fileUrls = submission.file_urls || []

    return (
        <div className="border rounded-lg p-4 bg-gray-50 mb-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="font-bold text-lg">{student?.full_name || '不明な学生'} <span className="text-sm font-normal text-gray-500">({student?.class_name})</span></div>
                    <div className="text-sm text-gray-500">提出日時: {new Date(submission.submitted_at).toLocaleString('ja-JP')}</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${submission.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {submission.status === 'graded' ? '採点済み' : '未採点'}
                </div>
            </div>

            {/* Comment */}
            {submission.comment && (
                <div className="bg-white p-3 rounded border mb-3 text-gray-800 whitespace-pre-wrap text-sm">
                    {submission.comment}
                </div>
            )}

            {/* Files */}
            {fileUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {fileUrls.map((file, i) => (
                        <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white border rounded hover:bg-gray-50 text-blue-600 text-sm"
                        >
                            <ImageIcon size={16} />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                        </a>
                    ))}
                </div>
            )}

            {/* Grading Form */}
            <div className="flex gap-4 items-start border-t pt-3">
                <div className="w-24">
                    <label className="block text-xs font-medium mb-1">点数</label>
                    <input
                        type="number"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        className="w-full p-2 border rounded text-right"
                        min="0" max="100"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-medium mb-1">フィードバック</label>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full p-2 border rounded h-[42px] focus:h-24 transition-all"
                        placeholder="コメントを入力..."
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-6 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    title="保存"
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                </button>
            </div>
        </div>
    )
}

export default function AssignmentGradingView({ assignment, submissions }) {
    if (!assignment) return <div>課題が見つかりません</div>

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2">{assignment.title}</h1>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                    <span>クラス: {assignment.class_name}</span>
                    <span>期限: {new Date(assignment.deadline).toLocaleString('ja-JP')}</span>
                </div>
                <div className="bg-white p-4 rounded border text-gray-800">
                    {assignment.description || '説明なし'}
                </div>
            </div>

            <h2 className="text-xl font-bold mb-4">
                提出状況 ({submissions.length})
            </h2>

            {submissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-white rounded border">
                    まだ提出はありません
                </div>
            ) : (
                <div className="space-y-4">
                    {submissions.map(sub => (
                        <SubmissionRow
                            key={sub.id}
                            submission={sub}
                            student={sub.student}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
