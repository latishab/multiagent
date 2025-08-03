import { NextApiRequest, NextApiResponse } from 'next';
import { vectorStore } from '../../utils/vectorStore';
import { getEffectiveRound, validateConversationParams } from '../../utils/conversationUtils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { npcId, round, sessionId } = req.query;

    if (!npcId || !round || !sessionId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const npcIdNumber = parseInt(npcId as string);
    const roundNumber = parseInt(round as string);

    // Validate parameters
    if (!validateConversationParams(npcIdNumber, roundNumber, sessionId as string)) {
      return res.status(400).json({ message: 'Invalid parameters' });
    }

    // Get effective round for conversation storage
    const effectiveRound = getEffectiveRound(npcIdNumber, roundNumber);

    // Get conversation history from vectorStore
    const history = vectorStore.getConversationHistory(npcIdNumber, effectiveRound, sessionId as string);

    // Convert to UI-friendly format (exclude system messages)
    const uiMessages = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        text: msg.content,
        sender: msg.role === 'user' ? 'player' : 'npc'
      }));

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(200).json({ 
      messages: uiMessages,
      historyLength: history.length
    });
  } catch (error: any) {
    console.error('Error in conversation history API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 