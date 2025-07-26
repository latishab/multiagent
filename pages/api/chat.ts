import { NextApiRequest, NextApiResponse } from 'next';
import { vectorStore } from '../../utils/vectorStore';
import { NPCData, getSystemPrompt } from '../../utils/prompts';

if (!process.env.DEEPINFRA_API_KEY) {
  throw new Error('Missing DEEPINFRA_API_KEY environment variable');
}

if (!process.env.PINECONE_API_KEY) {
  throw new Error('Missing PINECONE_API_KEY environment variable');
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

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PineconeMatch {
  id: string;
  score: number;
  text: string;
  metadata: {
    npcId: string;
    round: string;
    type: 'user_message' | 'assistant_response';
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message, npcId, round, isSustainable = true, sessionId } = req.body;

    if (!message || !npcId || !round) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const npc = NPCData[npcId];
    if (!npc) {
      return res.status(400).json({ 
        message: 'Invalid NPC ID', 
        details: `NPC ID ${npcId} not found. Available NPCs: ${Object.keys(NPCData).join(', ')}`
      });
    }

    // Get conversation history
    const history = vectorStore.getConversationHistory(npcId, round, sessionId);

    // Add system prompt to history if it's empty
    if (history.length === 0) {
      const systemPrompt = getSystemPrompt(npc, round, isSustainable);
      vectorStore.addToConversationHistory(npcId, round, {
        role: 'system',
        content: systemPrompt
      }, sessionId);
    }

    // Add user message to history
    vectorStore.addToConversationHistory(npcId, round, {
      role: 'user',
      content: message
    }, sessionId);

    // Get updated history
    const updatedHistory = vectorStore.getConversationHistory(npcId, round, sessionId);

    // Store the message in Pinecone
    const messageId = `${npcId}_${round}_${Date.now()}`;
    await vectorStore.storeMemory(messageId, message, {
      npcId: npcId.toString(),
      round: round.toString(),
      type: 'user_message',
      sessionId: sessionId || 'default'
    });

    // Find similar past conversations for this specific NPC and session
    const similarMessages = await vectorStore.querySimilar(message, npcId, 3, sessionId) as PineconeMatch[];
    
    // relevant context from similar conversations if available
    let contextPrompt = '';
    if (similarMessages && similarMessages.length > 0) {
      contextPrompt = `\nRelevant context from your previous conversations:\n${
        similarMessages
          .map((match: PineconeMatch) => match.text)
          .join('\n')
      }`;
    }

    // context to the last system message if it exists
    const systemMessages = updatedHistory.filter((msg: Message) => msg.role === 'system');
    const lastSystemMessage = systemMessages[systemMessages.length - 1];
    if (lastSystemMessage && contextPrompt) {
      lastSystemMessage.content += contextPrompt;
    }

    console.log('Sending request to DeepInfra:', {
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      npcId,
      npcName: npc.name,
      round,
      sessionId: sessionId || 'default',
      message: message.slice(0, 50) + '...',
      hasContext: contextPrompt.length > 0
    });

    const response = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: updatedHistory,
        temperature: 0.7,
        max_tokens: 80,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0.5
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to get response from DeepInfra');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('Invalid API response format:', data);
      throw new Error('Invalid response format from API');
    }

    // Store the AI response in Pinecone
    const responseId = `${npcId}_${round}_${Date.now()}_response`;
    await vectorStore.storeMemory(responseId, aiResponse, {
      npcId: npcId.toString(),
      round: round.toString(),
      type: 'assistant_response',
      sessionId: sessionId || 'default'
    });

    // Add assistant response to history
    vectorStore.addToConversationHistory(npcId, round, {
      role: 'assistant',
      content: aiResponse
    }, sessionId);

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(200).json({ response: aiResponse });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error',
      details: error.toString()
    });
  }
} 