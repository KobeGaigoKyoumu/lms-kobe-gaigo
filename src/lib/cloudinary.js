import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgdkz3ri7',
    api_key: process.env.CLOUDINARY_API_KEY || '299361177628647',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'o68Ti4oruSJBXO1JYEbFZtQizzY',
    secure: true
});

export default cloudinary;
