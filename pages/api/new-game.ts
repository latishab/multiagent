import { NextApiRequest, NextApiResponse } from 'next';
import { conversationStorage } from '../../utils/conversationStorage';

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
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  // Set CORS headers for the response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { sessionId } = req.body;

    // Handle new game - clear conversations and reset session
    await conversationStorage.handleNewGame(sessionId);

    return res.status(200).json({
      success: true,
      message: 'New game started - all conversations cleared and session reset'
    });
  } catch (error: any) {
    console.error('Error in new game API:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 