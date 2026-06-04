const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dgdkz3ri7',
    api_key: '299361177628647',
    api_secret: 'o68Ti4oruSJBXO1JYEbFZtQizzY',
    secure: true
});

async function test() {
    try {
        console.log('Testing Cloudinary Admin API...');
        const usage = await cloudinary.api.usage();
        console.log('Usage result:', JSON.stringify(usage, null, 2));
    } catch (e) {
        console.error('Cloudinary API Error:', e);
    }
}

test();
