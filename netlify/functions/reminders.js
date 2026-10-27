// Scheduled daily (see netlify.toml): pushes a reminder about each user's most neglected stat
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const STAT_LABELS = {
  mind: '🧠 Mind',
  fitness: '💪 Fitness',
  nature: '🌿 Nature',
  hygiene: '🧼 Hygiene & Grooming',
  nutrition: '🍎 Nutrition',
  social: '🤝 Social',
  sleep: '😴 Sleep & Recovery',
}
const NEGLECT_DAYS = 2

function daysSince(iso, now) {
  return iso ? Math.floor((now - new Date(iso + 'T00:00:00Z')) / 86400000) : Infinity
}

function buildMessage(neglected, now) {
  const [worst] = neglected
  const days = daysSince(worst.last_logged, now)
  const more = neglected.length > 1 ? ` (+${neglected.length - 1} more stats slipping)` : ''
  return {
    title: `${STAT_LABELS[worst.stat_key]} is decaying`,
    body: (Number.isFinite(days)
      ? `Not logged in ${days} days. Log something to stop the drop.`
      : `You haven't logged it yet. Start today!`) + more,
  }
}

export const handler = async () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const vapidPublic = VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublic || !VAPID_PRIVATE_KEY || !SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    console.error('reminders: missing VAPID or Supabase service env vars')
    return { statusCode: 500 }
  }

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || process.env.URL, vapidPublic, VAPID_PRIVATE_KEY)
  const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: subs, error } = await supabase.from('push_subscriptions').select('endpoint, user_id, subscription')
  if (error) {
    console.error('reminders: load subscriptions failed', error)
    return { statusCode: 500 }
  }
  if (!subs?.length) return { statusCode: 200 }

  const userIds = [...new Set(subs.map(s => s.user_id))]
  const { data: stats } = await supabase
    .from('stat_values')
    .select('user_id, stat_key, last_logged')
    .in('user_id', userIds)

  const now = Date.now()
  const messages = {}
  for (const uid of userIds) {
    const neglected = (stats || [])
      .filter(s => s.user_id === uid && daysSince(s.last_logged, now) >= NEGLECT_DAYS)
      .sort((a, b) => daysSince(b.last_logged, now) - daysSince(a.last_logged, now))
    if (neglected.length) messages[uid] = buildMessage(neglected, now)
  }

  const results = await Promise.allSettled(
    subs
      .filter(s => messages[s.user_id])
      .map(s => webpush.sendNotification(s.subscription, JSON.stringify(messages[s.user_id])).catch(async (err) => {
        // Subscription expired or revoked: clean it up
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
        }
        throw err
      }))
  )

  const failed = results.filter(r => r.status === 'rejected').length
  console.log(`reminders: sent ${results.length - failed}, failed ${failed}`)
  return { statusCode: 200 }
}
