import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';

export interface PDADecision {
  npcId: number;
  npcName: string;
  systemName: string;
  choice: 'sustainable' | 'unsustainable';
  playerChosenOption: string;
  playerRejectedOption: string;
  timestamp: number;
  npcPreference: 'sustainable' | 'unsustainable'; // What the NPC supports (pro/anti sustainable)
  playerChoiceType: string; // "sustainable" or "unsustainable"
}

export interface PDADecisionsData {
  sessionId: string;
  decisions: PDADecision[];
  participantId?: string;
  totalProSustainableChoices?: number; // Count of how many pro-sustainable choices player made
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
    const { sessionId, decisions, participantId, totalProSustainableChoices } = req.body as PDADecisionsData;

    if (!sessionId || !decisions || !Array.isArray(decisions)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate decisions array
    if (decisions.length !== 6) {
      return res.status(400).json({ message: 'Must have exactly 6 decisions' });
    }

    // Validate each decision
    for (const decision of decisions) {
      if (!decision.npcId || !decision.choice || !decision.timestamp || 
          !decision.npcName || !decision.systemName || 
          !decision.playerChosenOption || !decision.playerRejectedOption ||
          !decision.npcPreference || !decision.playerChoiceType) {
        return res.status(400).json({ message: 'Invalid decision format' });
      }
      if (!['sustainable', 'unsustainable'].includes(decision.choice)) {
        return res.status(400).json({ message: 'Invalid choice value' });
      }
      if (!['sustainable', 'unsustainable'].includes(decision.npcPreference)) {
        return res.status(400).json({ message: 'Invalid NPC preference value' });
      }
      if (decision.npcId < 1 || decision.npcId > 6) {
        return res.status(400).json({ message: 'Invalid NPC ID' });
      }
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, storing decisions in memory only');
      return res.status(200).json({ 
        success: true,
        message: 'Decisions processed (database not configured)'
      });
    }

    // Store decisions in Supabase
    const { data, error } = await supabase
      .from('pda_decisions')
      .insert({
        session_id: sessionId,
        participant_id: participantId || null,
        decisions: decisions,
        total_pro_sustainable_choices: totalProSustainableChoices || 0,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing PDA decisions:', error);
      return res.status(500).json({ 
        message: 'Failed to store decisions',
        error: error.message 
      });
    }

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(200).json({ 
      success: true,
      message: 'PDA decisions stored successfully',
      data: data
    });

  } catch (error: any) {
    console.error('Error in store PDA decisions API:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message || 'Unknown error'
    });
  }
} 