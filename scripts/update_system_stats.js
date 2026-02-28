require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getImageKitUsage() {
    console.log("Fetching ImageKit usage...");
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
}

async function getSupabaseStorageUsage() {
    console.log("Calculating Supabase storage usage...");
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
}

async function run() {
    try {
        const [imageKitResult, supabaseResult] = await Promise.all([
            getImageKitUsage().catch((e) => ({ success: false, error: e.message })),
            getSupabaseStorageUsage().catch((e) => ({ success: false, error: e.message })),
        ]);

        const statsPayload = {
            imageKit: imageKitResult,
            supabase: supabaseResult,
            lastUpdated: new Date().toISOString(),
        };

        console.log("Stats calculated:", JSON.stringify(statsPayload, null, 2));
        console.log("Upserting into system_stats table...");

        const { error } = await supabase.from("system_stats").upsert(
            {
                key: "storage_usage",
                value: statsPayload,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "key" }
        );

        if (error) {
            throw error;
        }

        console.log("Successfully updated system_stats.");
    } catch (err) {
        console.error("Failed to update system stats:", err);
        process.exit(1);
    }
}

run();
