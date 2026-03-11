import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  STATS_CONFIG,
  STAT_START,
  STAT_MAX,
  applyDecay,
  todayISO,
} from '../lib/constants.js'

function buildDefaults() {
  const values = {}
  const lastLogged = {}
  const streaks = {}
  STATS_CONFIG.forEach(s => {
    values[s.key] = STAT_START
    lastLogged[s.key] = null
    streaks[s.key] = 0
  })
  return { values, lastLogged, streaks }
}

export function useStats(userId) {
  const defaults = buildDefaults()
  const [statValues, setStatValues] = useState(defaults.values)
  const [lastLogged, setLastLogged] = useState(defaults.lastLogged)
  const [streaks, setStreaks] = useState(defaults.streaks)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    loadStats(userId)
  }, [userId])

  async function loadStats(uid) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stat_values')
        .select('*')
        .eq('user_id', uid)

      if (error) throw error

      const newValues = { ...defaults.values }
      const newLastLogged = { ...defaults.lastLogged }
      const newStreaks = { ...defaults.streaks }
      const upserts = []

      STATS_CONFIG.forEach(s => {
        const row = data?.find(r => r.stat_key === s.key)
        if (row) {
          const decayed = applyDecay(row.value, row.last_logged)
          newValues[s.key] = decayed
          newLastLogged[s.key] = row.last_logged
          newStreaks[s.key] = row.streak || 0
          upserts.push({
            user_id: uid,
            stat_key: s.key,
            value: decayed,
            last_logged: row.last_logged,
            streak: row.streak || 0,
            updated_at: new Date().toISOString(),
          })
        } else {
          upserts.push({
            user_id: uid,
            stat_key: s.key,
            value: STAT_START,
            last_logged: null,
            streak: 0,
            updated_at: new Date().toISOString(),
          })
        }
      })

      setStatValues(newValues)
      setLastLogged(newLastLogged)
      setStreaks(newStreaks)

      // Save decayed values back to DB
      await supabase
        .from('stat_values')
        .upsert(upserts, { onConflict: 'user_id,stat_key' })
    } catch (err) {
      console.error('useStats loadStats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const boostStat = useCallback(async (statKey, amount) => {
    if (!userId) return

    const today = todayISO()
    const current = statValues[statKey] ?? STAT_START
    const newValue = Math.min(STAT_MAX, current + amount)

    // Calculate streak: if last logged was yesterday or today, increment; else reset to 1
    const last = lastLogged[statKey]
    let newStreak = streaks[statKey] || 0
    if (last) {
      const lastDate = new Date(last + 'T12:00:00')
      const todayDate = new Date(today + 'T12:00:00')
      const diffDays = Math.round((todayDate - lastDate) / 86400000)
      if (diffDays === 0) {
        // same day — keep streak
      } else if (diffDays === 1) {
        newStreak = newStreak + 1
      } else {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }

    // Optimistic update
    setStatValues(prev => ({ ...prev, [statKey]: newValue }))
    setLastLogged(prev => ({ ...prev, [statKey]: today }))
    setStreaks(prev => ({ ...prev, [statKey]: newStreak }))

    try {
      const { error } = await supabase
        .from('stat_values')
        .upsert(
          {
            user_id: userId,
            stat_key: statKey,
            value: newValue,
            last_logged: today,
            streak: newStreak,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,stat_key' }
        )
      if (error) throw error
    } catch (err) {
      console.error('boostStat error:', err)
      // Revert on error
      setStatValues(prev => ({ ...prev, [statKey]: current }))
    }
  }, [userId, statValues, lastLogged, streaks])

  return { statValues, lastLogged, streaks, boostStat, loading }
}
