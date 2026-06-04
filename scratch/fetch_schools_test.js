const https = require('https');

function fetchPage(page) {
    return new Promise((resolve, reject) => {
        const url = `https://school.teraren.com/schools.json?page=${page}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log('Fetching page 1...');
    try {
        const schools = await fetchPage(1);
        console.log(`Fetched ${schools.length} schools on page 1.`);
        if (schools.length > 0) {
            console.log('Sample school:', JSON.stringify(schools[0], null, 2));
        }
    } catch (e) {
        console.error('Error fetching page 1:', e.message);
    }
}

main();
