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
                if (!entry.messaging) continue;

                for (const webhookEvent of entry.messaging) {
                    console.log('Received Webhook Event:', JSON.stringify(webhookEvent, null, 2));

                    const senderPsid = webhookEvent.sender.id;

                    // 1. Check for Referral (m.me link)
                    let studentId = null;

                    if (webhookEvent.referral && webhookEvent.referral.ref) {
                        studentId = webhookEvent.referral.ref;
                    } else if (webhookEvent.postback && webhookEvent.postback.referral && webhookEvent.postback.referral.ref) {
                        studentId = webhookEvent.postback.referral.ref;
                    } else if (webhookEvent.postback && webhookEvent.postback.payload === 'GET_STARTED') {
                        // If GET_STARTED but no referral? Just log it
                        console.log('GET_STARTED received but no referral param.');
                        await sendTextMessage(senderPsid, 'こんにちは！アプリと連携するには、マイページのボタンから再度このチャットを開いてください。');
                    }

                    if (studentId) {
                        console.log(`Linking Student ID: ${studentId} to PSID: ${senderPsid}`);
                        const success = await linkStudentToPsid(studentId, senderPsid);
                        if (success) {
                            await sendTextMessage(senderPsid, '連携が完了しました！これから重要なお知らせをお届けします。');
                        } else {
                            await sendTextMessage(senderPsid, '連携に失敗しました。管理者にお問い合わせください。');
                        }
                    } else if (webhookEvent.message && webhookEvent.message.text) {
                        // Debug reply
                        const text = webhookEvent.message.text;
                        console.log(`Message from ${senderPsid}: ${text}`);
                        await sendTextMessage(senderPsid, `メッセージを受け取りました: "${text}"\n\nもし連携をしたい場合は、アプリの「連携」ボタンを押し、画面下の「スタート」ボタンを押してください。`);
                    }
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
    console.log(`Updating student ${studentId} with PSID ${psid}`);
    const { data, error } = await supabase
        .from('students')
        .update({ facebook_psid: psid })
        .eq('student_id_text', studentId)
        .select();

    if (error) {
        console.error('Error linking student:', error);
        return false;
    } else if (data && data.length > 0) {
        console.log('Successfully linked student:', data[0].full_name);
        return true;
    } else {
        console.log('No student found with ID:', studentId);
        return false;
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
