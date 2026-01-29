import { getStudentAssignments } from '@/app/actions/homework'
import Link from 'next/link'
import { CheckCircle2, Circle, Clock, ChevronRight, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StudentDashboard() {
    const assignments = await getStudentAssignments()

    // Sort: Not submitted first, then by deadline
    const sortedAssignments = Array.isArray(assignments) ? assignments.sort((a, b) => {
        // First priority: Submission status (Unsubmitted < Submitted)
        const aSubmitted = !!a.submission
        const bSubmitted = !!b.submission
        if (aSubmitted !== bSubmitted) return aSubmitted ? 1 : -1

        // Second priority: Deadline
        return new Date(a.deadline) - new Date(b.deadline)
    }) : []

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">課題一覧</h1>

            {sortedAssignments.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
                    <p>現在、課題はありません。</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {sortedAssignments.map((assignment) => {
                        const isSubmitted = !!assignment.submission
                        const deadlineDate = new Date(assignment.deadline)
                        const isOverdue = !isSubmitted && deadlineDate < new Date()

                        return (
                            <Link
                                key={assignment.id}
                                href={`/student/homework/${assignment.id}`}
                                className={`
                                    block bg-white p-5 rounded-lg border shadow-sm hover:shadow-md transition-shadow
                                    ${isSubmitted ? 'border-l-4 border-l-green-500' : isOverdue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'}
                                `}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {isSubmitted ? (
                                                <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 size={12} className="mr-1" /> 提出済み
                                                </span>
                                            ) : isOverdue ? (
                                                <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                    <AlertCircle size={12} className="mr-1" /> 期限切れ
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                    <Circle size={12} className="mr-1" /> 未提出
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-900 mb-1">{assignment.title}</h2>
                                        <div className="flex items-center text-sm text-gray-500 gap-4">
                                            <span className="flex items-center">
                                                <Clock size={14} className="mr-1" />
                                                期限: {deadlineDate.toLocaleDateString('ja-JP')} {deadlineDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-gray-300" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
