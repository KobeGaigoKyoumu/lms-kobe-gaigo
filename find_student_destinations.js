const data = require('./src/data/career_stats_v2.json');

const targets = [
    '唐 成軒', '趙 翔', '張 梓業', '楊 英健', // 2020
    '王 磊', '劉 育徳' // 2022
];

console.log('Searching for students...');
targets.forEach(name => {
    // Search in topDestinations (where we pushed students)
    let found = false;
    data.topDestinations.forEach(dest => {
        if (dest.students) {
            const student = dest.students.find(s => s.name.includes(name.split(' ')[0]) && s.name.includes(name.split(' ')[1]));
            // Simple fuzzy match for names with spaces
            // Or exact match
            const s2 = dest.students.find(s => s.name === name);

            if (s2) {
                console.log(`[FOUND] ${name} -> Dest: ${dest.name}`);
                found = true;
            }
        }
    });
    if (!found) console.log(`[NOT FOUND] ${name}`);
});
