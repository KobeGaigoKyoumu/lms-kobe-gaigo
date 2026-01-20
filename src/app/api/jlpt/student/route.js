import { NextResponse } from 'next/server';
import { getJlptByStudentName, getJlptByStudentId } from '@/lib/jlpt';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        const studentId = searchParams.get('studentId');
        const enrollmentDate = searchParams.get('enrollmentDate');

        let allResults = [];

        // 1. Fetch by ID
        if (studentId) {
            const byId = await getJlptByStudentId(studentId, enrollmentDate);
            if (byId && byId.length > 0) {
                allResults = [...allResults, ...byId];
            }
        }

        // 2. Fetch by Name (ALWAYS fetch by name too, to catch CSV records which lack IDs)
        if (name) {
            const byName = await getJlptByStudentName(name, enrollmentDate);
            if (byName && byName.length > 0) {
                allResults = [...allResults, ...byName];
            }
        }

        // 3. Deduplicate
        // Key: session + level (Record from JSON matches ID & Name, Record from CSV matches Name only)
        const uniqueParams = new Set();
        const uniqueResults = [];

        // Sort by session desc first
        allResults.sort((a, b) => b.session.localeCompare(a.session));

        for (const record of allResults) {
            const key = `${record.session}|${record.level}`;
            if (!uniqueParams.has(key)) {
                uniqueParams.add(key);
                uniqueResults.push(record);
            }
        }

        return NextResponse.json(uniqueResults);

    } catch (error) {
        console.error('Error fetching student JLPT data:', error);
        return NextResponse.json({ error: 'Failed to fetch student JLPT data' }, { status: 500 });
    }
}
