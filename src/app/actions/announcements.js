'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

import { uploadFileToDrive } from '@/lib/googleDrive'

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
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Google Drive
        const uploadedFile = await uploadFileToDrive(
            buffer,
            file.name,
            file.type
        )

        return {
            success: true,
            file: {
                name: uploadedFile.name,
                url: uploadedFile.url,
                path: uploadedFile.id // Google Drive では ID を path として扱う
            }
        }
    } catch (err) {
        console.error('Google Drive Announcement Upload Error:', err)
        return { success: false, error: 'アップロードに失敗しました (Google Drive)' }
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    try {
        // 1. お知らせのデータを取得して、ファイル添付を確認（あとでStorageから消すため）
        const { data: announcement, error: fetchError } = await supabase
            .from('announcements')
            .select('file_urls')
            .eq('id', id)
            .single()

        if (fetchError) {
            console.error('Fetch for delete error:', fetchError)
            return { success: false, error: 'お知らせが見つかりません' }
        }

        // 2. お知らせを削除
        const { error: deleteError } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Delete operation error:', deleteError)
            return { success: false, error: deleteError.message }
        }

        // 3. ストレージ内のファイルも削除
        if (announcement.file_urls && announcement.file_urls.length > 0) {
            const { deleteFileFromDrive } = require('@/lib/googleDrive')
            for (const fileObj of announcement.file_urls) {
                if (fileObj.path) { // path に Google Drive の ID が入っている想定
                    await deleteFileFromDrive(fileObj.path)
                }
            }
        }

        return { success: true }
    } catch (err) {
        console.error('Unexpected Delete Error:', err)
        return { success: false, error: err.message }
    }
}
