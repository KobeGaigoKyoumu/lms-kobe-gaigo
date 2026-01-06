'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
        days.push({ date: d, isCurrentMonth: false })
    }

    // 今月の日付
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // 次月のパディング（6週分）
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
        days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
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

    const getEventsForDate = (date) => {
        return events.filter(e => {
            const eventDate = new Date(e.date)
            return formatDate(eventDate) === formatDate(date)
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

                        return (
                            <div
                                key={index}
                                className={`${styles.dayCell} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${isToday(day.date) ? styles.today : ''}`}
                                onClick={() => handleDayClick(day.date)}
                            >
                                <span className={`${styles.dayNumber} ${dayOfWeek === 0 ? styles.sunday : ''} ${dayOfWeek === 6 ? styles.saturday : ''}`}>
                                    {day.date.getDate()}
                                </span>
                                <div className={styles.dayEvents}>
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div
                                            key={event.id}
                                            className={styles.event}
                                            style={{ backgroundColor: event.color || '#3b82f6' }}
                                            onClick={(e) => event.isCustomEvent ? handleEventClick(event, e) : null}
                                            title={event.title}
                                        >
                                            {event.type === 'assignment' ? (
                                                <Link
                                                    href={`/assignments/${event.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {event.title}
                                                </Link>
                                            ) : (
                                                <span>{event.title}</span>
                                            )}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <span className={styles.moreEvents}>
                                            +{dayEvents.length - 3}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
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
