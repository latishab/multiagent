import { NextApiRequest, NextApiResponse } from 'next';
import { conversationStorage } from '../../../utils/conversationStorage';

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
    const { 
      sessionId, 
      npcId, 
      round, 
      limit = '1000',
      format = 'json'
    } = req.query;

    // Parse parameters
    const parsedLimit = parseInt(limit as string) || 1000;
    const parsedNpcId = npcId ? parseInt(npcId as string) : undefined;
    const parsedRound = round ? parseInt(round as string) : undefined;

    // Get conversation data from database
    const conversations = await conversationStorage.getConversationsFromDatabase(
      sessionId as string,
      parsedNpcId,
      parsedRound,
      parsedLimit
    );

    // Get database stats
    const stats = await conversationStorage.getDatabaseStats();

    if (format === 'download') {
      // Return as downloadable file
      const filename = `research_conversations_${Date.now()}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.status(200).json({
        conversations,
        stats,
        query: {
          sessionId,
          npcId: parsedNpcId,
          round: parsedRound,
          limit: parsedLimit
        },
        exportTimestamp: new Date().toISOString()
      });
    } else {
      // Return JSON format
      return res.status(200).json({
        success: true,
        data: {
          conversations,
          stats,
          query: {
            sessionId,
            npcId: parsedNpcId,
            round: parsedRound,
            limit: parsedLimit
          }
        }
      });
    }
  } catch (error: any) {
    console.error('Error in research conversations API:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 