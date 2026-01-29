import { getAssignmentDetails } from '@/app/actions/homework'
import SubmissionForm from '@/components/Homework/SubmissionForm'
import { notFound } from 'next/navigation'
import { Calendar, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

// To handle dynamic params in server component
export default async function HomeworkPage({ params }) {
    const resolvedParams = await params
    const id = resolvedParams.id
    const assignment = await getAssignmentDetails(id)

    if (!assignment) {
        notFound()
    }

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/student/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4">
                <ChevronLeft size={16} />
                一覧に戻る
            </Link>

            <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                <h1 className="text-2xl font-bold mb-3">{assignment.title}</h1>

                <div className="flex items-center text-gray-600 text-sm mb-6 border-b pb-4">
                    <Calendar size={16} className="mr-2" />
                    <span className="font-medium">提出期限:</span>
                    <span className="ml-2">
                        {new Date(assignment.deadline).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>

                <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">
                    {assignment.description || '説明はありません。'}
                </div>
            </div>

            <h2 className="text-lg font-bold mb-4">提出</h2>
            <SubmissionForm
                assignmentId={assignment.id}
                initialComment={assignment.submission?.comment}
                initialFiles={assignment.submission?.file_urls}
            />

            {assignment.submission?.feedback && (
                <div className="mt-8 bg-blue-50 border border-blue-100 p-6 rounded-lg">
                    <h3 className="font-bold text-blue-800 mb-2">先生からのフィードバック</h3>
                    <p className="text-blue-900 whitespace-pre-wrap">{assignment.submission.feedback}</p>
                    {assignment.submission.score !== null && (
                        <div className="mt-4 font-bold text-xl text-blue-700">
                            評価: {assignment.submission.score}点
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
