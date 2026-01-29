import { getAssignmentSubmissions } from '@/app/actions/homework'
import AssignmentGradingView from '@/components/Homework/GradingView'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AssignmentPage({ params }) {
    const resolvedParams = await params
    const id = resolvedParams.id
    const data = await getAssignmentSubmissions(id)

    if (!data) {
        return <div className="p-8">課題が見つかりません。</div>
    }

    return (
        <div>
            <div className="max-w-[1000px] mx-auto pt-6 px-6">
                <Link
                    href={`/assignments/class/${encodeURIComponent(data.assignment.class_name)}`}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 px-3 py-2 rounded-md hover:bg-gray-100"
                >
                    <ChevronLeft size={18} />
                    <span className="font-medium">{data.assignment.class_name} の課題一覧に戻る</span>
                </Link>
            </div>
            <AssignmentGradingView
                assignment={data.assignment}
                submissions={data.submissions}
            />
        </div>
    )
}
