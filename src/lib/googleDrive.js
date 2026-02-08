import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Google Drive API クライアントを取得する
 */
async function getDriveClient() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
        null,
        process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        SCOPES
    );
    return google.drive({ version: 'v3', auth });
}

/**
 * ファイルを Google Drive にアップロードする
 * @param {Buffer} buffer ファイル内容
 * @param {string} fileName ファイル名
 * @param {string} mimeType MIMEタイプ
 * @param {string} folderId フォルダID
 * @returns {Object} アップロードされたファイルの情報
 */
export async function uploadFileToDrive(buffer, fileName, mimeType, folderId = process.env.GOOGLE_DRIVE_FOLDER_ID) {
    const drive = await getDriveClient();

    // 1. アップロード
    const fileMetadata = {
        name: fileName,
        parents: [folderId],
    };
    const media = {
        mimeType: mimeType,
        body: require('stream').Readable.from(buffer),
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink',
    });

    // 2. 権限設定（誰でも閲覧可能にする。通常は特定ドメインのみにするのが安全だがLMSなので公開URLを使用）
    // セキュリティを高める場合は、バックエンド経由でストリーム配信する仕組みが必要
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
        // webContentLink は直接ダウンロード用のURL
        url: response.data.webContentLink || response.data.webViewLink,
    };
}

/**
 * Google Drive からファイルを削除する
 * @param {string} fileId 
 */
export async function deleteFileFromDrive(fileId) {
    if (!fileId) return;
    const drive = await getDriveClient();
    try {
        await drive.files.delete({ fileId });
    } catch (error) {
        console.error('Google Drive delete error:', error);
    }
}
