import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: students, error } = await supabase
        .from('students')
        .select('student_id_text, full_name, class_name, facebook_psid')
        .limit(20)

    return NextResponse.json({
        students: students,
        error: error
    })
}
