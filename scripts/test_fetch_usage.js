require("dotenv").config({ path: ".env.local" });

async function testFetch() {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
        console.error("No private key found");
        return;
    }
    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

    try {
        const res = await fetch("https://api.imagekit.io/v1/usage", {
            headers: { Authorization: authHeader }
        });
        console.log("Status:", res.status, res.statusText);
        const text = await res.text();
        console.log("Body:", text);
    } catch (e) {
        console.error(e);
    }
}
testFetch();
