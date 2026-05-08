import { NextResponse } from 'next/server'
import { getTeacherAssignments, getClassesList } from '@/app/actions/homework'

export async function GET() {
    try {
        const [assignments, classes] = await Promise.all([
            getTeacherAssignments(),
            getClassesList()
        ])

        return NextResponse.json({ assignments, classes })
    } catch (error) {
        console.error('API Error fetching assignments data:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
