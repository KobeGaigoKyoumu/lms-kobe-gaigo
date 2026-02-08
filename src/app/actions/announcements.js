'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

import { r2Client, R2_BUCKET_NAME, getR2PublicUrl } from '@/lib/r2'
import { PutObjectCommand } from "@aws-sdk/client-s3"

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

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `announcements/${fileName}`

    try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Cloudflare R2
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: filePath,
            Body: buffer,
            ContentType: file.type,
        })

        await r2Client.send(command)

        // Get Public URL via R2 Domain
        const publicUrl = getR2PublicUrl(filePath)

        return {
            success: true,
            file: {
                name: file.name,
                url: publicUrl,
                path: filePath
            }
        }
    } catch (err) {
        console.error('R2 Announcement Upload Error:', err)
        return { success: false, error: 'アップロードに失敗しました (R2)' }
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
            const keys = announcement.file_urls
                .map(f => f.path)
                .filter(Boolean)

            if (keys.length > 0) {
                const { DeleteObjectsCommand } = require("@aws-sdk/client-s3")
                const deleteCommand = new DeleteObjectsCommand({
                    Bucket: R2_BUCKET_NAME,
                    Delete: {
                        Objects: keys.map(k => ({ Key: k }))
                    }
                })
                await r2Client.send(deleteCommand)
            }
        }

        return { success: true }
    } catch (err) {
        console.error('Unexpected Delete Error:', err)
        return { success: false, error: err.message }
    }
}
