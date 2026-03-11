/**
 * Entry categorisation using Groq AI (llama-3.1-8b-instant).
 * Falls back to keyword matching if the key is missing or the request fails.
 * Requires VITE_GROQ_API_KEY in .env
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

const VALID_KEYS = ['mind', 'fitness', 'nature', 'hygiene', 'nutrition', 'social', 'sleep']

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
  const [topStat, topScore] = sorted[0]
  const [, secondScore] = sorted[1] ?? ['', 0]
  const wordCount = text.trim().split(/\s+/).length
  const boost = Math.min(25, Math.max(15, 13 + Math.floor(wordCount / 3)))
  const confidence = topScore === 0 ? 'low' : topScore - secondScore >= 2 ? 'high' : 'medium'

  return { stat_key: topScore > 0 ? topStat : 'mind', boost, confidence }
}

/** Groq AI categorisation with keyword fallback */
export async function categorize(text) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) return keywordCategorize(text)

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
        temperature: 0,
        messages: [{
          role: 'user',
          content: `Categorize this life log entry into exactly ONE of: mind, fitness, nature, hygiene, nutrition, social, sleep.

mind = reading, learning, meditation, journaling, creativity, studying
fitness = exercise, gym, sport, running, walking, physical activity
nature = outdoors, parks, gardening, sunlight, fresh air, hiking
hygiene = shower, grooming, cleaning, skincare, tidying, self-care
nutrition = food, eating, drinking water, cooking, diet, supplements
social = friends, family, conversation, calls, meetings, relationships
sleep = rest, nap, recovery, bedtime, relaxation, wind-down

Entry: "${text.slice(0, 300)}"

Reply ONLY with this exact JSON format, nothing else:
{"stat_key":"<key>","boost":<number 12-25>,"confidence":"high|medium|low"}`,
        }],
      }),
    })

    if (!res.ok) throw new Error(`Groq ${res.status}`)

    const json = await res.json()
    const raw = json.choices?.[0]?.message?.content?.trim() ?? ''
    const match = raw.match(/\{[^}]+\}/)
    if (!match) throw new Error('no json in response')

    const parsed = JSON.parse(match[0])
    if (!VALID_KEYS.includes(parsed.stat_key)) throw new Error('invalid stat_key')
    parsed.boost = Math.min(25, Math.max(12, parseInt(parsed.boost) || 18))

    return parsed
  } catch (err) {
    console.warn('Groq categorise failed, using keyword fallback:', err.message)
    return keywordCategorize(text)
  }
}
