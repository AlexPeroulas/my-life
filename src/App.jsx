import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase.js'
import {
  STATS_CONFIG,
  calcAvg,
  getHealthState,
  todayISO,
} from './lib/constants.js'
import { useStats } from './hooks/useStats.js'
import { useEntries } from './hooks/useEntries.js'

import Auth from './components/Auth.jsx'
import RadarChart from './components/RadarChart.jsx'
import Dashboard from './components/Dashboard.jsx'
import Calendar from './components/Calendar.jsx'
import WeeklySummary from './components/WeeklySummary.jsx'
import Settings from './components/Settings.jsx'

// ── XP Float helper ──────────────────────────────────────────
export function showXpFloat(statColor, x, y) {
  const el = document.createElement('div')
  el.className = 'xp-float'
  el.textContent = '+XP'
  el.style.color = statColor || '#00E676'
  el.style.left = `${x ?? window.innerWidth / 2}px`
  el.style.top = `${y ?? window.innerHeight / 2}px`
  document.body.appendChild(el)
  el.addEventListener('animationend', () => el.remove())
}

// ── Loading screen ───────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-title">🎮 My Life</div>
      <div className="spinner" />
    </div>
  )
}

// ── Bottom nav ───────────────────────────────────────────────
function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { key: 'home',     icon: '🏠', label: 'Home'     },
    { key: 'calendar', icon: '📅', label: 'Calendar' },
    { key: 'weekly',   icon: '📊', label: 'Weekly'   },
  ]
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`nav-item${activeTab === t.key ? ' active' : ''}`}
          onClick={() => onTabChange(t.key)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [profile, setProfile]         = useState(null)
  const [activeTab, setActiveTab]     = useState('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayISO())

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) loadProfile(s.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        loadProfile(s.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(uid) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single()

      if (error && error.code === 'PGRST116') {
        // No profile row — create one
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: uid, display_name: 'Alex', gender: 'male' })
          .select()
          .single()
        if (!insertError) setProfile(newProfile)
      } else if (!error) {
        setProfile(data)
      }
    } catch (err) {
      console.error('loadProfile error:', err)
    } finally {
      setLoading(false)
    }
  }

  const userId = session?.user?.id

  // Stats hook
  const { statValues, streaks, boostStat, loading: statsLoading } = useStats(userId)

  // Entries hook (today)
  const { entries, addEntry, fetchEntries } = useEntries(userId)

  // Load today's entries on mount / userId change
  useEffect(() => {
    if (userId) fetchEntries(todayISO())
  }, [userId, fetchEntries])

  // ── Entry submit handler ───────────────────────────────────
  const handleLogEntry = useCallback(async (text) => {
    if (!userId) return null

    let statKey = 'nutrition'
    let boost = 18

    try {
      const resp = await fetch('/.netlify/functions/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (resp.ok) {
        const json = await resp.json()
        if (json.stat_key) statKey = json.stat_key
        if (json.boost)    boost   = json.boost
      }
    } catch (err) {
      console.warn('Categorize function unavailable, using defaults:', err.message)
    }

    // Add entry to DB
    await addEntry(text, statKey, boost)

    // Boost the stat
    await boostStat(statKey, boost)

    // Floating XP animation
    const cfg = STATS_CONFIG.find(s => s.key === statKey)
    showXpFloat(cfg?.color || '#00E676', window.innerWidth / 2, window.innerHeight * 0.4)

    return { statKey, boost }
  }, [userId, addEntry, boostStat])

  // ── Settings save ──────────────────────────────────────────
  async function handleSettingsSave(updates) {
    if (!userId) return
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
    if (!error) {
      setProfile(prev => ({ ...prev, ...updates }))
    }
  }

  // ── Sign out ───────────────────────────────────────────────
  async function handleSignOut() {
    await supabase.auth.signOut()
    setSettingsOpen(false)
  }

  // ── Derived avatar state ───────────────────────────────────
  const avg = calcAvg(statValues)
  const healthState = getHealthState(avg)
  const gender = profile?.gender || 'male'
  const avatarEmoji = healthState.emoji[gender] || healthState.emoji.male
  const displayName = profile?.display_name || 'Alex'

  // ── Render ─────────────────────────────────────────────────
  if (loading || statsLoading) return <LoadingScreen />
  if (!session) return <Auth />

  return (
    <div className="app-shell">
      <div className="phone-frame">

        {/* ── Hero band (always visible) ──────────────────── */}
        <div className="hero-band">
          {/* Decorative shapes */}
          <div className="hero-geo hero-geo-1" />
          <div className="hero-geo hero-geo-2" />

          {/* Status bar row */}
          <div className="status-bar">
            <span>My Life</span>
            <span>{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Title + icon buttons */}
          <div className="app-title-row">
            <h1>🎮 Character</h1>
            <div className="icon-btn-row">
              <button
                className="icon-btn"
                onClick={() => setActiveTab('calendar')}
                aria-label="Calendar"
              >
                📅
              </button>
              <button
                className="icon-btn"
                onClick={() => setSettingsOpen(true)}
                aria-label="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Radar chart + avatar overlay */}
          <div className="hero-chart-wrap">
            <RadarChart stats={statValues} />

            <div className="hero-avatar-center">
              <div className="avatar-ring-wrap">
                <div className="pulse-ring pulse-ring-1" />
                <div className="pulse-ring pulse-ring-2" />
                <div
                  className="avatar-circle"
                  style={{
                    borderColor: healthState.border,
                    boxShadow: healthState.glow,
                    background: healthState.bg,
                  }}
                >
                  <span
                    className="avatar-emoji"
                    style={{ filter: healthState.filter }}
                  >
                    {avatarEmoji}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Avatar name + status pill */}
          <div className="avatar-name-block">
            <div className="avatar-name">{displayName}</div>
            <div className="avatar-sub">Life Tracker</div>
            <div
              className="avatar-status-pill"
              style={{
                background: healthState.pillBg,
                borderColor: healthState.pillBorder,
              }}
            >
              <span
                className="status-dot"
                style={{ background: healthState.dotColor }}
              />
              {healthState.label} · {avg}%
            </div>
          </div>
        </div>

        {/* ── Curve transition ────────────────────────────── */}
        <div className="hero-curve" />

        {/* ── Tab content ─────────────────────────────────── */}
        <div className="scroll-body">
          {activeTab === 'home' && (
            <Dashboard
              stats={statValues}
              statStreaks={streaks}
              onLogEntry={handleLogEntry}
              profile={profile}
              entries={entries}
            />
          )}
          {activeTab === 'calendar' && (
            <Calendar
              userId={userId}
              onSelectDate={setSelectedDate}
              selectedDate={selectedDate}
            />
          )}
          {activeTab === 'weekly' && (
            <WeeklySummary
              stats={statValues}
              statStreaks={streaks}
              userId={userId}
            />
          )}
        </div>

        {/* ── Bottom nav ───────────────────────────────────── */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ── Settings overlay ─────────────────────────────── */}
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onSave={handleSettingsSave}
        onSignOut={handleSignOut}
      />
    </div>
  )
}
