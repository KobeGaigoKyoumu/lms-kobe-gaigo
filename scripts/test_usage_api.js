const ImageKit = require("imagekit");
require("dotenv").config({ path: ".env.local" });

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function testUsage() {
    console.log("Testing ImageKit usage fetching...");
    try {
        const details = await imagekit.getAccountDetails();
        console.log("Account Details:", JSON.stringify(details, null, 2));
        console.log("✅ Success!");
    } catch (error) {
        console.error("❌ Failed:", error.message);
        process.exit(1);
    }
}

testUsage();
