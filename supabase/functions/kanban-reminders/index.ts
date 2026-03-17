const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// システムボットの特別なID
const SYSTEM_STUDENT_ID = 'SYSTEM_REMINDER'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

Deno.serve(async (req) => {
    try {
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders, status: 200 })
        }

        console.log(`[Kanban Reminders] Request: ${req.method} ${req.url}`)

        // 認証チェック
        let payload = {}
        try {
            const text = await req.text()
            if (text && text.length > 0) {
                payload = JSON.parse(text)
            }
        } catch (_e) {
            // Non-JSON body is acceptable
        }

        const cronSecret = Deno.env.get('CRON_SECRET')
        const authHeader = req.headers.get('authorization')
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // Dynamically import dependencies
        const { createClient } = await import('npm:@supabase/supabase-js@2')
        const webpush = (await import('npm:web-push@3.6.7')).default

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const results = {
            sent: 0,
            push_sent: 0,
            messages_created: 0,
            errors: [] as string[]
        }

        // 現在のJST時刻
        const now = new Date()
        const jstOffset = 9 * 60 * 60 * 1000
        const jstNow = new Date(now.getTime() + jstOffset)

        const currentHour = jstNow.getUTCHours()
        const currentMinute = jstNow.getUTCMinutes()
        const currentDay = jstNow.getUTCDay() // 0=日, 1=月, ..., 6=土
        const currentDateStr = jstNow.toISOString().split('T')[0]
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`

        console.log(`[Kanban Reminders] JST: ${currentHour}:${currentMinute}, Date: ${currentDateStr}, Day: ${DAY_LABELS[currentDay]}`)

        // 今日の対象時刻が「現在以前」のリマインダーを全て取得（キャッチアップ方式）
        // これにより、cronの実行が多少遅れても、以前の時間帯のリマインダーを処理できる
        const { data: reminders, error: remErr } = await supabase
            .from('kanban_reminders')
            .select('*, kanban_cards!inner(title, description)')
            .eq('enabled', true)
            .lte('remind_time', currentTimeStr + ':59')

        if (remErr) {
            console.error(`[Kanban Reminders] Fetch error: ${remErr.message}`)
            results.errors.push(`Reminder fetch error: ${remErr.message}`)
            return new Response(JSON.stringify({ success: false, results }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        console.log(`[Kanban Reminders] Found ${reminders?.length || 0} reminders with time <= ${currentTimeStr}`)

        if (!reminders || reminders.length === 0) {
            return new Response(JSON.stringify({ success: true, results, message: 'No reminders due' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 今日すでに送信済みか判定
        const todayStart = new Date(jstNow)
        todayStart.setUTCHours(0, 0, 0, 0)
        const todayStartISO = new Date(todayStart.getTime() - jstOffset).toISOString()

        const dueReminders = reminders.filter((r: any) => {
            // 今日すでに送信済みならスキップ
            if (r.last_sent_at && r.last_sent_at >= todayStartISO) {
                return false
            }

            switch (r.reminder_type) {
                case 'daily':
                    return true
                case 'weekly':
                    return r.remind_days && r.remind_days.includes(currentDay)
                case 'once':
                    return r.remind_date === currentDateStr
                default:
                    return false
            }
        })

        console.log(`[Kanban Reminders] ${dueReminders.length} due reminders after filtering`)

        if (dueReminders.length === 0) {
            return new Response(JSON.stringify({ success: true, results, message: 'No due reminders after filtering' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 教職員のプッシュ購読を取得（UUID形式のuser_id = 教職員）
        const { data: allSubs } = await supabase
            .from('push_subscriptions')
            .select('*')

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const staffSubs = (allSubs || []).filter((s: any) => uuidRegex.test(s.user_id) || s.user_id === 'member')
        const staffUserIds = [...new Set(staffSubs.map((s: any) => s.user_id))]

        console.log(`[Kanban Reminders] Staff subs: ${staffSubs.length}, Staff users: ${staffUserIds.length}`)

        // web-push 設定
        const vapidPublicKey = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
        const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@example.com'
        const vapidSubject = adminEmail.startsWith('mailto:') ? adminEmail : `mailto:${adminEmail}`

        let pushReady = false
        if (vapidPublicKey && vapidPrivateKey) {
            webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
            pushReady = true
        } else {
            results.errors.push('Missing VAPID keys')
            console.error('[Kanban Reminders] Missing VAPID keys')
        }

        // 各リマインダーを処理
        for (const reminder of dueReminders) {
            const cardTitle = (reminder as any).kanban_cards?.title || '不明なタスク'
            const timeStr = (reminder as any).remind_time?.substring(0, 5) || ''
            const typeLabel = (reminder as any).reminder_type === 'daily' ? '毎日'
                : (reminder as any).reminder_type === 'weekly' ? '曜日指定'
                    : '一回限り'

            console.log(`[Kanban Reminders] Processing: ${cardTitle} (${typeLabel} ${timeStr})`)

            try {
                // 1. プッシュ通知を全教職員に送信
                if (pushReady && staffSubs.length > 0) {
                    const cardDesc = (reminder as any).kanban_cards?.description || ''
                    const truncatedDesc = cardDesc.length > 40 ? cardDesc.substring(0, 37) + '...' : cardDesc

                    const pushPayload = JSON.stringify({
                        title: '🔔 タスクリマインダー',
                        body: `${cardTitle}${truncatedDesc ? '\n' + truncatedDesc : ''}（${typeLabel} ${timeStr}）`,
                        url: '/kanban',
                        badge: 1
                    })

                    const pushResults = await Promise.allSettled(
                        staffSubs.map((sub: any) =>
                            webpush.sendNotification({
                                endpoint: sub.endpoint,
                                keys: { p256dh: sub.p256dh, auth: sub.auth }
                            }, pushPayload).catch(async (e: any) => {
                                if (e.statusCode === 410 || e.statusCode === 404) {
                                    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                                }
                                throw e
                            })
                        )
                    )

                    results.push_sent += pushResults.filter((r: any) => r.status === 'fulfilled').length
                    const failedPush = pushResults.filter((r: any) => r.status === 'rejected')
                    if (failedPush.length > 0) {
                        console.log(`[Kanban Reminders] Push failed for ${failedPush.length} subs`)
                    }
                }

                // 2. コミュニケーションにチャットボットメッセージ送信
                const cardDesc = (reminder as any).kanban_cards?.description || ''
                const messageContent = `🔔 リマインダー\n\nタスク: ${cardTitle}\nスケジュール: ${typeLabel} ${timeStr}${cardDesc ? '\n説明: ' + cardDesc : ''}`

                if (staffUserIds.length > 0) {
                    const messagePayloads = staffUserIds.map((userId: string) => ({
                        student_id: SYSTEM_STUDENT_ID,
                        teacher_id: userId === 'member' ? null : userId,
                        sender_type: 'student',
                        content: messageContent,
                        read: false
                    }))

                    const { error: msgErr } = await supabase
                        .from('messages')
                        .insert(messagePayloads)

                    if (msgErr) {
                        results.errors.push(`Message insert err: ${msgErr.message}`)
                        console.error(`[Kanban Reminders] Message insert error: ${msgErr.message}`)
                    } else {
                        results.messages_created += staffUserIds.length
                    }
                }

                // 3. last_sent_at を更新
                const updateData: any = { last_sent_at: now.toISOString() }
                if ((reminder as any).reminder_type === 'once') {
                    updateData.enabled = false
                }
                await supabase
                    .from('kanban_reminders')
                    .update(updateData)
                    .eq('id', (reminder as any).id)

                results.sent++
                console.log(`[Kanban Reminders] Sent: ${cardTitle} (${typeLabel} ${timeStr})`)
            } catch (e: any) {
                results.errors.push(`Reminder ${(reminder as any).id}: ${e.message}`)
                console.error(`[Kanban Reminders] Error: ${e.message}`)
            }
        }

        console.log(`[Kanban Reminders] Done:`, JSON.stringify(results))
        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('[Kanban Reminders] Unhandled Error:', error)
        return new Response(JSON.stringify({
            error: error.message || 'Internal Server Error',
            stack: error.stack,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
