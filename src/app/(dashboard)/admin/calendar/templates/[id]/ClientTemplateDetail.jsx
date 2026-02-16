'use client'

import { useState } from 'react'
import CalendarView from '@/app/(dashboard)/calendar/CalendarView'
import Link from 'next/link'
import styles from '@/app/(dashboard)/calendar/page.module.css'
import TemplateEventModal from './TemplateEventModal'

export default function ClientTemplateDetail({ template, initialEvents }) {
    const [events, setEvents] = useState(initialEvents)
    const [showModal, setShowModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedEvent, setSelectedEvent] = useState(null)

    // CalendarView requires these props but we override the behavior
    // We need to customize CalendarView to handle template events or
    // create a wrapper that handles the modal logic.
    // For now, let's reuse CalendarView but intercept the "create" and "click" actions via props if possible,
    // OR simply pass a custom "onDateClick" / "onEventClick" if CalendarView supports it.
    // Looking at CalendarView.jsx, it has:
    // handleDayClick -> sets internal state and shows EventModal (which inserts to calendar_events).
    // We need it to insert to `calendar_template_events`.

    // STRATEGY: 
    // CalendarView is tightly coupled to `calendar_events` via `EventModal`.
    // We should probably MODIFY `CalendarView` to accept a custom `EventModalComponent` 
    // OR make `EventModal` smart enough to handle templates.
    // 
    // Let's go with making `EventModal` smarter OR wrapping the logic.
    // Actually, `CalendarView` manages its own `showEventModal` state.
    // We might need to Refactor `CalendarView` to lift state up or genericize it.
    // 
    // Refactoring CalendarView might be risky/complex. 
    // Alternative: Duplicate CalendarView -> `TemplateCalendarView`.
    // Given the time, duplicating and modifying for templates might be safer/cleaner 
    // than analyzing side effects of refactoring the main one.
    // 
    // However, let's first check if we can just pass `customModal` prop to CalendarView.
    // It currently imports `EventModal` directly.

    // DECISION: I will create `TemplateCalendarView.jsx` in this directory. 
    // It will be a copy of `CalendarView` but import `TemplateEventModal`.

    return (
        <div className={styles.page}>
            <header className={styles.header} style={{ marginBottom: '1rem' }}>
                <div>
                    <Link href="/admin/calendar/templates" style={{ fontSize: '0.9rem', color: '#666', textDecoration: 'underline' }}>
                        &lt; テンプレート一覧に戻る
                    </Link>
                    <h1 className={styles.title}>{template.name}</h1>
                    <p className={styles.subtitle}>このテンプレートのイベント編集</p>
                </div>
            </header>

            <TemplateCalendarView
                events={events}
                templateId={template.id}
            />
        </div>
    )
}

// -----------------------------------------------------------------------------
// Internal Component: TemplateCalendarView
// (Simplified copy of CalendarView logic adapted for Templates)
// -----------------------------------------------------------------------------
import { useRouter } from 'next/navigation'

function TemplateCalendarView({ events, templateId }) {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedEvent, setSelectedEvent] = useState(null)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    const startPadding = firstDay.getDay()
    for (let i = 0; i < startPadding; i++) days.push({ date: new Date(year, month, -startPadding + i + 1), isCurrentMonth: false })
    for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })

    const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
    const goToToday = () => setCurrentDate(new Date())

    const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const getEventsForDate = (date) => events.filter(e => {
        const eventDate = new Date(e.date)
        return formatDate(eventDate) === formatDate(date)
    })
    const isToday = (date) => formatDate(date) === formatDate(new Date())

    const handleDayClick = (date) => {
        setSelectedDate(date)
        setSelectedEvent(null)
        setShowEventModal(true)
    }

    const handleEventClick = (event, e) => {
        e.stopPropagation()
        setSelectedEvent(event)
        setSelectedDate(new Date(event.date))
        setShowEventModal(true)
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
                    <button onClick={goToPrevMonth} className={styles.navBtn}>&lt;</button>
                    <div className={styles.monthYear}>
                        <span className={styles.year}>{year}年</span>
                        <span className={styles.month}>{monthNames[month]}</span>
                    </div>
                    <button onClick={goToNextMonth} className={styles.navBtn}>&gt;</button>
                    <button onClick={goToToday} className={styles.todayBtn}>今日</button>
                    <button
                        onClick={() => { setSelectedDate(new Date()); setSelectedEvent(null); setShowEventModal(true); }}
                        className={styles.addEventBtn}
                    >
                        + イベント追加
                    </button>
                </div>

                <div className={styles.weekHeader}>
                    {weekDays.map((day, i) => (
                        <div key={day} className={`${styles.weekDay} ${i === 0 ? styles.sunday : ''} ${i === 6 ? styles.saturday : ''}`}>{day}</div>
                    ))}
                </div>

                <div className={styles.daysGrid}>
                    {days.map((day, index) => {
                        const dayEvents = getEventsForDate(day.date)
                        const dayOfWeek = day.date.getDay()
                        return (
                            <div key={index}
                                className={`${styles.dayCell} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${isToday(day.date) ? styles.today : ''}`}
                                onClick={() => handleDayClick(day.date)}
                            >
                                <span className={`${styles.dayNumber} ${dayOfWeek === 0 ? styles.sunday : ''} ${dayOfWeek === 6 ? styles.saturday : ''}`}>
                                    {day.date.getDate()}
                                </span>
                                <div className={styles.dayEvents}>
                                    {dayEvents.slice(0, 3).map(event => (
                                        <div key={event.id} className={styles.event} style={{ backgroundColor: event.color }} onClick={(e) => handleEventClick(event, e)}>
                                            <span>{event.title}</span>
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && <span className={styles.moreEvents}>+{dayEvents.length - 3}</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {showEventModal && (
                <TemplateEventModal
                    event={selectedEvent}
                    date={selectedDate}
                    templateId={templateId}
                    onClose={handleModalClose}
                    onSave={handleEventSave}
                />
            )}
        </>
    )
}
