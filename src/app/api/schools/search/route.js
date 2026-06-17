import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const pref = searchParams.get('pref') || '';

    if (!q.trim() && !type.trim() && !pref.trim()) {
        return NextResponse.json([]);
    }

    try {
        const supabase = await createClient();

        let query = supabase
            .from('master_schools')
            .select('code, name, school_type, prefecture, departments')
            .neq('school_type', 'technical_college');

        if (q.trim()) {
            query = query.or(`name.ilike.%${q}%,kana.ilike.%${q}%,katakana.ilike.%${q}%,romaji.ilike.%${q}%,departments.ilike.%${q}%`);
        }
        if (type.trim()) {
            query = query.eq('school_type', type.trim());
        }
        if (pref.trim()) {
            query = query.eq('prefecture', pref.trim());
        }

        const { data, error } = await query
            .order('name', { ascending: true })
            .limit(100);

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
