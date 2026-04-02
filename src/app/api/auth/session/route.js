import { NextResponse } from 'next/server'
import { getStudentSessionLight } from '@/app/actions/studentAuth'
import { getAdminMemberSession } from '@/app/actions/adminAuth'

export async function GET() {
    try {
        const studentSession = await getStudentSessionLight()
        const adminSession = await getAdminMemberSession()

        return NextResponse.json({
            session: studentSession,
            admin: adminSession
        })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
    }
}
