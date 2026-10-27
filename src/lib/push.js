import { supabase } from './supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export async function getPushSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function enablePush(userId) {
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Notifications are blocked. Enable them in your browser settings.')
  }
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, user_id: userId, subscription: sub.toJSON() }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function disablePush() {
  const sub = await getPushSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
