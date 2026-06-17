const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(path.join(__dirname, '../')).filter(f => f.endsWith('.xlsx') || f.endsWith('.xlsm'));
console.log('=== Excel Files in Workspace ===');
files.forEach(f => {
    console.log(f);
    // Char code of spaces
    const chars = [];
    for (let i = 0; i < f.length; i++) {
        chars.push(f.charCodeAt(i));
    }
    console.log(`  Length: ${f.length}, Char codes: ${chars.join(', ')}`);
});
