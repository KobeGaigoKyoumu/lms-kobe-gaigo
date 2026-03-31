import { NextResponse } from 'next/server'
import { getAssignmentsByClass, getClassSubmissionMatrix } from '@/app/actions/homework'

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params
        const className = decodeURIComponent(resolvedParams.className)
        
        // Extract archived query param
        const isArchived = request.nextUrl.searchParams.get('archived') === 'true'

        const [assignments, matrixData] = await Promise.all([
            getAssignmentsByClass(className, isArchived),
            getClassSubmissionMatrix(className, isArchived)
        ])

        return NextResponse.json({ assignments, matrixData })
    } catch (error) {
        console.error('API Error fetching class assignments data:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
