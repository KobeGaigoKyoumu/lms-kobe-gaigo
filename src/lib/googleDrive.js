/**
 * Google Drive 連携ユーティリティ
 * 環境変数の GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL と GOOGLE_DRIVE_PRIVATE_KEY を使用して認証します。
 */
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Google Drive API クライアントを取得する
 */
async function getDriveClient() {
    const email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim();
    let privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

    if (!email || !privateKey) {
        throw new Error(`Missing Google Drive credentials (Email: ${!!email}, Key: ${!!privateKey})`);
    }

    // Handle different ways the key might be stored in environment variables
    // 1. Remove surrounding quotes
    privateKey = privateKey.trim().replace(/^"|"$/g, '');
    // 2. Handle both actual newlines and literal \n sequences
    privateKey = privateKey.replace(/\\n/g, '\n');

    try {
        const auth = new google.auth.JWT(
            email,
            null,
            privateKey,
            SCOPES
        );

        // Explicitly check if auth is valid to get better error messages
        await auth.authorize();

        return google.drive({ version: 'v3', auth });
    } catch (err) {
        console.error('Google Drive Auth Error Details:', {
            message: err.message,
            email: email,
            keyPrefix: privateKey.substring(0, 30),
            keySuffix: privateKey.substring(privateKey.length - 30)
        });
        throw new Error(`Authentication failed: ${err.message}`);
    }
}

/**
 * ファイルを Google Drive にアップロードする
 */
export async function uploadFileToDrive(buffer, fileName, mimeType, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
    try {
        const drive = await getDriveClient();

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };
        const media = {
            mimeType: mimeType,
            body: Readable.from(buffer),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
        });

        // 閲覧権限の設定
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        return {
            id: response.data.id,
            name: response.data.name,
            url: response.data.webContentLink || response.data.webViewLink,
        };
    } catch (error) {
        console.error('Google Drive Upload logic error:', error);
        throw error;
    }
}

/**
 * Google Drive からファイルを削除する
 */
export async function deleteFileFromDrive(fileId) {
    if (!fileId) return;
    try {
        const drive = await getDriveClient();
        await drive.files.delete({ fileId });
    } catch (error) {
        console.error('Google Drive delete error:', error);
    }
}
