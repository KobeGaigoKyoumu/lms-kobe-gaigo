'use server'

/**
 * Pushes a data snapshot to Cloudflare KV via the Worker.
 * Used for offloading heavy analytics to the edge.
 */
export async function pushCloudflareSnapshot(type, data) {
    const workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
    const apiSecret = process.env.CLOUDFLARE_API_SECRET;

    if (!workerUrl || !apiSecret) {
        console.error('Missing Cloudflare Worker configuration for snapshotting');
        return { success: false, error: 'Config missing' };
    }

    let targetUrl = workerUrl;
    if (!targetUrl.startsWith('http')) {
        targetUrl = `https://${targetUrl}`;
    }

    try {
        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiSecret}`
            },
            body: JSON.stringify({
                action: 'update-snapshot',
                type,
                data
            })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to push snapshot: ${errText}`);
        }

        console.log(`Successfully pushed ${type} snapshot to Cloudflare`);
        return { success: true };
    } catch (error) {
        console.error('Cloudflare Snapshopt Push Error:', error);
        return { success: false, error: error.message };
    }
}
/**
 * Retrieves a data snapshot from Cloudflare KV via the Worker.
 * Used as a secondary cache layer to reduce Supabase/DB communication.
 */
export async function getCloudflareSnapshot(type) {
    const workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
    const apiSecret = process.env.CLOUDFLARE_API_SECRET;

    if (!workerUrl || !apiSecret) {
        return null;
    }

    let targetUrl = workerUrl;
    if (!targetUrl.startsWith('http')) {
        targetUrl = `https://${targetUrl}`;
    }

    try {
        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiSecret}`
            },
            body: JSON.stringify({
                action: 'get-snapshot',
                type
            }),
            // Short timeout to avoid hanging the Next.js server
            signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) return null;

        const result = await res.json();
        return result.data || null;
    } catch (error) {
        console.error('Cloudflare Snapshot Fetch Error:', error);
        return null;
    }
}
