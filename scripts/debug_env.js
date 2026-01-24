const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
        const match = line.match(/^([^=]+)=/);
        if (match) {
            console.log('Key found:', match[1]);
        }
    });
} catch (e) {
    console.error(e);
}
