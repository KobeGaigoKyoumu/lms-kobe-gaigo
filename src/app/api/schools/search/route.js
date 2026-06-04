import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q.trim()) {
        return NextResponse.json([]);
    }

    try {
        const supabase = await createClient();

        // ひらがな、カタカナ、漢字、ローマ字部分一致検索
        const { data, error } = await supabase
            .from('master_schools')
            .select('name, school_type')
            .or(`name.ilike.%${q}%,kana.ilike.%${q}%,katakana.ilike.%${q}%,romaji.ilike.%${q}%`)
            .limit(50);

        if (error) {
            console.error('Database error in school search:', error);
            return NextResponse.json({ error: '検索中にエラーが発生しました。' }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (err) {
        console.error('Server error in school search:', err);
        return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
    }
}
