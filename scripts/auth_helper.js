const { google } = require('googleapis');

const args = process.argv.slice(2);
const mode = args[0]; // 'url' or 'token'
const clientId = '77621947846-rvmai76gjk935r23u8gorsrirkum5n7l.apps.googleusercontent.com';
const clientSecret = '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';

const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
);

async function main() {
    if (mode === 'url') {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/drive'],
            prompt: 'consent'
        });
        console.log('AUTH_URL_START');
        console.log(authUrl);
        console.log('AUTH_URL_END');
    } else if (mode === 'token') {
        const code = args[1];
        if (!code) {
            console.error('Code is required');
            return;
        }
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log('REFRESH_TOKEN_START');
            console.log(tokens.refresh_token);
            console.log('REFRESH_TOKEN_END');
        } catch (error) {
            console.error('Error exchanging token:', error.message);
        }
    } else {
        console.log('Usage: node auth_helper.js [url|token] [code]');
    }
}

main();
