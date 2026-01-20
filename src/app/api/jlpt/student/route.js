import { NextResponse } from 'next/server';
import { getJlptByStudentName, getJlptByStudentId } from '@/lib/jlpt';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        const studentId = searchParams.get('studentId');
        const enrollmentDate = searchParams.get('enrollmentDate');

        // Priority: Use studentId if available, otherwise use name
        if (studentId) {
            const data = await getJlptByStudentId(studentId, enrollmentDate);
            // If studentId search returns results, use them
            if (data && data.length > 0) {
                return NextResponse.json(data);
            }
        }

        // Fallback to name search
        if (name) {
            const data = await getJlptByStudentName(name, enrollmentDate);
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Name or studentId parameter is required' }, { status: 400 });
    } catch (error) {
        console.error('Error fetching student JLPT data:', error);
        return NextResponse.json({ error: 'Failed to fetch student JLPT data' }, { status: 500 });
    }
}
