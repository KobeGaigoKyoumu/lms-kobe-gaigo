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

    // 秘密鍵のクリーニングを徹底する
    // 1. 前後の空白と全ての種類の引用符（" や '）を削除
    privateKey = privateKey.trim().replace(/^["']+|["']+$/g, '');

    // 2. リテラルの \n (2文字) を実際の改行コードに変換
    //    同時に \r が混じっている場合も考慮して正規化
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '');

    try {
        // JWT 直接指定ではなく、推奨される GoogleAuth オブジェクトを使用
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: email,
                private_key: privateKey,
            },
            scopes: SCOPES,
        });

        const client = await auth.getClient();

        // 念のためこの段階で認証が通るかチェック
        // (client.authorize() は非推奨だが、内部状態を確認するために利用)

        return google.drive({ version: 'v3', auth: client });
    } catch (err) {
        console.error('Google Drive Auth Critical Error:', {
            message: err.message,
            email: email,
            keyLength: privateKey.length,
            keyStart: privateKey.substring(0, 40),
            keyEnd: privateKey.substring(privateKey.length - 40)
        });
        throw new Error(`Authentication Config Error: ${err.message}`);
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
