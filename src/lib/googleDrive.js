/**
 * Google Drive 連携ユーティリティ
 * Vercel の環境変数反映をトリガーするための更新
 */
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Google Drive API クライアントを取得する
 */
async function getDriveClient() {
    const email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.trim();
    const rawKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY || '';
    const rawLength = rawKey.length;
    let privateKey = rawKey;

    if (!email || !privateKey) {
        throw new Error(`Missing Google Drive credentials (Email: ${!!email}, Key: ${!!privateKey})`);
    }

    // 診断ログ
    if (rawLength < 1000) {
        console.warn('WARNING: GOOGLE_DRIVE_PRIVATE_KEY seems too short:', rawLength);
    }

    // 秘密鍵の再構築 (PEMフォーマットの正規化)
    // どんな形式で環境変数に入っていても、Base64部分だけを抜き出してPEM形式に組み直します
    let base64Part = privateKey
        .replace(/-----BEGIN[^-]+-----/g, '')
        .replace(/-----END[^-]+-----/g, '')
        .replace(/\\n/g, '')    // リテラルの \n を削除
        .replace(/\s/g, '')      // スペース、タブ、改行をすべて削除
        .replace(/["']/g, '');   // 引用符を削除

    const header = '-----BEGIN PRIVATE KEY-----';
    const footer = '-----END PRIVATE KEY-----';
    const lines = base64Part.match(/.{1,64}/g) || [];
    const normalizedKey = `${header}\n${lines.join('\n')}\n${footer}\n`;

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: email,
                private_key: normalizedKey,
            },
            scopes: SCOPES,
        });

        const client = await auth.getClient();

        // 実際のアップロード前に認証をテストして、エラーを明確にする
        await client.authorize();

        return google.drive({ version: 'v3', auth: client });
    } catch (err) {
        console.error('Google Drive Auth Critical Error:', {
            message: err.message,
            email: email,
            keyLength: normalizedKey.length,
            keyStart: normalizedKey.substring(0, 40),
            keyEnd: normalizedKey.substring(normalizedKey.length - 20)
        });
        throw new Error(`Auth Error: ${err.message}`);
    }
}

/**
 * ファイルを Google Drive にアップロードする
 */
export async function uploadFileToDrive(buffer, fileName, mimeType, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
    try {
        const drive = await getDriveClient();

        console.log('--- Google Drive Upload Diagnostic ---');
        console.log('Target Folder ID:', folderId);

        // 1. まずフォルダにアクセス可能か直接確認する
        try {
            const folderInfo = await drive.files.get({
                fileId: folderId,
                fields: 'id, name, owners',
                supportsAllDrives: true
            });
            console.log('Folder access confirmed:', folderInfo.data.name);
        } catch (fErr) {
            console.error('Folder check failed! The service account cannot "SEE" this folder ID.');
            console.error('Error details:', fErr.message);
            if (fErr.status === 404) {
                throw new Error(`The folder ID "${folderId}" was not found or the service account lacks permission to see it. Please double check the ID and sharing settings.`);
            }
            throw fErr;
        }

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };
        const media = {
            mimeType: mimeType,
            body: Readable.from(buffer),
        };

        // 2. アップロード実行
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true, // 共有ドライブや共有フォルダ対応
        });

        console.log('Upload successful! File ID:', response.data.id);

        // 3. 閲覧権限の設定
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
