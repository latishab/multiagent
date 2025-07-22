import { NextApiRequest, NextApiResponse } from 'next'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('Missing OPENROUTER_API_KEY environment variable')
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { message, npcId, npcPersonality } = req.body

    if (!message || !npcId || !npcPersonality) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    console.log('Sending request to OpenRouter:', {
      model: 'moonshotai/kimi-k2:free',
      npcId,
      message: message.slice(0, 50) + '...' // Log first 50 chars
    })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Game NPC Chat'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-235b-a22b-07-25:free',
        messages: [
          {
            role: 'system',
            content: `You are an NPC in a game with ID ${npcId} and the following personality: ${npcPersonality}. 
                     You should respond in character and keep responses concise (max 2-3 sentences). 
                     Stay in character at all times and respond as your character would.
                     Focus on being engaging and interesting while maintaining your character's unique personality.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    })

    const responseData = await response.json()
    console.log('OpenRouter response:', responseData)

    if (!response.ok) {
      throw new Error(
        responseData.error?.message || 
        responseData.error || 
        `API returned ${response.status}: ${JSON.stringify(responseData)}`
      )
    }

    const aiResponse = responseData.choices?.[0]?.message?.content
    
    if (!aiResponse) {
      console.error('Invalid API response format:', responseData)
      throw new Error('Invalid response format from API')
    }

    return res.status(200).json({ response: aiResponse })
  } catch (error: any) {
    console.error('Error in chat API:', error)
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error',
      details: error.toString()
    })
  }
} 