import Anthropic from '@anthropic-ai/sdk'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const DEFAULT_RESPONSE = {
  stat_key: 'nutrition',
  boost: 18,
  confidence: 'low',
}

export const handler = async (event) => {
  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  let text = ''
  try {
    const body = JSON.parse(event.body || '{}')
    text = body.text || ''
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  if (!text.trim()) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'text field is required' }),
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set')
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(DEFAULT_RESPONSE),
    }
  }

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: `You are categorizing a life log entry. The user logged: "${text}"
Which of these 7 life stats does it primarily relate to?
- mind (reading, learning, meditation, puzzles, journaling)
- fitness (exercise, sports, gym, walking, physical activity)
- nature (outdoors, gardening, fresh air, green spaces, sunlight)
- hygiene (grooming, cleaning, self-care, skincare, organisation)
- nutrition (eating, drinking water, cooking, diet, supplements)
- social (conversations, relationships, meetings, calling people)
- sleep (rest, sleep quality, naps, recovery, relaxation)

Respond ONLY with valid JSON: {"stat_key":"<key>","boost":<number 12-25>,"confidence":"high|medium|low"}
Higher boost for more significant activities. Be generous with boost values.`,
        },
      ],
    })

    const rawText = message.content?.[0]?.text?.trim() || ''

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = rawText
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) jsonStr = jsonMatch[0]

    const parsed = JSON.parse(jsonStr)

    // Validate stat_key
    const validKeys = ['mind', 'fitness', 'nature', 'hygiene', 'nutrition', 'social', 'sleep']
    if (!validKeys.includes(parsed.stat_key)) {
      parsed.stat_key = DEFAULT_RESPONSE.stat_key
    }

    // Validate boost
    const boost = parseInt(parsed.boost, 10)
    parsed.boost = isNaN(boost) ? DEFAULT_RESPONSE.boost : Math.min(25, Math.max(12, boost))

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(parsed),
    }
  } catch (err) {
    console.error('Categorize function error:', err)
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(DEFAULT_RESPONSE),
    }
  }
}
