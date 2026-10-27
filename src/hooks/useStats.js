import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  STATS_CONFIG,
  STAT_START,
  STAT_MAX,
  applyDecay,
  daysBetween,
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
  // Raw values as of each stat's last_logged; decay is applied at read time
  const [storedValues, setStoredValues] = useState(defaults.values)
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
      const missing = []

      STATS_CONFIG.forEach(s => {
        const row = data?.find(r => r.stat_key === s.key)
        if (row) {
          newValues[s.key] = row.value
          newLastLogged[s.key] = row.last_logged
          newStreaks[s.key] = row.streak || 0
        } else {
          missing.push({
            user_id: uid,
            stat_key: s.key,
            value: STAT_START,
            last_logged: null,
            streak: 0,
            updated_at: new Date().toISOString(),
          })
        }
      })

      setStoredValues(newValues)
      setLastLogged(newLastLogged)
      setStreaks(newStreaks)

      // Create rows for stats the user doesn't have yet (never overwrite existing ones)
      if (missing.length) {
        await supabase
          .from('stat_values')
          .upsert(missing, { onConflict: 'user_id,stat_key', ignoreDuplicates: true })
      }
    } catch (err) {
      console.error('useStats loadStats error:', err)
    } finally {
      setLoading(false)
    }
  }

  const boostStat = useCallback(async (statKey, amount) => {
    if (!userId) return

    const today = todayISO()
    const current = applyDecay(storedValues[statKey] ?? STAT_START, lastLogged[statKey])
    const newValue = Math.min(STAT_MAX, current + amount)

    // Calculate streak: if last logged was yesterday or today, increment; else reset to 1
    const last = lastLogged[statKey]
    let newStreak = streaks[statKey] || 0
    if (last) {
      const diffDays = daysBetween(last, today)
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
    const prevStored = storedValues[statKey]
    const prevLast = lastLogged[statKey]
    const prevStreak = streaks[statKey]
    setStoredValues(prev => ({ ...prev, [statKey]: newValue }))
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
      setStoredValues(prev => ({ ...prev, [statKey]: prevStored }))
      setLastLogged(prev => ({ ...prev, [statKey]: prevLast }))
      setStreaks(prev => ({ ...prev, [statKey]: prevStreak }))
    }
  }, [userId, storedValues, lastLogged, streaks])

  const statValues = useMemo(() => {
    const values = {}
    STATS_CONFIG.forEach(s => {
      values[s.key] = applyDecay(storedValues[s.key], lastLogged[s.key])
    })
    return values
  }, [storedValues, lastLogged])

  return { statValues, lastLogged, streaks, boostStat, loading }
}
