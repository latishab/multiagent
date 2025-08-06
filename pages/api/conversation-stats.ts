import { NextApiRequest, NextApiResponse } from 'next';
import { conversationStorage } from '../../utils/conversationStorage';

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
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  // Set CORS headers for the response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { sessionId } = req.query;

    // Get conversation statistics
    const stats = await conversationStorage.getConversationStats(sessionId as string);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error in conversation stats API:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 