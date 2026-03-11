import { useEffect, useRef } from 'react'
import { STATS_CONFIG } from '../lib/constants.js'

export default function WeeklySummary({ stats, statStreaks, userId }) {
  const barRefs = useRef({})

  // Sort stats: highest value first
  const sorted = [...STATS_CONFIG].sort((a, b) => {
    const va = stats[a.key] ?? 50
    const vb = stats[b.key] ?? 50
    return vb - va
  })

  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]
  const lowestVal = stats[lowest?.key] ?? 50

  // Animate bars in on mount / stats change
  useEffect(() => {
    const timer = setTimeout(() => {
      STATS_CONFIG.forEach(s => {
        const el = barRefs.current[s.key]
        if (el) {
          el.style.width = `${stats[s.key] ?? 50}%`
        }
      })
    }, 80)
    return () => clearTimeout(timer)
  }, [stats])

  return (
    <div className="weekly-wrap">
      <div className="section-header" style={{ padding: 0, marginBottom: 16 }}>
        <div className="section-title">This Week</div>
      </div>

      {/* Best stat callout */}
      {highest && (
        <div className="week-callout good">
          <span style={{ fontSize: 18 }}>{highest.emoji}</span>
          <span>You excelled in <strong>{highest.label}</strong> this week!</span>
        </div>
      )}

      {/* Worst stat callout — only if below 50 */}
      {lowest && lowestVal < 50 && (
        <div className="week-callout warn">
          <span style={{ fontSize: 18 }}>{lowest.emoji}</span>
          <span>You need more <strong>{lowest.label}</strong> — it's been slipping.</span>
        </div>
      )}

      {/* Stat rows */}
      {sorted.map(s => {
        const val = stats[s.key] ?? 50
        const streak = statStreaks?.[s.key] ?? 0
        return (
          <div key={s.key} className="week-stat-row">
            <span className="week-stat-emoji">{s.emoji}</span>
            <div className="week-stat-info">
              <div className="week-stat-label">{s.label}</div>
              <div className="week-stat-bar-track">
                <div
                  className="week-stat-bar-fill"
                  ref={el => { barRefs.current[s.key] = el }}
                  style={{ background: s.color, width: 0 }}
                />
              </div>
            </div>
            <div className="week-stat-pct">{Math.round(val)}%</div>
            <div className="week-streak-badge">
              {streak > 0 ? `🔥${streak}d` : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
