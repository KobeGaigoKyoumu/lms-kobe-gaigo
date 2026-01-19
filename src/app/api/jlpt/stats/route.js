import { NextResponse } from 'next/server';
import { getJlptData } from '@/lib/jlpt';

export async function GET() {
    try {
        const data = await getJlptData();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch JLPT data' }, { status: 500 });
    }
}
