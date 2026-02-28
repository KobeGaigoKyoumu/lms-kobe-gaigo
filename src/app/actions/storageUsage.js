"use server";

import imagekit from "@/lib/imagekit";
import { createClient } from "@supabase/supabase-js";

/**
 * ImageKit の使用量を取得する
 */
export async function getImageKitUsage() {
    try {
        const end = new Date();
        end.setDate(end.getDate() + 1); // API仕様の endDate は排他的なため、明日を指定して本日のデータを含める

        const start = new Date();
        start.setDate(start.getDate() - 30); // 過去30日を指定（APIの仕様上必須）

        const startDateStr = start.toISOString().split("T")[0];
        const endDateStr = end.toISOString().split("T")[0];

        const url = `https://api.imagekit.io/v1/accounts/usage?startDate=${startDateStr}&endDate=${endDateStr}`;

        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

        const response = await fetch(url, {
            headers: {
                Authorization: authHeader,
            },
        });

        if (!response.ok) {
            throw new Error(`ImageKit API error: ${response.statusText}`);
        }

        const data = await response.json();

        // 無料枠は 20GB
        const limit = 20 * 1024 * 1024 * 1024;
        const used = data.storageUsed || 0;

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
}

/**
 * Supabase Storage (chat-attachments) の使用量を概算する
 */
export async function getSupabaseStorageUsage() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const bucketName = "chat-attachments";

        // 全ファイルを取得してサイズを合計（ページネーション対応が必要な規模になるまではこれで十分）
        const { data: files, error } = await supabase.storage.from(bucketName).list("", {
            limit: 1000,
        });

        if (error) throw error;

        const used = files.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
        // 無料枠は 1GB (1 * 1024 * 1024 * 1024 bytes)
        const limit = 1 * 1024 * 1024 * 1024;

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
}
