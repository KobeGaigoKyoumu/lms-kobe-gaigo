const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: 'dgdkz3ri7',
    api_key: '299361177628647',
    api_secret: 'o68Ti4oruSJBXO1JYEbFZtQizzY',
    secure: true
});

async function testUpload() {
    try {
        console.log('Testing Cloudinary upload_stream with configured credentials...');
        
        // Create a dummy 1KB text file buffer
        const buffer = Buffer.from('Hello Cloudinary integration test from LMS!');
        
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'test-folder',
                    resource_type: 'auto'
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });
        
        console.log('Upload success! Result:', JSON.stringify(uploadResult, null, 2));
    } catch (e) {
        console.error('Cloudinary Upload Error:', e);
    }
}

testUpload();
