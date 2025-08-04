import { NextApiRequest, NextApiResponse } from 'next';
import { getEffectiveRound, validateConversationParams } from '../../utils/conversationUtils';
import { upstashStore } from '../../utils/upstashStore';

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
    const { message, npcId, round, sessionId, role } = req.body;

    if (!message || !npcId || !round || !sessionId || !role) {
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
    // Add the message directly to conversation history
    await upstashStore.addToConversationHistory(npcIdNumber, effectiveRound, {
      role: role as 'system' | 'user' | 'assistant',
      content: message
    }, sessionId);

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(200).json({ 
      success: true,
      message: 'Message stored successfully'
    });
  } catch (error: any) {
    console.error('Error in store message API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 