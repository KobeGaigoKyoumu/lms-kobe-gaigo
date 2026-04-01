'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { unstable_cache, revalidateTag } from 'next/cache'

const COOKIE_NAME = 'kobe_admin_member'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Server configuration error')
    return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function loginAdminMember(formData) {
    const name = formData.get('memberName')
    const password = formData.get('memberPassword')

    if (!name || !password) {
        return { error: '名前とパスワードを入力してください。' }
    }

    try {
        const supabase = createAdminClient()
        const { data: member, error } = await supabase
            .from('admin_members')
            .select('id, name, role')
            .eq('name', name.trim())
            .eq('password', password.trim())
            .single()

        if (error || !member) {
            return { error: '名前またはパスワードが正しくありません。' }
        }

        const sessionData = {
            memberId: member.id,
            name: member.name,
            role: (member.name === '田中' || member.role === 'admin') ? 'admin' : 'teacher',
            at: Date.now()
        }

        const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64')

        const cookieStore = await cookies()
        const expiryDate = new Date(Date.now() + ONE_YEAR_MS)

        cookieStore.set(COOKIE_NAME, encodedSession, {
            httpOnly: true,
            secure: true,
            maxAge: ONE_YEAR_MS / 1000,
            expires: expiryDate,
            path: '/',
            sameSite: 'lax',
            priority: 'high'
        })

        return { success: true }
    } catch (e) {
        console.error('Admin Member Login Error:', e)
        return { error: 'ログイン処理中にエラーが発生しました。' }
    }
}

export async function logoutAdminMember() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    redirect('/login')
}

export async function getAdminMemberSession() {
    try {
        const cookieStore = await cookies()
        const encoded = cookieStore.get(COOKIE_NAME)?.value
        if (!encoded) return null

        const json = Buffer.from(encoded, 'base64').toString('utf8')
        const data = JSON.parse(json)
        return {
            memberId: data.memberId,
            name: data.name,
            role: data.role
        }
    } catch {
        return null
    }
}

// Fetch all admin members (for settings page display)
export async function getAdminMembers() {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('admin_members')
            .select('name, password')
            .order('name', { ascending: true })

        if (error) {
            console.error('getAdminMembers Error:', error)
            return []
        }
        return data || []
    } catch {
        return []
    }
}

// Fetch member names only (for login dropdown)
export async function getAdminMemberNames() {
    const getCached = unstable_cache(
        async () => {
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
                if (!supabaseUrl || !supabaseServiceKey) return []

                const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)
                const { data, error } = await supabase
                    .from('admin_members')
                    .select('name')
                    .order('name', { ascending: true })

                if (error) return []
                return (data || []).map(m => m.name)
            } catch (e) {
                console.error('getAdminMemberNames Error:', e)
                return []
            }
        },
        ['admin-member-names'],
        { revalidate: 3600, tags: ['admin_members'] }
    )
    return getCached()
}

