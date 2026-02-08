const { google } = require('googleapis');

/**
 * 指定されたフォルダとその中身（既存ファイル含む）を「リンクを知っている全員」に公開設定にするスクリプト
 */
async function makeFolderRecursivePublic() {
    // 環境変数の取得
    const clean = (val) => val?.trim()?.replace(/["']/g, '') || '';
    const clientId = clean(process.env.GOOGLE_DRIVE_CLIENT_ID);
    const clientSecret = clean(process.env.GOOGLE_DRIVE_CLIENT_SECRET);
    const refreshToken = clean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
    const folderId = clean(process.env.GOOGLE_DRIVE_FOLDER_ID);

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
        console.error('Error: Missing environment variables.');
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground/');
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    try {
        console.log(`Setting folder ${folderId} to public...`);

        // 1. フォルダ自体の権限設定
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
            supportsAllDrives: true,
        });

        // 2. フォルダ内のファイルをリストアップして個別に権限設定
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        const files = res.data.files;
        if (files && files.length > 0) {
            console.log(`Found ${files.length} files. Setting permissions...`);
            for (const file of files) {
                try {
                    await drive.permissions.create({
                        fileId: file.id,
                        requestBody: {
                            role: 'reader',
                            type: 'anyone',
                        },
                        supportsAllDrives: true,
                    });
                    console.log(`  Set public: ${file.name} (${file.id})`);
                } catch (err) {
                    console.error(`  Failed for ${file.name}:`, err.message);
                }
            }
        }

        console.log('Successfully completed recursive permission update.');
    } catch (error) {
        console.error('Critical Error:', error.message);
        process.exit(1);
    }
}

makeFolderRecursivePublic();
