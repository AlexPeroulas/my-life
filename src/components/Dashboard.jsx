import { useEffect, useRef, useState } from 'react'
import {
  STATS_CONFIG,
  getDailyQuote,
  calcAvg,
  getHealthState,
} from '../lib/constants.js'

export default function Dashboard({ stats, statStreaks, onLogEntry, profile, entries }) {
  const [logText, setLogText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const barRefs = useRef({})
  const lifeBarRef = useRef(null)
  const animatedRef = useRef(false)

  const avg = calcAvg(stats)
  const healthState = getHealthState(avg)
  const quote = getDailyQuote()

  // Streak calculations
  const streakValues = Object.values(statStreaks || {})
  const currentStreak = streakValues.length ? Math.max(...streakValues) : 0
  const bestStreak = currentStreak // In a real app you'd store historical best; for now show max active

  // Animate bars in on mount / stats change
  useEffect(() => {
    // Small delay to allow DOM to settle
    const timer = setTimeout(() => {
      // Life bar
      if (lifeBarRef.current) {
        lifeBarRef.current.style.width = `${avg}%`
      }
      // Stat bars
      STATS_CONFIG.forEach(s => {
        const el = barRefs.current[s.key]
        if (el) {
          el.style.width = `${stats[s.key] ?? 50}%`
        }
      })
    }, 80)
    return () => clearTimeout(timer)
  }, [stats, avg])

  async function handleLogSubmit(e) {
    e.preventDefault()
    const text = logText.trim()
    if (!text || submitting) return

    setSubmitting(true)
    setSuccessMsg('')
    try {
      const result = await onLogEntry(text)
      if (result) {
        const cfg = STATS_CONFIG.find(s => s.key === result.statKey)
        setSuccessMsg(`+${result.boost} XP to ${cfg ? cfg.label : result.statKey}!`)
        setLogText('')
      }
    } catch (err) {
      console.error('Log entry error:', err)
    } finally {
      setSubmitting(false)
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  return (
    <>
      {/* ── Streak meta cards ──────────────────────────────── */}
      <div className="meta-row">
        <div className="meta-card" style={{ borderLeftColor: '#FF6D00' }}>
          <div className="meta-label">Current Streak</div>
          <div className="meta-value">🔥 {currentStreak}d</div>
        </div>
        <div className="meta-card" style={{ borderLeftColor: '#7C3AED' }}>
          <div className="meta-label">Best Streak</div>
          <div className="meta-value">⭐ {bestStreak}d</div>
        </div>
      </div>

      {/* ── Life health card ───────────────────────────────── */}
      <div className="life-card">
        <div className="life-card-geo" />
        <div className="life-card-title">Life Health</div>
        <div className="life-card-pct">{avg}%</div>
        <div className="life-card-label">{healthState.label}</div>
        <div className="life-bar-track">
          <div
            className="life-bar-fill"
            ref={lifeBarRef}
            style={{ width: 0 }}
          />
        </div>
      </div>

      {/* ── Character Stats ────────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">Character Stats</div>
      </div>

      <div className="stats-grid">
        {STATS_CONFIG.map((s, idx) => {
          const val = stats[s.key] ?? 50
          const streak = statStreaks?.[s.key] ?? 0
          const isLast = idx === STATS_CONFIG.length - 1
          const isOdd = STATS_CONFIG.length % 2 !== 0

          return (
            <div
              key={s.key}
              className={`stat-card${isLast && isOdd ? ' stat-card-wide' : ''}`}
            >
              <div
                className="stat-card-accent"
                style={{ background: s.color }}
              />
              <span className="stat-card-emoji">{s.emoji}</span>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-pct">{Math.round(val)}%</div>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  ref={el => { barRefs.current[s.key] = el }}
                  style={{ background: s.color, width: 0 }}
                />
              </div>
              <div className="stat-card-streak">
                {streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Daily quote ────────────────────────────────────── */}
      <div className="quote-box">
        <div className="quote-accent" />
        <div className="quote-text">"{quote}"</div>
      </div>

      {/* ── Log entry ──────────────────────────────────────── */}
      <div className="log-section">
        <div className="section-header" style={{ padding: 0, marginBottom: 12 }}>
          <div className="section-title">Log Entry</div>
        </div>
        <form onSubmit={handleLogSubmit}>
          <textarea
            className="log-textarea"
            placeholder="What did you do today? (e.g. 'Went for a 30-min run and made a healthy smoothie')"
            value={logText}
            onChange={e => setLogText(e.target.value)}
            rows={3}
            disabled={submitting}
          />
          <button
            className="log-btn"
            type="submit"
            disabled={submitting || !logText.trim()}
          >
            {submitting ? (
              <>
                <span className="log-btn-spinner" />
                Analyzing…
              </>
            ) : (
              '+ Log It'
            )}
          </button>
        </form>
        {successMsg && (
          <div className="log-success">
            ✅ {successMsg}
          </div>
        )}
        {entries && entries.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="section-header" style={{ padding: 0, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#999' }}>
                Today's Logs
              </div>
            </div>
            {entries.map(entry => {
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
            })}
          </div>
        )}
      </div>
    </>
  )
}
