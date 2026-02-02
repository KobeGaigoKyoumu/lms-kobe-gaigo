import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Init Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * POST: Handle incoming Telegram updates
 */
export async function POST(req) {
    try {
        const body = await req.json();
        console.log('Received Telegram Update:', JSON.stringify(body, null, 2));

        if (body.message && body.message.text) {
            const chatId = body.message.chat.id;
            const text = body.message.text;
            const firstName = body.message.chat.first_name || 'User';

            // Check for /start command
            if (text.startsWith('/start')) {
                const params = text.split(' ');

                // Case: /start <student_id>
                if (params.length > 1) {
                    const studentId = params[1];
                    console.log(`Linking Student ID: ${studentId} to Telegram Chat ID: ${chatId}`);

                    const result = await linkStudentToTelegram(studentId, chatId);

                    if (result.success) {
                        await sendTelegramMessage(chatId, `こんにちは、${result.studentName}さん！\nLMSとの連携が完了しました。重要なお知らせをこちらでお届けします。✅`);
                    } else {
                        let errorMessage = `連携に失敗しました。\n指定された学生ID "${studentId}" が見つからないか、エラーが発生しました。`;

                        // Add detail for debugging
                        if (result.reason === 'student_not_found') {
                            errorMessage += `\n(エラー: データベースに学生が見つかりません: ${result.detail || 'N/A'})`;
                        } else if (result.reason === 'update_failed') {
                            errorMessage += `\n(エラー: データの更新に失敗しました: ${result.detail || 'N/A'})`;
                        }

                        await sendTelegramMessage(chatId, errorMessage);
                    }
                } else {
                    // Case: /start (no params)
                    await sendTelegramMessage(chatId, `こんにちは！LMSと連携するには、マイページにある「Telegram連携」ボタンから再度アクセスしてください。`);
                }
            } else {
                // Other messages
                await sendTelegramMessage(chatId, 'Messengerで先生にメッセージしてください。');
            }
        }

        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('Error processing Telegram webhook:', error);
        // Always return 200 to Telegram to prevent retry loops
        return new NextResponse('Internal Server Error', { status: 200 });
    }
}

/**
 * Link Student ID to Telegram Chat ID in Supabase
 */
async function linkStudentToTelegram(studentId, chatId) {
    console.log(`Updating student ${studentId} with Telegram Chat ID ${chatId}`);

    const chatIdStr = String(chatId);

    // 1. Verify student exists first
    const { data: student, error: searchError } = await supabase
        .from('students')
        .select('student_id_text, full_name')
        .eq('student_id_text', studentId)
        .single();

    if (searchError || !student) {
        console.error('Student Verification Failed:', searchError);
        return { success: false, reason: 'student_not_found', detail: searchError?.message };
    }

    // 2. Update Telegram Chat ID
    const { error: updateError } = await supabase
        .from('students')
        .update({ telegram_chat_id: chatIdStr })
        .eq('student_id_text', studentId);

    if (updateError) {
        console.error('Error linking student:', updateError);
        return { success: false, reason: 'update_failed', detail: updateError.message };
    }

    console.log('Successfully linked student:', student.full_name);
    return { success: true, studentName: student.full_name };
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(chatId, text) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('TELEGRAM_BOT_TOKEN is not set');
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("Failed to send Telegram message:", err);
        }
    } catch (err) {
        console.error("Network error sending Telegram message:", err);
    }
}
