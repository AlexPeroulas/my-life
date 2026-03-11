export const STATS_CONFIG = [
  { key: 'mind',      label: 'Mind',              emoji: '🧠', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)'  },
  { key: 'fitness',   label: 'Fitness',            emoji: '💪', color: '#FF0080', bg: 'rgba(255,0,128,0.12)'   },
  { key: 'nature',    label: 'Nature',             emoji: '🌿', color: '#00C853', bg: 'rgba(0,200,83,0.12)'    },
  { key: 'hygiene',   label: 'Hygiene & Grooming', emoji: '🧼', color: '#00B8D9', bg: 'rgba(0,184,217,0.12)'   },
  { key: 'nutrition', label: 'Nutrition',          emoji: '🍎', color: '#FF6D00', bg: 'rgba(255,109,0,0.12)'   },
  { key: 'social',    label: 'Social',             emoji: '🤝', color: '#0066FF', bg: 'rgba(0,102,255,0.12)'   },
  { key: 'sleep',     label: 'Sleep & Recovery',   emoji: '😴', color: '#6C3483', bg: 'rgba(108,52,131,0.12)'  },
]

export const DECAY_PER_DAY   = 4    // points lost per missed day
export const BOOST_PER_ENTRY = 18   // points gained per log
export const STAT_MIN        = 5
export const STAT_MAX        = 100
export const STAT_START      = 50

export const HEALTH_STATES = [
  {
    min: 75,
    emoji:  { male: '🧑', female: '👩' },
    label:  'Thriving',
    border: 'rgba(0,230,118,0.95)',
    glow:   '0 0 0 8px rgba(0,230,118,0.22), 0 10px 36px rgba(0,0,0,0.4)',
    bg:     'rgba(0,55,160,0.9)',
    filter: 'none',
    dotColor:    '#00E676',
    pillBg:      'rgba(0,230,118,0.2)',
    pillBorder:  'rgba(0,230,118,0.55)',
  },
  {
    min: 50,
    emoji:  { male: '🧑', female: '👩' },
    label:  'Doing Well',
    border: 'rgba(255,255,255,0.55)',
    glow:   '0 0 0 6px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.35)',
    bg:     'rgba(0,55,160,0.85)',
    filter: 'none',
    dotColor:    '#ffffff',
    pillBg:      'rgba(255,255,255,0.14)',
    pillBorder:  'rgba(255,255,255,0.28)',
  },
  {
    min: 25,
    emoji:  { male: '😓', female: '😓' },
    label:  'Struggling',
    border: 'rgba(255,165,0,0.9)',
    glow:   '0 0 0 8px rgba(255,165,0,0.2), 0 10px 36px rgba(0,0,0,0.4)',
    bg:     'rgba(60,30,0,0.82)',
    filter: 'saturate(0.5) brightness(0.8)',
    dotColor:    '#FFA500',
    pillBg:      'rgba(255,165,0,0.2)',
    pillBorder:  'rgba(255,165,0,0.55)',
  },
  {
    min: 0,
    emoji:  { male: '😰', female: '😰' },
    label:  'Critical',
    border: 'rgba(255,50,50,0.9)',
    glow:   '0 0 0 8px rgba(255,0,0,0.22), 0 10px 36px rgba(0,0,0,0.45)',
    bg:     'rgba(50,0,0,0.85)',
    filter: 'grayscale(0.6) brightness(0.7)',
    dotColor:    '#FF3737',
    pillBg:      'rgba(255,50,50,0.2)',
    pillBorder:  'rgba(255,50,50,0.55)',
  },
]

export const DAILY_QUOTES = [
  "Small acts of discipline compound into extraordinary lives.",
  "You don't rise to your goals — you fall to your systems.",
  "The body achieves what the mind believes.",
  "Every day is a new character sheet. Fill it well.",
  "Momentum is built one logged entry at a time.",
  "Neglect is silent. Growth is intentional.",
  "Your future self is watching. Make them proud.",
  "Progress, not perfection. Log it and move on.",
  "The version of you at 100% is worth working for.",
  "Rest is a stat too. Recovery is not weakness.",
  "One entry. One day. One life well lived.",
  "What you track, you improve. What you ignore, decays.",
  "Mind, body, nature — nothing exists in isolation.",
  "You are the sum of your daily choices.",
  "Show up for yourself the way you'd show up for others.",
]

export function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]
}

export function getHealthState(avg) {
  return HEALTH_STATES.find(s => avg >= s.min) || HEALTH_STATES[HEALTH_STATES.length - 1]
}

export function calcAvg(statValues) {
  const vals = Object.values(statValues)
  if (!vals.length) return 50
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function applyDecay(value, lastDate) {
  if (!lastDate) return value
  const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
  if (days <= 0) return value
  return Math.max(STAT_MIN, value - days * DECAY_PER_DAY)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
