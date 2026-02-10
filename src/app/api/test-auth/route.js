import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
    try {
        const clean = (val) => val?.trim()?.replace(/["']/g, '') || '';
        const clientId = clean(process.env.GOOGLE_DRIVE_CLIENT_ID);
        const clientSecret = clean(process.env.GOOGLE_DRIVE_CLIENT_SECRET);
        const refreshToken = clean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN);

        const debugInfo = {
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasRefreshToken: !!refreshToken,
            clIdLen: clientId?.length,
            clIdStart: clientId?.slice(0, 5),
            clIdEnd: clientId?.slice(-4),
            rtLen: refreshToken?.length,
            rtEnd: refreshToken?.slice(-4),
        };

        if (!clientId || !clientSecret || !refreshToken) {
            return NextResponse.json({ error: 'Missing credentials', debugInfo }, { status: 500 });
        }

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const tokenRes = await oauth2Client.getAccessToken();

        return NextResponse.json({
            success: true,
            message: 'Authentication Successful',
            tokenPrefix: tokenRes.token ? tokenRes.token.substring(0, 10) + '...' : 'No token',
            debugInfo
        });

    } catch (error) {
        console.error('Test Auth Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            response: error.response?.data
        }, { status: 500 });
    }
}
