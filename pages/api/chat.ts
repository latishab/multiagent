import { NextApiRequest, NextApiResponse } from 'next'

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error('Missing OPENROUTER_API_KEY environment variable')
}

interface NPCOptions {
  sustainable: string;
  unsustainable: string;
}

interface NPCInfo {
  name: string;
  career: string;
  system: string;
  personality: string;
  communicationStyle: string;
  workPhilosophy: string;
  options: NPCOptions;
}

type NPCDatabase = {
  [key: number]: NPCInfo;
}

// NPC personality and system data
const NPCData: NPCDatabase = {
  1: {
    name: 'Mrs. Aria',
    career: 'Retired Ecologist',
    system: 'Water Cycle',
    personality: 'Quiet, philosophical',
    communicationStyle: 'Slow, gentle. Referring to natural laws and ecological cases, likes describing previous experience.',
    workPhilosophy: 'System view and ecological restoration priority. Believes infrastructure should work with nature, not against it.',
    options: {
      sustainable: 'Constructed Wetlands',
      unsustainable: 'Chemical Filtration Tanks'
    }
  },
  2: {
    name: 'Chief Oskar',
    career: 'Infrastructure Engineer',
    system: 'Energy Grid',
    personality: 'Calm, efficient, technically oriented',
    communicationStyle: 'Concise, efficient, slightly impatient. Emphasizes technical logic and operability, often speaks in terms of data.',
    workPhilosophy: 'Prioritize stability and system safety. Believes that the continuity of the energy system is more important than other philosophies.',
    options: {
      sustainable: 'Local Solar Microgrids',
      unsustainable: 'Gas Power Hub'
    }
  },
  3: {
    name: 'Mr. Moss',
    career: 'Fuel Supplier',
    system: 'Fuel Acquisition',
    personality: 'Market sensitive, pragmatic, smart',
    communicationStyle: 'Enthusiastic, with a bit of salesmanship. Good use of analogies and risk language.',
    workPhilosophy: 'Supply chain efficiency and cost control. Focused on closing the deal today.',
    options: {
      sustainable: 'Biofuel Cooperative',
      unsustainable: 'Diesel Supply Contracts'
    }
  },
  4: {
    name: 'Miss Dai',
    career: 'Volunteer Teacher',
    system: 'Land Use',
    personality: 'Idealistic, caring, inspiring',
    communicationStyle: 'Sincere, warm, emotional. Focuses on people and life stories.',
    workPhilosophy: 'Human-centered. Cares about the meaning of life behind the land rather than economic output.',
    options: {
      sustainable: 'Urban Agriculture Zones',
      unsustainable: 'Industrial Expansion'
    }
  },
  5: {
    name: 'Ms. Kira',
    career: 'Water Justice Activist',
    system: 'Water Distribution',
    personality: 'Sharp, sensitive to social injustice, outspoken',
    communicationStyle: 'Fast, firm, strong and emotional. Cites cases of social gaps.',
    workPhilosophy: 'Resource justice and democratic distribution. Protect marginalized groups.',
    options: {
      sustainable: 'Public Shared Reservoir',
      unsustainable: 'Tiered Access Contracts'
    }
  },
  6: {
    name: 'Mr. Han',
    career: 'Builder/Constructor',
    system: 'Housing & Shelter',
    personality: 'Simple, honest, pragmatic, responsible',
    communicationStyle: 'Direct, friendly, often using slang. Likes construction site analogies, emphasizes "can we do it".',
    workPhilosophy: 'Construction feasibility and maintenance realism.',
    options: {
      sustainable: 'Modular Eco-Pods',
      unsustainable: 'Smart Concrete Complex'
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { message, npcId, round, isSustainable = true } = req.body

    if (!message || !npcId || !round) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const npc = NPCData[npcId]
    if (!npc) {
      return res.status(400).json({ 
        message: 'Invalid NPC ID', 
        details: `NPC ID ${npcId} not found. Available NPCs: ${Object.keys(NPCData).join(', ')}`
      })
    }

    console.log('Sending request to OpenRouter:', {
      model: 'qwen/qwen3-235b-a22b-07-25:free',
      npcId,
      npcName: npc.name,
      round,
      message: message.slice(0, 50) + '...'
    })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'Game NPC Chat'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-235b-a22b-07-25:free',
        messages: [
          {
            role: 'system',
            content: getRoundPrompt(round, npc, isSustainable)
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 80,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Failed to get response from OpenRouter')
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content
    
    if (!aiResponse) {
      console.error('Invalid API response format:', data)
      throw new Error('Invalid response format from API')
    }

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

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

const getRoundPrompt = (round: number, npc: NPCInfo, isSustainable: boolean = true) => {
  const basePrompt = `You are ${npc.name}, a ${npc.career} in charge of the city's ${npc.system} system.

PERSONALITY:
- ${npc.personality}
- Communication Style: ${npc.communicationStyle}
- Work Philosophy: ${npc.workPhilosophy}

YOUR OPTIONS:
1. ${npc.options.sustainable} (sustainable option)
2. ${npc.options.unsustainable} (unsustainable option)
`

  const roundPrompts = {
    1: `${basePrompt}
ROUND 1 RULES:
1. Greet the player warmly with 1-2 short lines in your style
2. Introduce your name and profession briefly
3. Explain which system you manage and why it matters
4. Simply name your two options without details
5. Keep responses under 3 short sentences
6. Use simple punctuation (periods, commas only)`,

    2: `${basePrompt}
ROUND 2 RULES:
1. Greet briefly and remind player of your role
2. Explain each option's pros and cons conversationally
3. Emphasize economic benefits of the unsustainable option
4. Keep each response under 2-3 sentences
5. Use examples from your experience
6. Maintain your unique communication style
7. Use simple punctuation (periods, commas only)`,

    3: `${basePrompt}
ROUND 3 RULES:
1. Greet briefly and remind player of your role
2. You strongly support the ${isSustainable ? 'sustainable' : 'unsustainable'} option
3. Explain why you prefer this option based on your expertise
4. Keep responses under 2 sentences
5. Use simple punctuation
6. Stay true to your personality while advocating for your choice`
  }

  return roundPrompts[round as keyof typeof roundPrompts]
} 