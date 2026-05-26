
import { getJlptAnalyticsData } from '../src/app/actions/jlpt.js';

async function refreshSnapshot() {
    console.log('Starting snapshot refresh...');
    const session = { user: { role: 'admin' } }; // Mock session
    try {
        const result = await getJlptAnalyticsData(session);
        if (result.error) {
            console.error('Error:', result.error);
        } else {
            console.log('Snapshot successfully refreshed and pushed to Cloudflare.');
            console.log('Years included:', result.graduationN3PlusRates.map(r => r.year).join(', '));
        }
    } catch (e) {
        console.error('Failed to refresh snapshot:', e);
    }
}

refreshSnapshot();
