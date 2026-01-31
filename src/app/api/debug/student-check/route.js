import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id_text', 'test-student')

    return NextResponse.json({
        checked_id: 'test-student',
        data: students,
        error: error
    })
}
