'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * お知らせ用のファイルをアップロードする（サーバーサイドで実行）
 * サービスロールキーを使用するため、ストレージのRLS設定（SQL）が不要になります。
 * 
 * @param {FormData} formData - ファイルを含むFormData
 * @returns {Promise<{success: boolean, file: object, error: string}>}
 */
export async function uploadAnnouncementFile(formData) {
    if (!SUPABASE_SERVICE_KEY) {
        return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }
    }

    const file = formData.get('file')
    if (!file) {
        return { success: false, error: 'ファイルが見つかりません' }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `announcements/${fileName}`

    try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { data, error: uploadError } = await supabase.storage
            .from('announcements')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
            console.error('Server Upload Error:', uploadError)
            return { success: false, error: uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('announcements')
            .getPublicUrl(filePath)

        return {
            success: true,
            file: {
                name: file.name,
                url: publicUrl,
                path: filePath
            }
        }
    } catch (err) {
        console.error('Unexpected Upload Error:', err)
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

        // 3. ストレージ内のファイルも削除（オプショナルだがクリーンアップのため）
        if (announcement.file_urls && announcement.file_urls.length > 0) {
            const paths = announcement.file_urls
                .map(f => f.path)
                .filter(Boolean)

            if (paths.length > 0) {
                await supabase.storage
                    .from('announcements')
                    .remove(paths)
            }
        }

        return { success: true }
    } catch (err) {
        console.error('Unexpected Delete Error:', err)
        return { success: false, error: err.message }
    }
}
