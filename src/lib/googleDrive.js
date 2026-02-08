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

    // 秘密鍵の再構築 (PEMフォーマットの正規化)
    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';

    let base64Part = privateKey
        .replace(header, '')
        .replace(footer, '')
        .replace(/\\n/g, '')    // リテラルの \n を削除
        .replace(/\s/g, '')      // スペース、タブ、実際の改行をすべて削除
        .replace(/["']/g, '');   // 引用符を削除

    // PEM標準に従い、64文字ごとに改行を入れる
    const lines = base64Part.match(/.{1,64}/g) || [];
    const normalizedKey = `${header}\n${lines.join('\n')}\n${footer}\n`;

    try {
        // JWT 直接指定ではなく、推奨される GoogleAuth オブジェクトを使用
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: email,
                private_key: normalizedKey,
            },
            scopes: SCOPES,
        });

        const client = await auth.getClient();
        return google.drive({ version: 'v3', auth: client });
    } catch (err) {
        console.error('Google Drive Auth Critical Error:', {
            message: err.message,
            email: email,
            keyLength: normalizedKey.length,
            keyStart: normalizedKey.substring(0, 40),
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
