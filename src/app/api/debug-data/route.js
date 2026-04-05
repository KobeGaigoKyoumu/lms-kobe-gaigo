import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
    const debug = {
        cwd: process.cwd(),
        env: {
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        files: {},
        database: {}
    }

    // Check files
    try {
        const dataPath = path.join(process.cwd(), 'data')
        if (fs.existsSync(dataPath)) {
            debug.files.data = fs.readdirSync(dataPath)
            
            const jlptPath = path.join(dataPath, 'JLPT結果')
            if (fs.existsSync(jlptPath)) {
                debug.files.jlpt = fs.readdirSync(jlptPath)
            }
        } else {
            debug.files.data = 'NOT FOUND at ' + dataPath
        }
    } catch (e) {
        debug.files.error = e.message
    }

    // Check database
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        const { count, error } = await supabase
            .from('grade_records')
            .select('*', { count: 'exact', head: true })
        
        debug.database.grade_records_count = count
        debug.database.grade_records_error = error
    } catch (e) {
        debug.database.error = e.message
    }

    return NextResponse.json(debug)
}
