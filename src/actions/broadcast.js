'use server'

import { sendTelegramBroadcast } from './telegram'

export async function sendUnifiedBroadcast(message, targetType, targetValue, channels = ['telegram']) {
    const results = {
        telegram: null,
        totalSent: 0,
        totalFailed: 0,
        errors: []
    }

    // Execute in parallel
    const promises = []

    if (channels.includes('telegram')) {
        promises.push(
            sendTelegramBroadcast(message, targetType, targetValue)
                .then(res => {
                    results.telegram = res
                    if (res.success) {
                        results.totalSent += res.count || 0
                        results.totalFailed += res.failed || 0
                        if (res.details) results.errors.push(...res.details.map(d => `[Telegram] ${d.error}`))
                    } else {
                        results.errors.push(`[Telegram] ${res.error}`)
                    }
                })
        )
    }

    await Promise.all(promises)

    return {
        success: results.totalSent > 0 || (results.errors.length === 0), // Success if at least one sent or no errors (e.g. 0 targets)
        count: results.totalSent,
        failed: results.totalFailed,
        results
    }
}
