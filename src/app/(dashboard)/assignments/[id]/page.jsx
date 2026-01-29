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
            <div className="p-6 pb-0">
                <Link href="/assignments" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
                    <ChevronLeft size={16} />
                    一覧に戻る
                </Link>
            </div>
            <AssignmentGradingView
                assignment={data.assignment}
                submissions={data.submissions}
            />
        </div>
    )
}
