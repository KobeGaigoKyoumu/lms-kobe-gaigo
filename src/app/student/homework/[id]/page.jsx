import { getAssignmentDetails } from '@/app/actions/homework'
import { notFound } from 'next/navigation'
import HomeworkClient from './HomeworkClient'

export const dynamic = 'force-dynamic'

export default async function HomeworkPage({ params }) {
    const { id } = await params

    if (!id) {
        notFound()
    }

    // Fetch assignment and submission on server side (Secure & Fast)
    const assignment = await getAssignmentDetails(id)

    if (!assignment || assignment.error) {
        notFound()
    }

    return <HomeworkClient assignment={assignment} />
}
