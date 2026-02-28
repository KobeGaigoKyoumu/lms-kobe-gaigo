"use server";

import imagekit from "@/lib/imagekit";
import { createClient } from "@supabase/supabase-js";

/**
 * DBの system_stats テーブルから ImageKit の使用量を取得する（軽量化）
 */
export async function getImageKitUsage() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from("system_stats")
            .select("value")
            .eq("key", "storage_usage")
            .single();

        if (error) {
            console.error("Failed to read system_stats for ImageKit:", error);
            return { success: false, error: "Failed to read cached data" };
        }

        if (data && data.value && data.value.imageKit) {
            return data.value.imageKit;
        }

        return { success: false, error: "Data not found" };
    } catch (error) {
        console.error("ImageKit Usage Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * DBの system_stats テーブルから Supabase Storage の使用量を取得する（軽量化）
 */
export async function getSupabaseStorageUsage() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from("system_stats")
            .select("value")
            .eq("key", "storage_usage")
            .single();

        if (error) {
            console.error("Failed to read system_stats for Supabase:", error);
            return { success: false, error: "Failed to read cached data" };
        }

        if (data && data.value && data.value.supabase) {
            return data.value.supabase;
        }

        return { success: false, error: "Data not found" };
    } catch (error) {
        console.error("Supabase Storage Usage Error:", error);
        return { success: false, error: error.message };
    }
}
