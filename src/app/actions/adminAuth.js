'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'

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
        const cookie = cookieStore.get(COOKIE_NAME)
        if (!cookie || !cookie.value) {
            console.warn('getAdminMemberSession: No session cookie found')
            return null
        }

        try {
            const json = Buffer.from(cookie.value, 'base64').toString('utf8')
            if (!json) {
                console.warn('getAdminMemberSession: Empty session JSON during decode')
                return null
            }
            
            const data = JSON.parse(json)
            if (!data || typeof data !== 'object') {
                console.warn('getAdminMemberSession: Invalid session data format')
                return null
            }

            return {
                memberId: data.memberId || null,
                name: data.name || '不明',
                role: data.role || 'teacher'
            }
        } catch (innerError) {
            console.error('getAdminMemberSession Decode Error:', innerError)
            return null
        }
    } catch (e) {
        console.error('getAdminMemberSession Critical Error:', e)
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
// Cache the member names list
const getCachedMemberNames = unstable_cache(
    async () => {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING'
            
            if (!supabaseUrl || supabaseServiceKey === 'MISSING') {
                console.warn('getAdminMemberNames: Missing Supabase environment variables');
                return []
            }

            const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey)
            const { data, error } = await supabase
                .from('admin_members')
                .select('name')
                .order('name', { ascending: true })

            if (error) {
                console.error('getAdminMemberNames DB Error:', error);
                return []
            }
            return (data || []).map(m => m.name)
        } catch (e) {
            console.error('getAdminMemberNames (Cache) Error:', e)
            return []
        }
    },
    ['admin-member-names-v2'],
    { tags: ['admin_members'] }
)

// Fetch member names only (for login dropdown)
export async function getAdminMemberNames() {
    try {
        return await getCachedMemberNames()
    } catch (e) {
        console.error('getAdminMemberNames Wrapper Error:', e)
        return []
    }
}

