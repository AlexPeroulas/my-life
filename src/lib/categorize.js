/**
 * Entry categorisation via the /categorize Netlify function (Groq key stays server-side).
 * Falls back to keyword matching if the request fails.
 */

import { supabase } from './supabase.js'

const KEYWORD_MAP = {
  mind: {
    weight: 1,
    terms: [
      'read', 'book', 'study', 'learn', 'meditat', 'journal', 'write', 'think',
      'reflect', 'puzzle', 'chess', 'podcast', 'course', 'lecture', 'research',
      'chapter', 'page', 'document', 'analyse', 'analyze', 'brainstorm',
      'philosophy', 'therapy', 'mindful', 'breath', 'focus', 'creative',
      'draw', 'paint', 'music', 'practice instrument', 'language',
    ],
  },
  fitness: {
    weight: 1,
    terms: [
      'gym', 'workout', 'exercise', 'run', 'ran', 'jog', 'lift', 'weight',
      'swim', 'swim', 'cycle', 'bike', 'walk', 'hike', 'climb', 'sport',
      'football', 'basketball', 'tennis', 'yoga', 'pilates', 'stretch',
      'pushup', 'push-up', 'pull-up', 'pullup', 'squat', 'deadlift',
      'bench', 'cardio', 'hiit', 'training', 'physical', 'active', 'sprint',
      'martial art', 'boxing', 'kickbox', 'crossfit', 'row', 'rowing',
    ],
  },
  nature: {
    weight: 1,
    terms: [
      'outside', 'outdoor', 'nature', 'park', 'garden', 'plant', 'tree',
      'forest', 'beach', 'lake', 'river', 'mountain', 'trail', 'fresh air',
      'sunlight', 'sunrise', 'sunset', 'walk outside', 'green', 'grass',
      'flower', 'birds', 'wildlife', 'camp', 'picnic', 'barefoot',
      'earthing', 'grounding', 'fresh', 'outdoors', 'sky', 'rain',
    ],
  },
  hygiene: {
    weight: 1,
    terms: [
      'shower', 'bath', 'clean', 'wash', 'groom', 'shave', 'haircut',
      'skincare', 'moisturis', 'moisturiz', 'teeth', 'dental', 'floss',
      'organis', 'organiz', 'tidy', 'declutter', 'laundry', 'iron',
      'nails', 'exfoliat', 'face mask', 'self care', 'self-care',
      'deodorant', 'hygiene', 'scrub', 'pamper', 'spa',
    ],
  },
  nutrition: {
    weight: 1,
    terms: [
      'eat', 'ate', 'food', 'meal', 'cook', 'cooked', 'diet', 'nutrition',
      'drink water', 'hydrat', 'water', 'protein', 'vegetable', 'fruit',
      'salad', 'healthy', 'calorie', 'fast', 'fasting', 'supplement',
      'vitamin', 'smoothie', 'juice', 'breakfast', 'lunch', 'dinner',
      'snack', 'sugar', 'alcohol', 'caffeine', 'coffee', 'tea', 'prep',
      'meal prep', 'recipe', 'portions', 'intermittent',
    ],
  },
  social: {
    weight: 1,
    terms: [
      'friend', 'family', 'talk', 'call', 'chat', 'meet', 'visit', 'date',
      'hang out', 'catch up', 'conversation', 'connect', 'relationship',
      'party', 'dinner with', 'lunch with', 'coffee with', 'socialis',
      'socializ', 'people', 'colleague', 'team', 'group', 'community',
      'volunteer', 'help someone', 'message', 'text', 'rang', 'phone',
      'facetime', 'zoom', 'network', 'mentor', 'support',
    ],
  },
  sleep: {
    weight: 1,
    terms: [
      'sleep', 'slept', 'nap', 'rest', 'recover', 'bed', 'bedtime',
      'tired', 'fatigue', 'relax', 'unwind', 'wind down', 'insomnia',
      'dream', 'hours of sleep', 'early night', 'lay down', 'lie down',
      'recharge', 'recuperat', 'restoration', 'doze', 'snooze',
      'no screen', 'screen free', 'melatonin', 'routine', 'night routine',
    ],
  },
}

/** Keyword fallback — instant, works offline */
function keywordCategorize(text) {
  const lower = text.toLowerCase()
  const scores = {}

  for (const [stat, { terms }] of Object.entries(KEYWORD_MAP)) {
    let score = 0
    for (const term of terms) {
      if (lower.includes(term)) score += term.includes(' ') ? 3 : 1
    }
    scores[stat] = score
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [, topScore] = sorted[0]
  const [, secondScore] = sorted[1] ?? ['', 0]
  const wordCount = text.trim().split(/\s+/).length
  const boost = Math.min(25, Math.max(15, 13 + Math.floor(wordCount / 3)))
  const confidence = topScore === 0 ? 'low' : topScore - secondScore >= 2 ? 'high' : 'medium'

  if (topScore === 0) return { stats: [{ stat_key: 'mind', boost }], confidence }

  // Secondary stats: at least half the top score, max 3 total
  const stats = sorted
    .filter(([, score], i) => i === 0 || score >= Math.max(2, topScore / 2))
    .slice(0, 3)
    .map(([stat_key], i) => ({ stat_key, boost: i === 0 ? boost : Math.round(boost * 0.6) }))

  return { stats, confidence }
}

/** Server-side AI categorisation with keyword fallback */
export async function categorize(text) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/.netlify/functions/categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ text: text.slice(0, 300) }),
    })
    if (!res.ok) throw new Error(`categorize ${res.status}`)

    const data = await res.json()
    if (!data.stats?.length) throw new Error('no stats in response')
    return data
  } catch (err) {
    console.warn('AI categorise failed, using keyword fallback:', err.message)
    return keywordCategorize(text)
  }
}
