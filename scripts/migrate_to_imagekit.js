const { createClient } = require("@supabase/supabase-js");
const ImageKit = require("imagekit");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function migrate() {
    console.log("Starting migration from Supabase to ImageKit...");

    const bucketName = "chat-attachments";

    // 1. List all files in Supabase
    console.log(`Listing files in bucket: ${bucketName}...`);
    const { data: files, error: listError } = await supabase.storage.from(bucketName).list("", { limit: 1000 });

    if (listError) {
        console.error("Error listing files:", listError);
        return;
    }

    const urlMap = new Map(); // Old path -> New ImageKit URL

    for (const file of files) {
        // Skip directories
        if (!file.id) continue;

        console.log(`Processing: ${file.name}...`);

        // 2. Download from Supabase
        const { data: blob, error: downloadError } = await supabase.storage.from(bucketName).download(file.name);

        if (downloadError) {
            console.error(`Error downloading ${file.name}:`, downloadError);
            continue;
        }

        const buffer = Buffer.from(await blob.arrayBuffer());

        // 3. Upload to ImageKit
        try {
            const uploadResponse = await imagekit.upload({
                file: buffer,
                fileName: file.name,
                folder: "/migrated-from-supabase",
                useUniqueFileName: false, // Keep same name for mapping if possible, or use ID
            });

            console.log(`✅ Uploaded to ImageKit: ${uploadResponse.url}`);
            urlMap.set(file.name, uploadResponse.url);
        } catch (uploadError) {
            console.error(`Error uploading ${file.name} to ImageKit:`, uploadError);
        }
    }

    // 4. Update Database
    console.log("Updating database references...");

    // Update homework_submissions
    const { data: submissions } = await supabase.from("homework_submissions").select("id, file_urls");
    for (const sub of (submissions || [])) {
        if (Array.isArray(sub.file_urls)) {
            let changed = false;
            const newFileUrls = sub.file_urls.map(fileObj => {
                // fileObj is { name, url, path }
                const fileName = fileObj.path ? fileObj.path.split("/").pop() : fileObj.url.split("/").pop();
                if (urlMap.has(fileName)) {
                    changed = true;
                    return { ...fileObj, url: urlMap.get(fileName) };
                }
                return fileObj;
            });

            if (changed) {
                await supabase.from("homework_submissions").update({ file_urls: newFileUrls }).eq("id", sub.id);
                console.log(`Updated submission ID: ${sub.id}`);
            }
        }
    }

    // Update messages
    const { data: messages } = await supabase.from("messages").select("id, attachment_url");
    for (const msg of (messages || [])) {
        if (msg.attachment_url) {
            const fileName = msg.attachment_url.split("/").pop().split("?")[0];
            if (urlMap.has(fileName)) {
                await supabase.from("messages").update({ attachment_url: urlMap.get(fileName) }).eq("id", msg.id);
                console.log(`Updated message ID: ${msg.id}`);
            }
        }
    }

    // Update announcements
    const { data: announcements } = await supabase.from("announcements").select("id, file_urls");
    for (const ann of (announcements || [])) {
        if (Array.isArray(ann.file_urls)) {
            let changed = false;
            const newFileUrls = ann.file_urls.map(fileObj => {
                const fileName = fileObj.url.split("/").pop().split("?")[0];
                if (urlMap.has(fileName)) {
                    changed = true;
                    return { ...fileObj, url: urlMap.get(fileName) };
                }
                return fileObj;
            });

            if (changed) {
                await supabase.from("announcements").update({ file_urls: newFileUrls }).eq("id", ann.id);
                console.log(`Updated announcement ID: ${ann.id}`);
            }
        }
    }

    console.log("Migration completed!");
}

migrate();
