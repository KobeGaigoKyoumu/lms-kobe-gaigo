import { NextResponse } from 'next/server';
import { google } from 'googleapis';

/**
 * Google Drive の画像をサーバー側で取得して返却するプロキシ
 * これにより、CORS や Google のログイン状態に関わらず画像を表示可能にする
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
        return new NextResponse('Missing file ID', { status: 400 });
    }

    try {
        // 認証情報の取得とクリーンアップ
        const clean = (val) => val?.trim()?.replace(/["']/g, '') || '';
        const clientId = clean(process.env.GOOGLE_DRIVE_CLIENT_ID);
        const clientSecret = clean(process.env.GOOGLE_DRIVE_CLIENT_SECRET);
        const refreshToken = clean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN);

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // ファイル情報を取得して MIME タイプを確認
        const fileMetadata = await drive.files.get({
            fileId: fileId,
            fields: 'mimeType, name'
        });

        // 画像ストリームを取得
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        return new NextResponse(response.data, {
            headers: {
                'Content-Type': fileMetadata.data.mimeType || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Disposition': `inline; filename="${encodeURIComponent(fileMetadata.data.name)}"`
            },
        });

    } catch (error) {
        console.error('Image Proxy Error:', error.message);
        return new NextResponse('Failed to load image', { status: 500 });
    }
}
