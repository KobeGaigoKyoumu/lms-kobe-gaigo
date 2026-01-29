'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitHomework } from '@/app/actions/homework'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, X, FileText, Image as ImageIcon } from 'lucide-react'

export default function SubmissionForm({ assignmentId, initialComment = '', initialFiles = [] }) {
    const [comment, setComment] = useState(initialComment)
    const [files, setFiles] = useState(initialFiles) // Array of { name, url }
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()

    const handleFileChange = async (e) => {
        if (!e.target.files?.length) return

        setUploading(true)
        const supabase = createClient()
        const newFiles = []

        try {
            for (const file of e.target.files) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `${assignmentId}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('assignments')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('assignments')
                    .getPublicUrl(filePath)

                newFiles.push({
                    name: file.name,
                    url: publicUrl
                })
            }
            setFiles(prev => [...prev, ...newFiles])
        } catch (error) {
            console.error('Upload failed:', error)
            alert('アップロードに失敗しました。')
        } finally {
            setUploading(false)
        }
    }

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const result = await submitHomework(assignmentId, comment, files)
            if (result.error) {
                alert(result.error)
            } else {
                alert('提出しました！')
                router.push('/student/dashboard')
            }
        } catch (error) {
            alert('エラーが発生しました。')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
            <div>
                <label className="block text-sm font-medium mb-2">コメント / 回答</label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-3 border rounded-md h-32"
                    placeholder="先生へのコメントや、テキストでの回答が必要な場合はここに入力してください。"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">ファイル提出 (画像など)</label>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mb-4 space-y-2">
                        {files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <ImageIcon size={16} className="text-blue-500 shrink-0" />
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
                                        {file.name}
                                    </a>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(i)}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Button */}
                <div className="flex items-center gap-4">
                    <label className={`
                        flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-colors
                        ${uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                    `}>
                        {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                        <span>{uploading ? 'アップロード中...' : 'ファイルを選択'}</span>
                        <input
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                    <span className="text-xs text-gray-500">※ 画像、PDFなどをアップロードできます</span>
                </div>
            </div>

            <div className="pt-4 border-t">
                <button
                    type="submit"
                    disabled={submitting || uploading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {submitting && <Loader2 className="animate-spin" />}
                    {submitting ? '提出中...' : '課題を提出する'}
                </button>
            </div>
        </form>
    )
}
