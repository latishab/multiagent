import { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GOOGLE_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY environment variable')
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

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

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Start the chat
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{
            text: `You are an NPC in a game with the following personality: ${npcPersonality}. 
                   You should respond in character and keep responses concise (max 2-3 sentences).`
          }],
        },
        {
          role: "model",
          parts: [{
            text: "I understand my role and will stay in character with concise responses."
          }],
        },
      ],
    })

    // Generate the response
    const result = await chat.sendMessage([{ text: message }])
    const response = await result.response
    
    return res.status(200).json({ response: response.text() })
  } catch (error) {
    console.error('Error in chat API:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
} 