'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import JapaneseHolidays from 'japanese-holidays'
import styles from './page.module.css'
import EventModal from './EventModal'

export default function CalendarView({ events, canCreateEvent, userId }) {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedEvent, setSelectedEvent] = useState(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // 月の最初と最後の日
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // カレンダーグリッド用の日付配列を生成
    const days = []
    const startPadding = firstDay.getDay() // 日曜始まり

    // 前月のパディング
    for (let i = 0; i < startPadding; i++) {
        const d = new Date(year, month, -startPadding + i + 1)
        const holiday = JapaneseHolidays.isHoliday(d)
        days.push({ date: d, isCurrentMonth: false, holiday })
    }

    // 今月の日付
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const d = new Date(year, month, i)
        const holiday = JapaneseHolidays.isHoliday(d)
        days.push({ date: d, isCurrentMonth: true, holiday })
    }

    // 次月のパディング（6週分）
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i)
        const holiday = JapaneseHolidays.isHoliday(d)
        days.push({ date: d, isCurrentMonth: false, holiday })
    }



    const goToPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1))
    }

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1))
    }

    const goToToday = () => {
        setCurrentDate(new Date())
    }

    const formatDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    const formatDateTime = (dateStr, allDay) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const datePart = formatDate(date) // YYYY-MM-DD
        if (allDay) return datePart

        const timePart = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        return `${datePart} ${timePart}`
    }

    const getEventsForDate = (date) => {
        const dateStr = formatDate(date)
        return events.filter(e => {
            const startDateStr = formatDate(new Date(e.date))
            // If it has an end date, check range
            if (e.end_date) {
                const endDateStr = formatDate(new Date(e.end_date))
                return dateStr >= startDateStr && dateStr <= endDateStr
            }
            // Single day event
            return dateStr === startDateStr
        })
    }

    const isToday = (date) => {
        const today = new Date()
        return formatDate(date) === formatDate(today)
    }

    const handleDayClick = (date) => {
        if (canCreateEvent) {
            setSelectedDate(date)
            setSelectedEvent(null)
            setShowEventModal(true)
        }
    }

    const handleEventClick = (event, e) => {
        e.stopPropagation()
        if (event.isCustomEvent && (canCreateEvent || event.createdBy === userId)) {
            setSelectedEvent(event)
            setSelectedDate(new Date(event.date))
            setShowEventModal(true)
        }
    }

    const handleModalClose = () => {
        setShowEventModal(false)
        setSelectedEvent(null)
        setSelectedDate(null)
    }

    const handleEventSave = () => {
        handleModalClose()
        router.refresh()
    }

    const weekDays = ['日', '月', '火', '水', '木', '金', '土']
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

    return (
        <>
            <div className={styles.calendar}>
                <div className={styles.calendarHeader}>
                    <button onClick={goToPrevMonth} className={styles.navBtn}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 4l-6 6 6 6" />
                        </svg>
                    </button>

                    <div className={styles.monthYear}>
                        <span className={styles.year}>{year}年</span>
                        <span className={styles.month}>{monthNames[month]}</span>
                    </div>

                    <button onClick={goToNextMonth} className={styles.navBtn}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 4l6 6-6 6" />
                        </svg>
                    </button>

                    <button onClick={goToToday} className={styles.todayBtn}>
                        今日
                    </button>

                    {canCreateEvent && (
                        <button
                            onClick={() => {
                                setSelectedDate(new Date())
                                setSelectedEvent(null)
                                setShowEventModal(true)
                            }}
                            className={styles.addEventBtn}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 3v10M3 8h10" />
                            </svg>
                            イベント追加
                        </button>
                    )}
                </div>

                <div className={styles.weekHeader}>
                    {weekDays.map((day, i) => (
                        <div
                            key={day}
                            className={`${styles.weekDay} ${i === 0 ? styles.sunday : ''} ${i === 6 ? styles.saturday : ''}`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                <div className={styles.daysGrid}>
                    {days.map((day, index) => {
                        const dayEvents = getEventsForDate(day.date)
                        const dayOfWeek = day.date.getDay()
                        // Filter for background coloring (exclude 'class')
                        const bgEvents = dayEvents.filter(e => e.type !== 'class')

                        let cellStyle = {}
                        if (bgEvents.length > 0) {
                            if (bgEvents.length === 1) {
                                cellStyle.background = bgEvents[0].color || '#3b82f6'
                                cellStyle.color = 'white' // Text color contrast
                            } else {
                                // Create gradient for multiple events
                                const step = 100 / bgEvents.length
                                const stops = bgEvents.map((e, i) => {
                                    const color = e.color || '#3b82f6'
                                    const start = i * step
                                    const end = (i + 1) * step
                                    return `${color} ${start}% ${end}%`
                                }).join(', ')
                                cellStyle.background = `linear-gradient(to right, ${stops})`
                                cellStyle.color = 'white' // Text contrast usually better with white on colored bg
                            }
                        }

                        return (
                            <div
                                key={index}
                                className={`${styles.dayCell} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${isToday(day.date) ? styles.today : ''}`}
                                style={cellStyle}
                                onClick={() => handleDayClick(day.date)}
                            >
                                <span className={`${styles.dayNumber} ${dayOfWeek === 0 || day.holiday ? styles.sunday : ''} ${dayOfWeek === 6 && !day.holiday ? styles.saturday : ''} ${day.holiday ? styles.holiday : ''}`}
                                    style={bgEvents.length > 0 ? { color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' } : {}}
                                >
                                    {day.date.getDate()}
                                </span>

                                <div className={styles.dayEvents}>
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div
                                            key={event.id}
                                            className={styles.event}
                                            style={
                                                bgEvents.length > 0
                                                    ? { background: 'rgba(255,255,255,0.2)', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }
                                                    : { backgroundColor: event.color || '#3b82f6' }
                                            }
                                            onClick={(e) => event.isCustomEvent ? handleEventClick(event, e) : null}
                                            title={event.title}
                                        >
                                            {event.type === 'assignment' ? (
                                                <Link
                                                    href={`/assignments/${event.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={bgEvents.length > 0 ? { color: 'white' } : {}}
                                                >
                                                    {event.title.length > 8 ? event.title.slice(0, 8) + '...' : event.title}
                                                </Link>
                                            ) : (
                                                <span>{event.title.length > 8 ? event.title.slice(0, 8) + '...' : event.title}</span>
                                            )}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <span className={styles.moreEvents} style={bgEvents.length > 0 ? { color: 'white' } : {}}>
                                            +{dayEvents.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Event List */}
                <div className={styles.eventList}>
                    <h3 className={styles.eventListTitle}>今後の予定</h3>
                    <div className={styles.eventListContent}>
                        {events
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map(event => (
                                <div key={event.id} className={styles.eventListItem}>
                                    <div className={styles.eventListDate}>
                                        {formatDateTime(event.date, event.all_day)}
                                        {event.end_date && ` 〜 ${formatDateTime(event.end_date, event.all_day)}`}
                                    </div>
                                    <div className={styles.eventListTitle} style={{ borderLeftColor: event.color || '#3b82f6' }}>
                                        {event.type === 'assignment' ? (
                                            <Link href={`/assignments/${event.id}`}>
                                                {event.title}
                                            </Link>
                                        ) : (
                                            <span>{event.title}</span>
                                        )}
                                    </div>
                                    <div className={styles.eventListType}>
                                        {event.type === 'assignment' ? '課題' :
                                            event.type === 'class' ? '授業' :
                                                event.type === 'exam' ? '試験' :
                                                    event.type === 'holiday' ? '休日' : 'その他'}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Legend */}
                <div className={styles.legend}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }}></span>
                        課題締切
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ backgroundColor: '#3b82f6' }}></span>
                        授業
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ backgroundColor: '#ef4444' }}></span>
                        試験
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ backgroundColor: '#22c55e' }}></span>
                        休日
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ backgroundColor: '#8b5cf6' }}></span>
                        その他
                    </div>
                </div>
            </div>

            {showEventModal && (
                <EventModal
                    event={selectedEvent}
                    date={selectedDate}
                    onClose={handleModalClose}
                    onSave={handleEventSave}
                    userId={userId}
                />
            )}
        </>
    )
}
