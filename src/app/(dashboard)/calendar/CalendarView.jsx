'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import JapaneseHolidays from 'japanese-holidays'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'
import EventModal from './EventModal'
import PackageList from './components/PackageList'
import PackageModal from './components/PackageModal'
import { applyPackageToTarget, unapplyPackageFromTarget, copyEventPackage } from '@/app/actions/calendar'

export default function CalendarView({ events, canCreateEvent, userId }) {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [slideDirection, setSlideDirection] = useState(null)

    // Package Management
    const [showPackageList, setShowPackageList] = useState(false)
    const [showPackageModal, setShowPackageModal] = useState(false)
    const [selectedPackage, setSelectedPackage] = useState(null)
    const [pkgRefreshTrigger, setPkgRefreshTrigger] = useState(0)

    // スワイプ用
    const touchStartX = useRef(null)
    const touchStartY = useRef(null)

    const handleTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }, [])

    const handleTouchEnd = useCallback((e) => {
        if (touchStartX.current === null) return
        const deltaX = e.changedTouches[0].clientX - touchStartX.current
        const deltaY = e.changedTouches[0].clientY - touchStartY.current
        // 横方向の移動が縦より大きく、かつ50px以上の場合のみスワイプ判定
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX < 0) {
                setSlideDirection('left')
                setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            } else {
                setSlideDirection('right')
                setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
        }
        touchStartX.current = null
        touchStartY.current = null
    }, [])

    // アニメーションクラスを自動クリア
    useEffect(() => {
        if (slideDirection) {
            const timer = setTimeout(() => setSlideDirection(null), 300)
            return () => clearTimeout(timer)
        }
    }, [slideDirection])

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

    // Package Handlers
    const handlePackageApply = async (pkg, targetClasses) => {
        if (!confirm(`${pkg.title}を${targetClasses.join(', ')}に適用しますか？`)) return

        const supabase = createClient()

        const newEvents = []
        for (const targetClass of targetClasses) {
            for (const evt of pkg.events) {
                // 各イベントに保存された start_year / end_year を使用（なければ現在年）
                const startYear = evt.start_year || new Date().getFullYear()
                const endYear = evt.end_year || startYear

                const start = new Date(startYear, evt.start_month - 1, evt.start_day)

                let isoStart, isoEnd

                if (evt.all_day) {
                    const s = new Date(start)
                    s.setHours(0, 0, 0, 0)
                    isoStart = s.toISOString()

                    if (evt.end_month && evt.end_day) {
                        const end = new Date(endYear, evt.end_month - 1, evt.end_day)
                        end.setHours(23, 59, 59, 999)
                        isoEnd = end.toISOString()
                    }
                } else {
                    if (evt.start_time) {
                        const [h, m] = evt.start_time.split(':')
                        start.setHours(h, m, 0, 0)
                        isoStart = start.toISOString()
                    } else {
                        start.setHours(0, 0, 0, 0)
                        isoStart = start.toISOString()
                    }

                    if (evt.end_month && evt.end_day) {
                        const end = new Date(endYear, evt.end_month - 1, evt.end_day)
                        if (evt.end_time) {
                            const [eh, em] = evt.end_time.split(':')
                            end.setHours(eh, em, 0, 0)
                        } else {
                            end.setHours(23, 59, 59, 999)
                        }
                        isoEnd = end.toISOString()
                    } else if (evt.end_time) {
                        const end = new Date(start)
                        const [eh, em] = evt.end_time.split(':')
                        end.setHours(eh, em, 0, 0)
                        isoEnd = end.toISOString()
                    }
                }

                newEvents.push({
                    title: evt.title,
                    description: pkg.description,
                    start_date: isoStart,
                    end_date: isoEnd,
                    all_day: evt.all_day,
                    event_type: evt.event_type,
                    color: evt.color,
                    target_class: targetClass,
                    created_by: userId,
                    package_id: pkg.id
                })
            }
        }

        const { error } = await applyPackageToTarget(newEvents)
        if (error) {
            console.error(error)
            alert('適用に失敗しました')
        } else {
            alert('適用しました')
            router.refresh()
            setShowPackageList(false)
        }
    }

    const handlePackageUnapply = async (packageId, targetClass) => {
        if (!confirm(`${targetClass} のパッケージ適用を解除しますか？\n（このパッケージから生成されたイベントが全て削除されます）`)) return

        const { error } = await unapplyPackageFromTarget(packageId, targetClass)

        if (error) {
            console.error(error)
            alert('解除に失敗しました')
        } else {
            alert('解除しました')
            router.refresh()
        }
    }

    const handlePackageSave = () => {
        setShowPackageModal(false)
        setPkgRefreshTrigger(prev => prev + 1)
    }

    const handlePackageCopy = async (pkg) => {
        if (!confirm(`「${pkg.title}」を複製しますか？`)) return

        const { error } = await copyEventPackage(pkg.id)
        if (error) {
            console.error(error)
            alert('複製に失敗しました')
        } else {
            alert('複製しました')
            setPkgRefreshTrigger(prev => prev + 1)
        }
    }

    const weekDays = ['日', '月', '火', '水', '木', '金', '土']
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

    const getPastelColor = (color) => {
        // Map standard colors to pastels
        const colorMap = {
            '#f59e0b': '#fef3c7', // Assignment
            '#ef4444': '#fee2e2', // Exam
            '#22c55e': '#dcfce7', // Holiday
            '#8b5cf6': '#f3e8ff', // Other
            '#3b82f6': '#dbeafe'  // Class
        }
        return colorMap[color] || color
    }

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
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setShowPackageList(true)}
                                className={styles.todayBtn} // Use same style for now or add new style
                                style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }}
                            >
                                パッケージ管理
                            </button>
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
                        </div>
                    )}
                </div>

                {/* Legend - Moved to Top */}
                <div className={styles.legend}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }}></span>
                        課題締切
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendColor} style={{ backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}></span>
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

                <div className={`${styles.daysGrid} ${slideDirection === 'left' ? styles.slideLeft : ''} ${slideDirection === 'right' ? styles.slideRight : ''}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    {days.map((day, index) => {
                        const dayEvents = getEventsForDate(day.date)
                        const dayOfWeek = day.date.getDay()
                        // Filter for background coloring (exclude 'class')
                        const bgEvents = dayEvents.filter(e => e.type !== 'class')

                        let cellStyle = {}
                        if (bgEvents.length > 0) {
                            if (bgEvents.length === 1) {
                                cellStyle.background = getPastelColor(bgEvents[0].color || '#3b82f6')
                            } else {
                                // Create gradient for multiple events
                                const step = 100 / bgEvents.length
                                const stops = bgEvents.map((e, i) => {
                                    const color = getPastelColor(e.color || '#3b82f6')
                                    const start = i * step
                                    const end = (i + 1) * step
                                    return `${color} ${start}% ${end}%`
                                }).join(', ')
                                cellStyle.background = `linear-gradient(to right, ${stops})`
                            }
                        }

                        return (
                            <div
                                key={index}
                                className={`${styles.dayCell} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${isToday(day.date) ? styles.today : ''}`}
                                style={cellStyle}
                                onClick={() => handleDayClick(day.date)}
                            >
                                <span className={`${styles.dayNumber} ${dayOfWeek === 0 || day.holiday ? styles.sunday : ''} ${dayOfWeek === 6 && !day.holiday ? styles.saturday : ''} ${day.holiday ? styles.holiday : ''}`}>
                                    {day.date.getDate()}
                                </span>

                                <div className={styles.dayEvents}>
                                    {/* If background is coloured, show truncated text ONLY on start date */}
                                    {dayEvents.slice(0, 3).map(event => {
                                        // Check if this is the start date of the event
                                        const isStart = formatDate(new Date(event.date)) === formatDate(day.date)

                                        // For non-class events (which have background color):
                                        // 1. Only show on start date
                                        if (event.type !== 'class' && !isStart) {
                                            return null
                                        }

                                        // 2. Truncate title to 2 chars for non-class events
                                        const displayTitle = event.type === 'class' ?
                                            (event.title.length > 3 ? event.title.slice(0, 3) + '...' : event.title) :
                                            (event.title.length > 2 ? event.title.slice(0, 2) + '...' : event.title)

                                        return (
                                            <div
                                                key={event.id}
                                                className={styles.event}
                                                style={{ background: getPastelColor(event.color || '#3b82f6'), color: '#374151', padding: '0 2px', borderRadius: '4px' }}
                                                onClick={(e) => event.isCustomEvent ? handleEventClick(event, e) : null}
                                                title={event.title}
                                            >
                                                {event.type === 'assignment' ? (
                                                    <Link
                                                        href={`/assignments/${event.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ color: '#374151' }}
                                                    >
                                                        {displayTitle}
                                                    </Link>
                                                ) : (
                                                    <span>{displayTitle}</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {/* Count remaining events - optional: could show dot or something, but typically BG handles visibility. 
                                        Let's keep count if there are MORE events than space, but typically BG handles visibility.
                                    */}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Event List */}
                <div className={styles.eventList}>
                    <h3 className={styles.eventListHeading}>今後の予定</h3>
                    <div className={styles.eventListContent}>
                        {events
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map(event => {
                                const pastelColor = getPastelColor(event.color || '#3b82f6')
                                const typeLabel = event.type === 'assignment' ? '課題' :
                                    event.type === 'class' ? '授業' :
                                        event.type === 'exam' ? '試験' :
                                            event.type === 'holiday' ? '休日' : 'その他'
                                return (
                                    <div key={event.id} className={styles.eventListItem}>
                                        <span className={styles.eventDot} style={{ backgroundColor: event.color || '#3b82f6' }} />
                                        <div className={styles.eventListBody}>
                                            <span className={styles.eventListDate}>
                                                {formatDateTime(event.date, event.all_day)}
                                                {event.end_date && ` 〜 ${formatDateTime(event.end_date, event.all_day)}`}
                                            </span>
                                            <span className={styles.eventListName}>
                                                {event.type === 'assignment' ? (
                                                    <Link href={`/assignments/${event.id}`}>
                                                        {event.title}
                                                    </Link>
                                                ) : (
                                                    event.title
                                                )}
                                            </span>
                                            <span
                                                className={styles.eventListType}
                                                style={{ backgroundColor: pastelColor, color: event.color || '#3b82f6' }}
                                            >
                                                {typeLabel}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
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

            {showPackageList && (
                <div className={styles.modalOverlay} onClick={() => setShowPackageList(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
                        <div className={styles.modalHeader}>
                            <h2>パッケージ管理</h2>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setSelectedPackage(null); setShowPackageModal(true); }} className={styles.addEventBtn}>
                                    + 新規作成
                                </button>
                                <button onClick={() => setShowPackageList(false)} className={styles.closeBtn}>✕</button>
                            </div>
                        </div>
                        <PackageList
                            onApplyPackage={handlePackageApply}
                            onUnapplyPackage={handlePackageUnapply}
                            onEditPackage={(pkg) => { setSelectedPackage(pkg); setShowPackageModal(true); }}
                            onCopyPackage={handlePackageCopy}
                            refreshTrigger={pkgRefreshTrigger}
                        />
                    </div>
                </div>
            )}

            {showPackageModal && (
                <PackageModal
                    pkg={selectedPackage}
                    onClose={() => setShowPackageModal(false)}
                    onSave={handlePackageSave}
                    userId={userId}
                />
            )}
        </>
    )
}
