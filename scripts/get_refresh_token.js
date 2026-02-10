const { google } = require('googleapis');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getRefreshToken() {
    console.log('\n--- Google Drive Refresh Token Generator ---\n');

    try {
        // 1. Get Credentials
        const clientId = await question('Enter your Client ID: ');
        const clientSecret = await question('Enter your Client Secret: ');

        if (!clientId || !clientSecret) {
            console.error('Error: Client ID and Client Secret are required.');
            process.exit(1);
        }

        // 2. Setup OAuth2 Client
        const oauth2Client = new google.auth.OAuth2(
            clientId.trim(),
            clientSecret.trim(),
            'https://developers.google.com/oauthplayground' // Redirect URI must match Cloud Console
        );

        // 3. Generate Auth URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Crucial for getting refresh_token
            scope: ['https://www.googleapis.com/auth/drive'],
            prompt: 'consent' // Force consent to ensure refresh_token is returned
        });

        console.log('\n--------------------------------------------------');
        console.log('Open this URL in your browser:');
        console.log(authUrl);
        console.log('--------------------------------------------------\n');
        console.log('1. Login with the Google Account you want to use for storage.');
        console.log('2. Accept the permissions.');
        console.log('3. You will be redirected to "Google Developers OAuth 2.0 Playground".');
        console.log('4. Copy the "Authorization code" from the box on the left (Step 2 section).');
        console.log('   (It usually starts with "4/...")');

        // 4. Get Code and Exchange for Token
        const code = await question('\nEnter the Authorization Code here: ');

        const { tokens } = await oauth2Client.getToken(code.trim());

        console.log('\n--------------------------------------------------');
        console.log('SUCCESS! Here is your new Refresh Token:');
        console.log('\n' + tokens.refresh_token + '\n');
        console.log('--------------------------------------------------');
        console.log('Please update your Vercel Environment Variables with:');
        console.log(`GOOGLE_DRIVE_CLIENT_ID=${clientId.trim()}`);
        console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${clientSecret.trim()}`);
        console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);

    } catch (error) {
        console.error('\nError exchanging code for token:', error.message);
    } finally {
        rl.close();
    }
}

getRefreshToken();
