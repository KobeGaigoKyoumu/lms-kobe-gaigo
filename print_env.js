const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const keys = [];
content.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    keys.push(parts[0].trim());
});
console.log("ENV KEYS:", keys);
