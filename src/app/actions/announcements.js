'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Initialize Admin Client
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

/**
 * お知らせ用のファイルをアップロードする（サーバーサイドで実行）
 * 
 * @param {FormData} formData - ファイルを含むFormData
 * @returns {Promise<{success: boolean, file: object, error: string}>}
 */
export async function uploadAnnouncementFile(formData) {
    const file = formData.get('file')
    if (!file) {
        return { success: false, error: 'ファイルが見つかりません' }
    }

    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const bucketName = 'chat-attachments' // Share the same bucket

        // ArrayBuffer to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error } = await adminSupabase
            .storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            })

        if (error) throw error

        const { data: { publicUrl } } = adminSupabase
            .storage
            .from(bucketName)
            .getPublicUrl(fileName)

        return {
            success: true,
            file: {
                name: file.name,
                url: publicUrl,
                path: fileName // Store filename as path for deletion
            }
        }
    } catch (err) {
        console.error('Supabase Announcement Upload Error:', err)
        return { success: false, error: `アップロードに失敗しました: ${err.message}` }
    }
}

/**
 * お知らせを新規作成する（サーバーサイドで実行）
 * 
 * @param {object} announcementData - お知らせのデータ
 * @returns {Promise<{success: boolean, data: object, error: string}>}
 */
export async function createAnnouncement(announcementData) {
    if (!SUPABASE_SERVICE_KEY) {
        return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }
    }

    try {
        // Sanitize author_id (allow null for staff accounts)
        const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
        const sanitizedData = {
            ...announcementData,
            author_id: isUUID(announcementData.author_id) ? announcementData.author_id : null
        }

        const { data, error } = await adminSupabase
            .from('announcements')
            .insert(sanitizedData)
            .select()
            .single()

        if (error) throw error

        return { success: true, data }
    } catch (err) {
        console.error('Create Announcement Error:', err)
        return { success: false, error: err.message }
    }
}

/**
 * お知らせを削除する（サーバーサイドで実行）
 * 
 * @param {string} id - 削除するお知らせのID
 * @returns {Promise<{success: boolean, error: string}>}
 */
export async function deleteAnnouncement(id) {
    if (!SUPABASE_SERVICE_KEY) {
        return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }
    }

    try {
        // 1. お知らせのデータを取得して、ファイル添付を確認
        const { data: announcement, error: fetchError } = await adminSupabase
            .from('announcements')
            .select('file_urls')
            .eq('id', id)
            .single()

        if (fetchError) {
            console.error('Fetch for delete error:', fetchError)
            return { success: false, error: 'お知らせが見つかりません' }
        }

        // 2. お知らせを削除
        const { error: deleteError } = await adminSupabase
            .from('announcements')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Delete operation error:', deleteError)
            return { success: false, error: deleteError.message }
        }

        // 3. ストレージ内のファイルも削除
        if (announcement.file_urls && announcement.file_urls.length > 0) {
            const filesToDelete = announcement.file_urls
                .map(f => f.path) // path is the filename
                .filter(Boolean);

            if (filesToDelete.length > 0) {
                const { error: storageError } = await adminSupabase
                    .storage
                    .from('chat-attachments')
                    .remove(filesToDelete)

                if (storageError) console.error('Storage Delete Error:', storageError)
            }
        }

        return { success: true }
    } catch (err) {
        console.error('Unexpected Delete Error:', err)
        return { success: false, error: err.message }
    }
}
