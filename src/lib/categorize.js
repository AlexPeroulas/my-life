/**
 * Client-side entry categorisation — no API key, no network call, works offline.
 * Scores each stat against the entry text using weighted keywords, returns the winner.
 *
 * To swap to Groq AI instead: set VITE_GROQ_API_KEY in your .env and
 * uncomment the groqCategorize() block at the bottom of this file.
 */

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

/**
 * Score a text string against all stat keyword lists.
 * Returns { stat_key, boost, confidence }
 */
export function categorize(text) {
  const lower = text.toLowerCase()
  const scores = {}

  for (const [stat, { terms }] of Object.entries(KEYWORD_MAP)) {
    let score = 0
    for (const term of terms) {
      if (lower.includes(term)) {
        // Longer matches worth more (multi-word phrases)
        score += term.includes(' ') ? 3 : 1
      }
    }
    scores[stat] = score
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [topStat, topScore] = sorted[0]
  const [, secondScore] = sorted[1] ?? ['', 0]

  // Boost: more words logged = bigger boost (15–25 range)
  const wordCount = text.trim().split(/\s+/).length
  const boost = Math.min(25, Math.max(15, 13 + Math.floor(wordCount / 3)))

  // Confidence based on score margin
  const confidence =
    topScore === 0      ? 'low'    :
    topScore - secondScore >= 2 ? 'high' : 'medium'

  // If nothing matched, make a best guess from word count position
  const stat_key = topScore > 0 ? topStat : 'mind'

  return { stat_key, boost, confidence }
}

/* ─────────────────────────────────────────────────────────────
   OPTIONAL: Groq AI (free tier — ~14,400 calls/day)

   1. Sign up free at console.groq.com
   2. Create an API key
   3. Add VITE_GROQ_API_KEY=gsk_... to your .env
   4. Change the export at the bottom of this file

export async function categorize(text) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) return keywordCategorize(text) // fallback

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: `Categorize this life log entry into exactly ONE of: mind, fitness, nature, hygiene, nutrition, social, sleep.
Entry: "${text}"
Reply ONLY with JSON: {"stat_key":"<key>","boost":<12-25>,"confidence":"high|medium|low"}`,
        }],
      }),
    })
    const json = await res.json()
    const raw = json.choices?.[0]?.message?.content ?? ''
    const match = raw.match(/\{[^}]+\}/)
    if (!match) throw new Error('no json')
    const parsed = JSON.parse(match[0])
    const valid = ['mind','fitness','nature','hygiene','nutrition','social','sleep']
    if (!valid.includes(parsed.stat_key)) throw new Error('invalid key')
    parsed.boost = Math.min(25, Math.max(12, parseInt(parsed.boost) || 18))
    return parsed
  } catch {
    return keywordCategorize(text)
  }
}

// rename the main function above to keywordCategorize() if using this
─────────────────────────────────────────────────────────────── */
