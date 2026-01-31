import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'my_secure_verify_token';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must use Service Role for admin updates

// Init Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * GET: Webhook Verification
 * Facebook sends a challenge to verify the webhook.
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

/**
 * POST: Handle incoming events
 */
export async function POST(req) {
    try {
        const body = await req.json();

        if (body.object === 'page') {
            // Iterate over each entry - there may be multiple if batched
            for (const entry of body.entry) {
                // Get the webhook event. entry.messaging is an array, but usually contains only one event.
                const webhookEvent = entry.messaging[0];
                console.log('Received Webhook Event:', webhookEvent);

                const senderPsid = webhookEvent.sender.id;

                // Check availability of the referral (m.me link with ref param)
                // This can come in 'referral' event or 'postback.referral'
                let referral = webhookEvent.referral;
                if (webhookEvent.postback && webhookEvent.postback.referral) {
                    referral = webhookEvent.postback.referral;
                }

                if (referral && referral.ref) {
                    const studentId = referral.ref;
                    console.log(`Linking Student ID: ${studentId} to PSID: ${senderPsid}`);
                    await linkStudentToPsid(studentId, senderPsid);
                    await sendTextMessage(senderPsid, '連携が完了しました！これから重要なお知らせをお届けします。');
                } else if (webhookEvent.message && webhookEvent.message.text) {
                    // Handle standard text messages - Reply for debugging
                    await sendTextMessage(senderPsid, `メッセージを受け取りました: "${webhookEvent.message.text}"\n\nもし連携をしたい場合は、アプリの設定画面から再度ボタンを押して、画面下の「スタート」ボタンを押してください。`);
                }
            }

            return new NextResponse('EVENT_RECEIVED', { status: 200 });
        } else {
            return new NextResponse('Not Found', { status: 404 });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

/**
 * Link Student ID to Facebook PSID in Supabase
 */
async function linkStudentToPsid(studentId, psid) {
    const { error } = await supabase
        .from('students')
        .update({ facebook_psid: psid })
        .eq('student_id_text', studentId);

    if (error) {
        console.error('Error linking student:', error);
    } else {
        console.log('Successfully linked student.');
    }
}

/**
 * Send a simple text message via Messenger API
 */
async function sendTextMessage(psid, text) {
    const requestBody = {
        recipient: {
            id: psid
        },
        message: {
            text: text
        }
    };

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("Failed to send message:", err);
        }
    } catch (err) {
        console.error("Network error sending message:", err);
    }
}
