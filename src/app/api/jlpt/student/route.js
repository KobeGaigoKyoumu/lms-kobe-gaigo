import { NextResponse } from 'next/server';
import { getJlptByStudentName } from '@/lib/jlpt';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ error: 'Name parameter is required' }, { status: 400 });
        }

        const data = await getJlptByStudentName(name);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch student JLPT data' }, { status: 500 });
    }
}
