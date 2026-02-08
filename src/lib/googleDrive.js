/**
 * Google Drive 連携ユーティリティ
 * Vercel の環境変数反映をトリガーするための更新
 */
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Google Drive API クライアントを取得する (OAuth2 方式)
 */
async function getDriveClient() {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing Google Drive OAuth2 credentials (ID, Secret, or Refresh Token)');
    }

    // 診断ログ (エラー時のみ詳細表示)
    const logInfo = {
        clIdLen: clientId?.length,
        clSecLen: clientSecret?.length,
        rtLen: refreshToken?.length,
        clIdStart: clientId?.substring(0, 10),
        rtStart: refreshToken?.substring(0, 5)
    };

    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'https://developers.google.com/oauthplayground/'
        );

        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        // 認証テスト
        await oauth2Client.getAccessToken();

        return google.drive({ version: 'v3', auth: oauth2Client });
    } catch (err) {
        console.error('Google Drive OAuth2 Auth Critical Error:', {
            message: err.message,
            ...logInfo
        });
        throw new Error(`OAuth2 Auth Error: ${err.message}`);
    }
}

/**
 * ファイルを Google Drive にアップロードする
 */
export async function uploadFileToDrive(buffer, fileName, mimeType, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
    try {
        const drive = await getDriveClient();
        const safeFolderId = folderId?.trim();

        const fileMetadata = {
            name: fileName,
            parents: [safeFolderId],
        };
        const media = {
            mimeType: mimeType,
            body: Readable.from(buffer),
        };

        // アップロード実行
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true,
        });

        // 閲覧権限の設定（誰でもリンクを知っていれば閲覧可能）
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
            supportsAllDrives: true,
        });

        return {
            id: response.data.id,
            name: response.data.name,
            url: response.data.webContentLink || response.data.webViewLink,
        };
    } catch (error) {
        console.error('Google Drive Upload Error:', error);
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
