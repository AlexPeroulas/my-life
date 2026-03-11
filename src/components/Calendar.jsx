import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { STATS_CONFIG, todayISO, formatDate } from '../lib/constants.js'

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function getMonthLabel(date) {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function isoFromDate(year, month, day) {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

export default function Calendar({ userId, onSelectDate, selectedDate }) {
  const today = todayISO()
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [daysWithEntries, setDaysWithEntries] = useState(new Set())
  const [dayEntries, setDayEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(false)

  // Fetch all dates with entries for currentMonth
  const fetchMonthEntries = useCallback(async () => {
    if (!userId) return
    const year = currentMonth.getFullYear()
    const mm = String(currentMonth.getMonth() + 1).padStart(2, '0')
    const prefix = `${year}-${mm}-`

    try {
      const { data, error } = await supabase
        .from('entries')
        .select('date')
        .eq('user_id', userId)
        .like('date', `${prefix}%`)

      if (error) throw error

      const s = new Set((data || []).map(r => r.date))
      setDaysWithEntries(s)
    } catch (err) {
      console.error('Calendar fetchMonthEntries error:', err)
    }
  }, [userId, currentMonth])

  useEffect(() => {
    fetchMonthEntries()
  }, [fetchMonthEntries])

  // Fetch entries for selected date
  useEffect(() => {
    if (!selectedDate || !userId) {
      setDayEntries([])
      return
    }
    setLoadingEntries(true)
    supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', selectedDate)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setDayEntries(data || [])
        setLoadingEntries(false)
      })
  }, [selectedDate, userId])

  // Build calendar grid
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  // Convert Sunday=0 to Monday=0 offset
  const startOffset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  function nextMonth() {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    const nowMonth = new Date()
    nowMonth.setDate(1)
    nowMonth.setHours(0, 0, 0, 0)
    if (next <= nowMonth) {
      setCurrentMonth(next)
    }
  }

  function handleDayClick(day) {
    const iso = isoFromDate(year, month, day)
    if (iso > today) return // future, ignore
    if (onSelectDate) onSelectDate(iso)
  }

  // Render cells
  const cells = []
  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    cells.push(<div key={`empty-${i}`} className="cal-cell empty" />)
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoFromDate(year, month, d)
    const isToday = iso === today
    const isFuture = iso > today
    const hasEntry = daysWithEntries.has(iso)
    const isSelected = iso === selectedDate

    let cls = 'cal-cell'
    if (isToday) cls += ' today'
    if (isFuture) cls += ' future'
    if (hasEntry) cls += ' has-entry'
    if (isSelected && !isToday) cls += ' selected'

    cells.push(
      <button
        key={iso}
        className={cls}
        onClick={() => !isFuture && handleDayClick(d)}
        aria-label={iso}
        aria-pressed={isSelected}
        disabled={isFuture}
      >
        {d}
      </button>
    )
  }

  // Disable nextMonth button if already at current month
  const nowMonthStart = new Date()
  nowMonthStart.setDate(1)
  nowMonthStart.setHours(0, 0, 0, 0)
  const canGoNext = currentMonth < nowMonthStart

  return (
    <div className="calendar-wrap">
      {/* Month navigation */}
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">
          ‹
        </button>
        <div className="cal-month-label">{getMonthLabel(currentMonth)}</div>
        <button
          className="cal-nav-btn"
          onClick={nextMonth}
          disabled={!canGoNext}
          aria-label="Next month"
          style={{ opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'not-allowed' }}
        >
          ›
        </button>
      </div>

      {/* Day names */}
      <div className="cal-day-names">
        {DAY_NAMES.map(d => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="cal-grid">
        {cells}
      </div>

      {/* Selected day entries */}
      {selectedDate && (
        <div className="cal-entries-section">
          <div className="cal-entries-title">
            {formatDate(selectedDate)}
          </div>
          {loadingEntries ? (
            <div className="cal-empty-state">Loading…</div>
          ) : dayEntries.length === 0 ? (
            <div className="cal-empty-state">
              No entries for this day.
            </div>
          ) : (
            dayEntries.map(entry => {
              const cfg = STATS_CONFIG.find(s => s.key === entry.stat_key)
              return (
                <div
                  key={entry.id}
                  className="entry-item"
                  style={{ borderLeftColor: cfg?.color || '#0066FF' }}
                >
                  <div className="entry-item-header">
                    <span>{cfg?.emoji || '📝'}</span>
                    <span>{cfg?.label || entry.stat_key || 'General'}</span>
                    {entry.boost && (
                      <span style={{ color: '#00994d', marginLeft: 'auto' }}>+{entry.boost} XP</span>
                    )}
                  </div>
                  <div className="entry-item-text">{entry.content}</div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
