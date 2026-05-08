'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidateTag, unstable_cache as next_unstable_cache } from 'next/cache'
import { getAdminMemberSession } from './adminAuth'
import { normalizeClassName } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE'

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

        revalidateTag('announcements', 'max')
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

        revalidateTag('announcements', 'max')

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

function getCachedAnnouncementsInternal() {
  if (!global._cachedAnnouncementsFunc) {
    global._cachedAnnouncementsFunc = next_unstable_cache(
      async () => {
        try {
          const { data, error } = await adminSupabase
            .from('announcements')
            .select(`
              id, title, content, is_pinned, created_at, author_id, sender_name, course_id, file_urls,
              target_type, target_class, target_grade, target_student_ids,
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
      ['announcements-list-v1-final'],
      { tags: ['announcements'], revalidate: 3600 }
    );
  }
  return global._cachedAnnouncementsFunc();
}

export async function getAnnouncements() {
    return await getCachedAnnouncementsInternal()
}

/**
 * 学生向けのお知らせを取得する（フィルタリング機能付き）
 */
export async function getStudentAnnouncements({ studentId, className, academicYear }) {
    if (!SUPABASE_SERVICE_KEY) {
        return { data: [], error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }
    }

    try {
        const { data, error } = await getAnnouncements();
        if (error) throw new Error(error);

        const now = new Date();
        const currentYear = now.getFullYear();
        const isBeforeApril = now.getMonth() < 3; // 0, 1, 2 is Jan, Feb, Mar
        const academicYearBase = isBeforeApril ? currentYear - 1 : currentYear;
        const studentGrade = (academicYearBase - academicYear + 1).toString();

        // クラス名の正規化
        const normStudentClass = normalizeClassName(className);

        console.log(`[getStudentAnnouncements] Using cached announcements for studentId=${studentId}, grade=${studentGrade}, normalizedClass=${normStudentClass}`);

        // 手動フィルタリング
        const filteredAnnouncements = (data || []).filter(a => {
            const type = (a.target_type || 'all').toLowerCase();
            
            // 全体向け
            if (type === 'all' || type === '全体' || !a.target_type) {
                return true;
            }

            // 学年向け
            if (type === 'grade' || type === '学年') {
                const match = String(a.target_grade) === studentGrade;
                if (!match) console.log(`[getStudentAnnouncements] Skip grade: target=${a.target_grade}, student=${studentGrade}`);
                return match;
            }

            // クラス向け
            if (type === 'class' || type === 'クラス') {
                const normTargetClass = normalizeClassName(a.target_class || '');
                const match = normTargetClass === normStudentClass;
                if (!match) console.log(`[getStudentAnnouncements] Skip class: target=${normTargetClass}, student=${normStudentClass}`);
                return match;
            }

            // 個人向け
            if ((type === 'individual' || type === '個人') && Array.isArray(a.target_student_ids)) {
                const match = a.target_student_ids.includes(studentId);
                if (!match) console.log(`[getStudentAnnouncements] Skip individual: studentId=${studentId} not in ${a.target_student_ids}`);
                return match;
            }

            console.log(`[getStudentAnnouncements] Unknown target type: ${type}`);
            return false;
        });

        console.log(`[getStudentAnnouncements] Found ${data?.length || 0} total, filtered to ${filteredAnnouncements.length}`);

        return { 
            data: filteredAnnouncements.map(a => ({
                ...a,
                author_name: a.author?.full_name || a.sender_name || '管理者'
            })), 
            error: null 
        };
    } catch (err) {
        console.error('getStudentAnnouncements Error:', err);
        return { data: [], error: err.message };
    }
}
