
import { getAccurateGraduationStats } from '../src/lib/jlpt.js';

async function test() {
    try {
        const stats = await getAccurateGraduationStats();
        console.log('Stats count:', stats.stats.length);
        stats.stats.forEach(s => {
            console.log(`${s.year}: ${s.totalStudents} students, ${s.n3PlusStudents} N3+ (${s.source || 'unknown'})`);
        });
    } catch (e) {
        console.error(e);
    }
}

test();
