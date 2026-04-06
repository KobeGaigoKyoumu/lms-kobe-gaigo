'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidateTag, unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'

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
        // Authenticate the user
        const adminMember = await getAdminMemberSession()

        const sanitizedData = {
            ...announcementData,
            author_id: null
        }

        const { data, error } = await adminSupabase
            .from('announcements')
            .insert(sanitizedData)
            .select()
            .single()

        if (error) throw error

        revalidateTag('announcements')
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

        revalidateTag('announcements')

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

/**
 * お知らせ一覧をキャッシュ付きで取得する
 */
const getCachedAnnouncements = unstable_cache(
  async () => {
    try {
      const { data, error } = await adminSupabase
        .from('announcements')
        .select(`
          id, title, content, is_pinned, created_at, author_id, sender_name, course_id, file_urls,
          author:profiles!author_id (
            id,
            full_name,
            avatar_url
          ),
          course:courses (
            id,
            title
          )
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error("getAnnouncements DB error:", error);
        return { data: [], error: error.message }
      }
      
      return { data: data || [], error: null }
    } catch (e) {
      console.error("getAnnouncements exception:", e);
      return { data: [], error: e.message }
    }
  },
  ['announcements-list-v1'],
  { tags: ['announcements'] }
)

export async function getAnnouncements() {
    return await getCachedAnnouncements()
}

/**
 * 学生向けのお知らせを取得する（フィルタリング機能付き）
 */
export async function getStudentAnnouncements({ studentId, className, academicYear }) {
    if (!SUPABASE_SERVICE_KEY) {
        return { data: [], error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }
    }

    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const isBeforeApril = now.getMonth() < 3; // 0-indexed, 3 is April
        const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear;
        const studentGrade = (academicYearBase - academicYear + 1).toString();

        const { data, error } = await adminSupabase
            .from('announcements')
            .select(`
                id, title, content, is_pinned, created_at, sender_name, target_type, target_class, target_grade, target_student_ids, file_urls,
                author:profiles!author_id (
                    full_name,
                    avatar_url
                )
            `)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 手動フィルタリング (複雑なOR条件をJS側で処理)
        const filteredAnnouncements = (data || []).filter(a => {
            // 全体向け
            if (a.target_type === 'all' || !a.target_type) return true;

            // 学年向け
            if (a.target_type === 'grade' && String(a.target_grade) === studentGrade) return true;

            // クラス向け
            if (a.target_type === 'class') {
                const normTargetClass = (a.target_class || '').replace(/\s+/g, '');
                const normStudentClass = (className || '').replace(/\s+/g, '');
                if (normTargetClass === normStudentClass) return true;
            }

            // 個人向け
            if (a.target_type === 'individual' && Array.isArray(a.target_student_ids)) {
                if (a.target_student_ids.includes(studentId)) return true;
            }

            return false;
        });

        return { data: filteredAnnouncements, error: null };
    } catch (err) {
        console.error('getStudentAnnouncements Error:', err);
        return { data: [], error: err.message };
    }
}
