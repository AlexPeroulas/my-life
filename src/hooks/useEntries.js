import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { todayISO } from '../lib/constants.js'

export function useEntries(userId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchEntries = useCallback(async (date) => {
    if (!userId) return
    const targetDate = date || todayISO()
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .order('created_at', { ascending: true })

      if (error) throw error
      setEntries(data || [])
    } catch (err) {
      console.error('fetchEntries error:', err)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const addEntry = useCallback(async (content, statKey, boost) => {
    if (!userId) return null
    const today = todayISO()
    try {
      const { data, error } = await supabase
        .from('entries')
        .insert({
          user_id: userId,
          date: today,
          content,
          stat_key: statKey,
          boost,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setEntries(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('addEntry error:', err)
      return null
    }
  }, [userId])

  return { entries, loading, addEntry, fetchEntries }
}
