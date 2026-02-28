require("dotenv").config({ path: ".env.local" });

async function check() {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const authHeader = "Basic " + Buffer.from(privateKey + ":").toString("base64");

    // Need to get last ~90 days because API requires startDate/endDate
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const startDateStr = start.toISOString().split("T")[0];
    const endDateStr = end.toISOString().split("T")[0];

    const url = `https://api.imagekit.io/v1/accounts/usage?startDate=${startDateStr}&endDate=${endDateStr}`;

    console.log("Fetching:", url);
    const res = await fetch(url, { headers: { Authorization: authHeader } });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
check();
