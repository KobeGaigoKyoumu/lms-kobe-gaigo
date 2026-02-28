const ImageKit = require("imagekit");
require("dotenv").config({ path: ".env.local" });

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function testConnection() {
    console.log("Testing ImageKit connection...");
    try {
        // List files (dry run test)
        const files = await imagekit.listFiles({
            limit: 1,
        });
        console.log("✅ Connection successful!");
        console.log("Recent files count:", files.length);
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        process.exit(1);
    }
}

testConnection();
