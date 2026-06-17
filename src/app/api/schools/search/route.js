import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const pref = searchParams.get('pref') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (!q.trim() && !type.trim() && !pref.trim()) {
        return NextResponse.json({ schools: [], totalCount: 0 });
    }

    try {
        const supabase = await createClient();

        let query = supabase
            .from('master_schools')
            .select('code, name, school_type, prefecture, website, departments', { count: 'exact' });

        if (q.trim()) {
            query = query.or(`name.ilike.%${q}%,kana.ilike.%${q}%,katakana.ilike.%${q}%,romaji.ilike.%${q}%,departments.ilike.%${q}%`);
        }
        if (type.trim()) {
            query = query.eq('school_type', type.trim());
        }
        if (pref.trim()) {
            query = query.eq('prefecture', pref.trim());
        }

        const { data, error, count } = await query
            .order('name', { ascending: true })
            .range(from, to);

        if (error) {
            console.error('Database error in school search:', error);
            return NextResponse.json({ error: '検索中にエラーが発生しました。' }, { status: 500 });
        }

        return NextResponse.json({
            schools: data || [],
            totalCount: count || 0
        });
    } catch (err) {
        console.error('Server error in school search:', err);
        return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
    }
}
