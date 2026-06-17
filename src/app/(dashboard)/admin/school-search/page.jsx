import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminMemberSession } from '@/app/actions/adminAuth'
import AdminSchoolSearchClient from './AdminSchoolSearchClient'

export const dynamic = 'force-dynamic'

export default async function AdminSchoolSearchPage() {
    const supabase = await createClient()

    // 認証・権限チェック
    const { data: { user } } = await supabase.auth.getUser()
    const adminMember = await getAdminMemberSession()
    let isAuthorized = false

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
        if (profile?.role === 'admin' || profile?.role === 'teacher') {
            isAuthorized = true
        }
    }

    if (!isAuthorized && adminMember) {
        isAuthorized = true
    }

    if (!isAuthorized) {
        redirect('/login')
    }

    return <AdminSchoolSearchClient />
}
