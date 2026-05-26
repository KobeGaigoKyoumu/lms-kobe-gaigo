
import { getAccurateGraduationStats } from './src/lib/jlpt.js';

async function test() {
    try {
        const stats = await getAccurateGraduationStats();
        console.log('Stats length:', stats.stats.length);
        console.log('Stats:', JSON.stringify(stats.stats, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
