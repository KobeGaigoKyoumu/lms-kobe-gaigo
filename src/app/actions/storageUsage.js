"use server";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

/**
 * ImageKit の API から現在の使用量を取得する（1時間キャッシュ）
 */
const _getImageKitUsage = unstable_cache(
    async () => {
        try {
            const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
            if (!privateKey) {
                throw new Error("Missing IMAGEKIT_PRIVATE_KEY");
            }

            const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

            const end = new Date();
            end.setDate(end.getDate() + 1); // Tomorrow to include today's usage
            const start = new Date();
            start.setDate(start.getDate() - 30);

            const startDateStr = start.toISOString().split("T")[0];
            const endDateStr = end.toISOString().split("T")[0];

            const url = `https://api.imagekit.io/v1/accounts/usage?startDate=${startDateStr}&endDate=${endDateStr}`;

            const response = await fetch(url, {
                headers: { Authorization: authHeader },
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error(`ImageKit API error: ${response.statusText}`);
            }

            const data = await response.json();
            const limit = 20 * 1024 * 1024 * 1024; // 20GB limit
            const used = data.mediaLibraryStorageBytes || 0;

            return {
                success: true,
                used,
                limit,
                percent: Math.min(100, Math.round((used / limit) * 100)),
            };
        } catch (error) {
            console.error("ImageKit Usage Error:", error);
            return { success: false, error: error.message };
        }
    }, ["imagekit-usage"], { tags: ['storage-usage'] });

export async function getImageKitUsage() {
    return _getImageKitUsage();
}

/**
 * Supabase Storage API から現在の使用量を取得する（1時間キャッシュ）
 */
const _getSupabaseStorageUsage = unstable_cache(
    async () => {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            const bucketName = "chat-attachments";

            const { data: files, error } = await supabase.storage.from(bucketName).list("", {
                limit: 1000,
            });

            if (error) {
                throw error;
            }

            const used = files.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
            const limit = 1 * 1024 * 1024 * 1024; // 1GB limit

            return {
                success: true,
                used,
                limit,
                percent: Math.min(100, Math.round((used / limit) * 100)),
            };
        } catch (error) {
            console.error("Supabase Storage Usage Error:", error);
            return { success: false, error: error.message };
        }
    },
    ["supabase-storage-usage"],
    { tags: ['storage-usage'] }
);

export async function getSupabaseStorageUsage() {
    return _getSupabaseStorageUsage();
}
