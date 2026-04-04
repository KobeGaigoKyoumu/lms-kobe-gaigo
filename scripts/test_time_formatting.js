function formatTime(dateStr, mockNow) {
    const d = new Date(dateStr)
    const now = new Date(mockNow)

    // Convert both to day-only dates (00:00:00 local time)
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Difference in days (calendar days)
    const diffDays = Math.round((nowDate - dDate) / (1000 * 60 * 60 * 24))

    const timeStr = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

    if (diffDays === 0) return `今日 ${timeStr}`
    if (diffDays === 1) return `昨日 ${timeStr}`
    if (diffDays === 2) return `一昨日 ${timeStr}`
    return `${d.getMonth() + 1}/${d.getDate()} ${timeStr}`
}

const mockNow = '2026-03-13T06:54:00+09:00' // Friday 6:54 AM
console.log('Mock Now:', mockNow)

// Test cases
const tests = [
    { label: 'Today (Same morning)', input: '2026-03-13T06:00:00+09:00', expected: /^今日/ },
    { label: 'Yesterday (Previous afternoon, < 24h)', input: '2026-03-12T15:04:00+09:00', expected: /^昨日/ },
    { label: 'Yesterday (Previous morning, > 24h)', input: '2026-03-12T05:00:00+09:00', expected: /^昨日/ },
    { label: 'Day before yesterday', input: '2026-03-11T15:00:00+09:00', expected: /^一昨日/ },
    { label: 'Further past', input: '2026-03-10T15:00:00+09:00', expected: /^3\/10/ }
]

tests.forEach(t => {
    const result = formatTime(t.input, mockNow)
    const pass = t.expected.test(result)
    console.log(`${pass ? '✅' : '❌'} ${t.label}: Input=${t.input} -> Result=${result}`)
    if (!pass) process.exit(1)
})

console.log('All tests passed!')
