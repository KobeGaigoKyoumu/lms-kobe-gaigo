require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testAuth() {
    console.log('--- Google Drive Auth Test ---');

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    console.log('Client ID exists:', !!clientId);
    console.log('Client Secret exists:', !!clientSecret);
    console.log('Refresh Token exists:', !!refreshToken);

    if (!clientId || !clientSecret || !refreshToken) {
        console.error('Missing credentials in .env.local');
        return;
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            // 'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        console.log('Attempting to get access token...');
        const tokenRes = await oauth2Client.getAccessToken();

        if (tokenRes.token) {
            console.log('SUCCESS: Access token retrieved!');
            console.log('Token starts with:', tokenRes.token.substring(0, 10) + '...');
        } else {
            console.error('FAILED: No token returned.');
        }

    } catch (error) {
        console.error('ERROR during auth:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
}

testAuth();
