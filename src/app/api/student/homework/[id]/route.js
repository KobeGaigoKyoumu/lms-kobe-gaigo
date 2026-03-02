import { NextResponse } from 'next/server'
import { getAssignmentDetails } from '@/app/actions/homework'

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params
        const id = resolvedParams.id
        const assignment = await getAssignmentDetails(id)

        if (!assignment) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        if (assignment.error) {
            return NextResponse.json({ error: assignment.error }, { status: 401 })
        }

        return NextResponse.json(assignment)
    } catch (error) {
        console.error('API Error fetching homework detail:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
