import { NextApiRequest, NextApiResponse } from 'next';
import { conversationStorage } from '../../utils/conversationStorage';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { sessionId } = req.query;

    if (req.method === 'GET') {
      // Get all conversations for a session
      const conversations = await conversationStorage.getAllConversations(sessionId as string);
      
      return res.status(200).json({
        success: true,
        data: conversations
      });
    } else if (req.method === 'POST') {
      // Store a new message
      const { npcId, round, message, sessionId: bodySessionId } = req.body;

      if (!npcId || !round || !message || !message.role || !message.content) {
        return res.status(400).json({ 
          success: false,
          message: 'Missing required fields: npcId, round, message.role, message.content' 
        });
      }

      const currentSessionId = bodySessionId || sessionId as string;
      
      await conversationStorage.storeMessage(
        parseInt(npcId as string),
        parseInt(round as string),
        message,
        currentSessionId
      );

      return res.status(200).json({
        success: true,
        message: 'Message stored successfully'
      });
    } else if (req.method === 'DELETE') {
      // Clear conversations
      const { npcId, round, sessionId: bodySessionId, clearAll } = req.body;

      const currentSessionId = bodySessionId || sessionId as string;

      if (clearAll) {
        // Clear all conversations for the session
        await conversationStorage.clearAllConversations(currentSessionId);
        
        return res.status(200).json({
          success: true,
          message: 'All conversations cleared successfully'
        });
      } else if (npcId && round) {
        // Clear specific conversation
        await conversationStorage.clearConversation(
          parseInt(npcId as string),
          parseInt(round as string),
          currentSessionId
        );
        
        return res.status(200).json({
          success: true,
          message: 'Conversation cleared successfully'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for deletion'
        });
      }
    } else {
      return res.status(405).json({ 
        success: false,
        message: 'Method not allowed' 
      });
    }
  } catch (error: any) {
    console.error('Error in conversations API:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 