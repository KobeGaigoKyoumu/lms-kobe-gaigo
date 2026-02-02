const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TOKEN) {
    console.error('Error: TELEGRAM_BOT_TOKEN is not defined in .env.local');
    process.exit(1);
}

const commands = [
    { command: 'grades', description: '成績を確認' },
    { command: 'attendance', description: '出席率を確認' },
    { command: 'announcements', description: 'お知らせを確認' },
    { command: 'profile', description: 'プロフィールを確認' },
    { command: 'calendar', description: 'カレンダーを確認' },
    { command: 'help', description: '使い方' }
];

async function callApi(method, body, isMultipart = false) {
    const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
    const options = {
        method: 'POST',
    };

    if (isMultipart) {
        options.body = body;
        // Headers are handled automatically by FormData, but we need to pass them if using fetch with FormData ?? 
        // node-fetch or native fetch with FormData works differently.
        // Let's rely on the environment's fetch. In recent Node, fetch handles FormData.
    } else {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        throw new Error(`Network error calling ${method}: ${error.message}`);
    }
}

async function configureBot() {
    console.log('Configuring Telegram Bot Profile & Commands...');

    try {
        // 1. Set Commands
        console.log('Setting commands...');
        const cmdResult = await callApi('setMyCommands', { commands });
        if (cmdResult.ok) console.log('✅ Commands updated (added /my_id)');
        else console.error('❌ Failed to set commands:', cmdResult);

        // 2. Set Description (What the bot does - shown in "What can this bot do?" or empty chat)
        console.log('Setting description...');
        const descResult = await callApi('setMyDescription', {
            description: '神戸外語LMSの公式通知ボットです。\n成績の手動確認や、出席率低下のアラート、重要なお知らせを配信します。'
        });
        if (descResult.ok) console.log('✅ Bot description updated');
        else console.error('❌ Failed to set description:', descResult);

        // 3. Set Short Description (Shown on the "start" screen)
        console.log('Setting short description...');
        const shortDescResult = await callApi('setMyShortDescription', {
            short_description: '神戸外語LMS 公式ボット'
        });
        if (shortDescResult.ok) console.log('✅ Bot short description updated');
        else console.error('❌ Failed to set short description:', shortDescResult);

        // 4. Set Userpic (Profile Photo)
        // We use the 'form-data' library to handle file uploads in Node environment
        console.log('Setting profile photo...');
        try {
            const photoPath = path.join(__dirname, '../public/icon.png');
            if (fs.existsSync(photoPath)) {
                const form = new FormData();
                form.append('photo', fs.createReadStream(photoPath));

                // For Node.js fetch with FormData, we need specific handling or use the library's submit/headers
                // Easier way in Node script without complex fetch-polyfill is to use the form-data submit or axios.
                // But let's try the fetch approach with implicit headers if possible, or fallback manually.
                // Actually, passing FormData to body in global fetch (Node 18+) works.

                // Note: Node's native fetch might be strict about FormData. 
                // Let's try to construct request manually if fetch fails or use a simpler approach.
                // Re-using the logic, but 'form-data' package headers need to be extracted.

                const response = await fetch(`https://api.telegram.org/bot${TOKEN}/setMyProfilePhoto`, {
                    method: 'POST',
                    body: form,
                    headers: form.getHeaders()
                });
                const photoResult = await response.json();

                if (photoResult.ok) console.log('✅ Bot profile photo updated');
                else console.error('❌ Failed to set profile photo:', photoResult);

            } else {
                console.log('⚠️ icon.png not found, skipping photo upload.');
            }
        } catch (e) {
            console.error('⚠️ Failed to upload photo (File system or Network issue):', e.message);
        }

        console.log('\nConfiguration complete!');

    } catch (error) {
        console.error('Script Error:', error);
    }
}

configureBot();
