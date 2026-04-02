import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const className = '2-13'
    const { data: assignments } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('class_name', className)

    return NextResponse.json({
        now: new Date().toISOString(),
        className,
        count: assignments?.length || 0,
        assignments: assignments || []
    })
}
