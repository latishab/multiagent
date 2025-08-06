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
    const { sessionId, format = 'json' } = req.query;

    // Export conversation data
    const exportData = await conversationStorage.exportConversationData(sessionId as string);

    if (format === 'json') {
      // Return JSON format
      return res.status(200).json({
        success: true,
        data: exportData
      });
    } else if (format === 'download') {
      // Return as downloadable file
      const filename = `conversations_${sessionId}_${Date.now()}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.status(200).json(exportData);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use "json" or "download"'
      });
    }
  } catch (error: any) {
    console.error('Error in export conversations API:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 