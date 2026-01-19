import { NextResponse } from 'next/server';
import { getEnhancedJlptStats } from '@/lib/jlpt';

export async function GET() {
    try {
        const data = await getEnhancedJlptStats();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch enhanced JLPT stats' }, { status: 500 });
    }
}
